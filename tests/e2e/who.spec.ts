import type { Page } from '@playwright/test'
import { expect, test } from './coverage'
import { phone, seat } from './helpers'

/**
 * Wer bin ich? between phones and on one device: every phone shows the others' words but not
 * its own, the one asking types a question, the others answer on theirs, and a right guess
 * solves a word.
 */

/** The word a page shows for a player's card. */
const termOn = (page: Page, name: string) =>
  page.locator('.who-card', { hasText: name }).locator('.term').textContent()

test('three phones play Who Am I?: ask, answer, guess, pass and give up', async ({ browser }) => {
  const ada = await phone(browser, 'Ada')
  const bo = await phone(browser, 'Bo')
  const cy = await phone(browser, 'Cy')
  await ada.getByRole('button', { name: 'Open a table' }).click()
  await seat(ada, bo)
  await seat(ada, cy)
  await ada.getByRole('button', { name: 'Who Am I?' }).click()
  await expect(ada.locator('.status.turn')).toContainText('Ask a question')
  await expect(bo.locator('.status.turn')).toHaveText('Ada is asking.')

  // Everyone sees the others' words, not their own.
  await expect(ada.locator('.who-card.mine .term')).toHaveText('?')
  const adaWord = (await termOn(bo, 'Ada')) ?? ''
  expect(adaWord).not.toBe('?')
  expect(await termOn(cy, 'Ada')).toBe(adaWord)
  await expect(ada.locator('.who-cards')).not.toContainText(adaWord)

  // A question: one says yes, one no, so Ada asks again.
  const field = ada.getByRole('textbox', { name: 'Your question or guess' })
  await field.fill('Can I fly?')
  await field.press('Enter')
  await expect(bo.locator('.who-question .question')).toHaveText('Can I fly?')
  await expect(ada.locator('.status.turn')).toContainText('The others answer.')
  await bo.getByRole('button', { name: 'Yes', exact: true }).click()
  await expect(bo.locator('.status.turn')).toContainText('Answered.')
  await cy.getByRole('button', { name: 'No', exact: true }).click()
  await expect(ada.locator('.who-log')).toContainText('Can I fly? not sure ✓1 ✗1 ?0')
  await expect(ada.locator('.status.turn')).toContainText('Ask a question')

  // The right word gets it at once, without minding capitals or a leading "Am I".
  await field.fill(`Am I ${adaWord.toUpperCase()}?`)
  await ada.getByRole('button', { name: 'That’s me!' }).click()
  await expect(ada.locator('.who-card.mine .term')).toHaveText(adaWord)
  await expect(bo.locator('.status.turn')).toContainText('Ask a question')

  // A wrong guess, judged by the others, ends Bo's turn.
  const boField = bo.getByRole('textbox', { name: 'Your question or guess' })
  await boField.fill('a toaster')
  await bo.getByRole('button', { name: 'That’s me!' }).click()
  await expect(cy.locator('.who-question')).toContainText('Bo guesses:')
  for (const page of [ada, cy]) await page.getByRole('button', { name: 'Wrong' }).click()
  await expect(cy.locator('.status.turn')).toContainText('Ask a question')
  await expect(cy.locator('.who-previous')).toContainText('Bo: a toaster wrong')

  // Cy passes; Bo gives up, with a second tap, and sees the word: Ada knew hers first.
  await cy.getByRole('button', { name: 'Pass' }).click()
  await bo.getByRole('button', { name: 'Give up' }).click()
  await bo.getByRole('button', { name: 'Tap again to give up' }).click()
  await expect(ada.locator('.status.turn')).toHaveText('You win!')
  await expect(bo.locator('.status.turn')).toHaveText('Ada wins.')
  await expect(bo.locator('.who-card.mine .term')).not.toHaveText('?')
})

test('three play Who Am I? on one device, asking aloud', async ({ browser }) => {
  const page = await phone(browser, 'Ada')
  await page.getByRole('button', { name: 'Play on this device' }).click()
  await page.getByRole('group', { name: 'Players' }).getByRole('button', { name: '3' }).click()
  for (const [i, name] of ['Ada', 'Bo', 'Cy'].entries()) {
    await page.getByLabel(`Name of player ${i + 1}`).fill(name)
  }
  await page.getByLabel('One screen, taking turns').check()
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: 'Who Am I?' }).click()
  await expect(page.locator('.status.turn')).toContainText('Ada asks aloud')
  // Only the word of the one asking shows, once they look away.
  await expect(page.locator('.who-term')).toHaveText('Ada looks away while the others see it.')
  await expect(page.locator('.who-cards')).toHaveCount(0)
  await page.getByRole('button', { name: 'Show it: Ada looks away' }).click()
  await expect(page.locator('.who-term')).not.toHaveClass(/hidden/)
  await page.getByRole('button', { name: 'Hide it again' }).click()
  await page.getByRole('button', { name: 'Yes: ask again' }).click()
  await expect(page.locator('.who-log')).toContainText('A question aloud: yes')
  await page.getByRole('button', { name: 'Guessed it!' }).click()
  await expect(page.locator('.status.turn')).toContainText('Bo asks aloud')
  await expect(page.locator('.who-term')).toHaveClass(/hidden/)
  await page.getByRole('button', { name: 'No: next player' }).click()
  await expect(page.locator('.status.turn')).toContainText('Cy asks aloud')
  await page.getByRole('button', { name: 'Guessed it!' }).click()
  await expect(page.locator('.status.turn')).toHaveText('Ada wins.')
  await expect(page.locator('.who-cards')).toContainText('Ada ✓ 1.')
})
