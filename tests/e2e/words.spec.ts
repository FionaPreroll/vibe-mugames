import type { Page } from '@playwright/test'
import { expect, test } from './coverage'
import { phone, seat } from './helpers'

/**
 * The party games of words between phones: in Stadt, Land, Fluss everyone writes at once, the
 * fields keep what is typed while the table changes, and the answers are checked together.
 */

/** Types an answer for each category, starting with the letter, a key at a time. */
async function writeAll(page: Page, letter: string, tag: string): Promise<void> {
  const fields = page.locator('.answer-fields input')
  for (let i = 0; i < 6; i++) {
    await fields.nth(i).click()
    await page.keyboard.type(`${letter}${tag}${i}`, { delay: 20 })
  }
}

test('two phones play a round of City, Country, River', async ({ browser }) => {
  const ada = await phone(browser, 'Ada')
  const bo = await phone(browser, 'Bo')
  await ada.getByRole('button', { name: 'Open a table' }).click()
  await seat(ada, bo)
  await ada.getByRole('button', { name: 'City, Country, River' }).click()
  const letter = (await ada.locator('.letter-card .letter').textContent()) ?? ''
  await expect(bo.locator('.letter-card .letter')).toHaveText(letter)
  await expect(bo.locator('.status.turn')).toHaveText(
    `Letter ${letter}: a word for every category!`,
  )

  // Both type at once: each phone's table changes with the other's answers, and the field
  // being typed in stays, focused, with every letter.
  await Promise.all([writeAll(ada, letter, 'ada'), writeAll(bo, letter, 'bo')])
  await expect(bo.locator('.answer-fields input').nth(5)).toBeFocused()
  await expect(bo.locator('.answer-fields input').nth(5)).toHaveValue(`${letter}bo5`)
  await expect(ada.locator('.writers')).toContainText('Bo 6 of 6')
  // Nobody sees another's answers yet.
  await expect(bo.locator('body')).not.toContainText(`${letter}ada0`)

  await ada.getByRole('button', { name: 'Stop!' }).click()
  await expect(bo.locator('.status.turn')).toContainText('Ada called Stop!')
  await expect(bo.locator('.status.turn')).toHaveText('Check the answers, then tap Next.', {
    timeout: 15_000,
  })

  // Bo objects to Ada's city: with one other at the table, it is struck.
  const city = bo.locator('.category').first()
  await city.getByRole('button', { name: new RegExp(`Ada, ${letter}ada0`) }).click()
  for (const page of [ada, bo]) {
    await expect(page.locator('.category').first().locator('.word.struck')).toHaveText(
      `${letter}ada0`,
    )
  }
  await expect(ada.locator('.totals')).toContainText('Ada +50')
  await expect(ada.locator('.totals')).toContainText('Bo +70')

  for (const page of [ada, bo]) await page.getByRole('button', { name: 'Next round' }).click()
  for (const page of [ada, bo]) {
    await expect(page.locator('.letter-card .round')).toContainText('Round 2 of 5')
    await expect(page.locator('.answer-fields input').first()).toHaveValue('')
  }
  await expect(ada.locator('.letter-card .letter')).not.toHaveText(letter)
})

test('three write City, Country, River in turn on one device', async ({ browser }) => {
  const page = await phone(browser, 'Ada')
  await page.getByRole('button', { name: 'Play on this device' }).click()
  await page.getByRole('group', { name: 'Players' }).getByRole('button', { name: '3' }).click()
  for (const [i, name] of ['Ada', 'Bo', 'Cy'].entries()) {
    await page.getByLabel(`Name of player ${i + 1}`).fill(name)
  }
  await page.getByLabel('One screen, taking turns').check()
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: 'City, Country, River' }).click()
  await expect(page.locator('.notice')).toContainText('everyone writes in turn')

  for (const [i, name] of ['Ada', 'Bo', 'Cy'].entries()) {
    await page.getByRole('button', { name: `I am ${name}: show my letter` }).click()
    const letter = (await page.locator('.letter-card .letter').textContent()) ?? ''
    await expect(page.locator('.status.turn')).toHaveText(
      `${name} writes: letter ${letter}. The others look away.`,
    )
    await page.locator('.answer-fields input').first().fill(`${letter}${name}`)
    await page.getByRole('button', { name: 'Done: next one' }).click()
    if (i < 2) await page.getByRole('button', { name: /Done: hand over to/ }).click()
  }
  await expect(page.locator('.status.turn')).toHaveText('Check the answers together.')
  await expect(page.locator('.category').first().locator('.word')).toHaveText([
    /Ada$/,
    /Bo$/,
    /Cy$/,
  ])
  // One tap strikes Bo's city.
  await page.locator('.category').first().locator('button.answer-check').nth(1).click()
  await expect(page.locator('.category').first().locator('.word.struck')).toHaveCount(1)
  await page.getByRole('button', { name: 'Next round' }).click()
  await expect(page.getByRole('button', { name: 'Done: hand over to Ada' })).toBeVisible()
})
