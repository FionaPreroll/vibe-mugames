import type { Page } from '@playwright/test'
import { expect, test } from './coverage'
import { phone, seat } from './helpers'

/**
 * Montagsmaler between phones and on one device: the one drawing draws on their phone, the
 * others see it and guess on theirs, and only the one drawing sees the word.
 */

/** Draws a line across the paper with the mouse. */
async function stroke(page: Page, from: [number, number], to: [number, number]): Promise<void> {
  const box = await page.locator('.paper-canvas').boundingBox()
  if (!box) throw new Error('no paper')
  const at = ([x, y]: [number, number]) => [box.x + x * box.width, box.y + y * box.height] as const
  await page.mouse.move(...at(from))
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(
      ...at([from[0] + ((to[0] - from[0]) * i) / 10, from[1] + ((to[1] - from[1]) * i) / 10]),
    )
  }
  await page.mouse.up()
}

/** How many of the paper's pixels are not the paper's own colour. */
async function inked(page: Page): Promise<number> {
  return page.locator('.paper-canvas').evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d')
    if (!context) return 0
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
    const [r, g, b] = [data[0], data[1], data[2]]
    let count = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== r || data[i + 1] !== g || data[i + 2] !== b) count++
    }
    return count
  })
}

test('two phones play Draw and Guess: one draws, the other sees it and guesses', async ({
  browser,
}) => {
  const ada = await phone(browser, 'Ada')
  const bo = await phone(browser, 'Bo')
  await ada.getByRole('button', { name: 'Open a table' }).click()
  await seat(ada, bo)
  await ada.getByRole('button', { name: 'Draw and Guess' }).click()
  await expect(ada.locator('.status.turn')).toHaveText('Choose a word to draw.')
  await expect(bo.locator('.status.turn')).toHaveText('Ada chooses a word.')
  await expect(bo.locator('.word-choices')).toHaveCount(0)

  const word = (await ada.locator('.word-choices button').first().textContent()) ?? ''
  await ada.locator('.word-choices button').first().click()
  await expect(ada.locator('.sketch-word.mine')).toHaveText(`Your word: ${word}`)
  await expect(bo.locator('.status.turn')).toContainText('Ada draws. What is it?')
  await expect(bo.locator('body')).not.toContainText(word)
  await expect(bo.locator('.sketch-word.blanks-line')).toContainText(`${word.length} letters`)

  await stroke(ada, [0.2, 0.2], [0.8, 0.8])
  await stroke(ada, [0.8, 0.2], [0.2, 0.8])
  await expect.poll(() => inked(bo)).toBeGreaterThan(100)

  // A wrong guess shows on every phone; the field keeps what Bo types while the table redraws.
  const field = bo.getByRole('textbox', { name: 'Your guess' })
  await field.click()
  await bo.keyboard.type('nothing like it', { delay: 30 })
  await bo.keyboard.press('Enter')
  await expect(ada.locator('.feed')).toContainText('Bo nothing like it')
  await expect(field).toBeFocused()
  await field.fill(word.toUpperCase())
  await bo.getByRole('button', { name: 'Guess', exact: true }).click()

  for (const page of [ada, bo]) {
    await expect(page.locator('.status.turn')).toHaveText(`The word was: ${word}.`)
  }
  await expect(bo.locator('.totals')).toContainText('Bo ✓ +3 3')
  await expect(ada.locator('.totals')).toContainText('Ada ✎ +1 1')
  await expect(bo.locator('.status.turn')).toHaveText('Choose a word to draw.', { timeout: 10_000 })
})

test('three play Draw and Guess on one device, guessing aloud', async ({ browser }) => {
  const page = await phone(browser, 'Ada')
  await page.getByRole('button', { name: 'Play on this device' }).click()
  await page.getByRole('group', { name: 'Players' }).getByRole('button', { name: '3' }).click()
  for (const [i, name] of ['Ada', 'Bo', 'Cy'].entries()) {
    await page.getByLabel(`Name of player ${i + 1}`).fill(name)
  }
  await page.getByLabel('One screen, taking turns').check()
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: 'Draw and Guess' }).click()
  await page.getByRole('button', { name: 'I am Ada: show my words' }).click()
  await expect(page.locator('.status.turn')).toHaveText(
    'Ada, choose a word to draw. The others look away.',
  )
  await page.locator('.word-choices button').first().click()
  // The others look at the screen too: the word stays hidden until asked for.
  await expect(page.locator('.sketch-word.mine')).toContainText('Your word is hidden.')
  await page.getByRole('button', { name: 'Show my word' }).click()
  await expect(page.locator('.sketch-word.mine')).toContainText('Your word:')
  await page.getByRole('button', { name: 'Hide my word' }).click()
  await expect(page.getByRole('textbox', { name: 'Your guess' })).toHaveCount(0)
  await stroke(page, [0.3, 0.5], [0.7, 0.5])
  expect(await inked(page)).toBeGreaterThan(50)
  await page.getByRole('button', { name: 'Bo', exact: true }).click()
  await page.getByRole('button', { name: 'Cy', exact: true }).click()
  await expect(page.locator('.status.turn')).toContainText('The word was:')
  await expect(page.locator('.totals')).toContainText('Ada ✎ +2 2Bo ✓ +3 3Cy ✓ +2 2')
})
