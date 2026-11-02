import type { Locator, Page } from '@playwright/test'
import { expect, test } from './coverage'
import { phone } from './helpers'

/**
 * Playing on one device, as people around a laptop or a tablet would: taking turns on one
 * screen, or a split screen with a part for each player. No second browser, no network.
 */

const cell = (root: Page | Locator, index: number) => root.locator(`.board [data-cell="${index}"]`)

/** From the start screen to the table on this device: the players' names, and how they play. */
async function startLocal(page: Page, names: string[], split: boolean): Promise<void> {
  await page.getByRole('button', { name: 'Play on this device' }).click()
  await page
    .getByRole('group', { name: 'Players' })
    .getByRole('button', {
      name: String(names.length),
      exact: true,
    })
    .click()
  for (const [i, name] of names.entries()) {
    await page.getByLabel(`Name of player ${i + 1}`).fill(name)
  }
  await page.getByLabel(split ? 'Split screen' : 'One screen, taking turns').check()
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.locator('.status.turn')).toHaveText('Choose a game')
}

test('two players take turns on one screen at Tic Tac Toe, and play again', async ({ browser }) => {
  const page = await phone(browser, 'Ada')
  await startLocal(page, ['Ada', 'Bo'], false)
  await page.getByRole('button', { name: 'Tic Tac Toe' }).click()
  const status = page.locator('.status.turn')
  await expect(status).toHaveText('Ada, your turn')
  // No cards to hide in Tic Tac Toe.
  await expect(page.locator('.notice')).toHaveCount(0)

  for (const [index, next] of [
    [0, 'Bo, your turn'],
    [3, 'Ada, your turn'],
    [1, 'Bo, your turn'],
    [4, 'Ada, your turn'],
    [2, 'Ada wins.'],
  ] as const) {
    await cell(page, index).click()
    await expect(status).toHaveText(next)
  }
  await expect(page.locator('.board .cell.win')).toHaveCount(3)
  await expect(page.locator('.players li', { hasText: 'Ada' }).locator('.score')).toHaveText('1')

  await page.getByRole('button', { name: 'Play again' }).click()
  await expect(status).toHaveText('Bo, your turn')

  // Stopping goes back to choosing the players, who are remembered.
  await page.getByRole('button', { name: 'Stop playing' }).click()
  await expect(page.getByLabel('Name of player 2')).toHaveValue('Bo')
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('button', { name: 'Open a table' })).toBeVisible()
})

test('three take turns at Miau-Miau with open cards, each seeing their hand on their turn', async ({
  browser,
}) => {
  const page = await phone(browser, 'Ada')
  await startLocal(page, ['Ada', 'Bo', 'Cy'], false)
  // The lobby says before the game that its cards are open here.
  await expect(page.getByRole('button', { name: 'Miau-Miau' })).toContainText('open cards')
  await page.getByRole('button', { name: 'Miau-Miau' }).click()
  await expect(page.getByRole('note')).toHaveText(
    'Open cards: on one device, everyone can see every hand. Look away when it is not your turn.',
  )
  const status = page.locator('.status.turn')
  await expect(status).toHaveText(/^(Ada|Bo|Cy), your turn$/)
  const first = ((await status.textContent()) ?? '').split(',')[0] ?? ''
  await expect(page.locator('.hand .card')).toHaveCount(5)
  // The two others' cards lie face down, and the player to move is not among them.
  await expect(page.locator('.opponent')).toHaveCount(2)
  await expect(page.locator('.opponent', { hasText: first })).toHaveCount(0)

  // The player draws; if the card fits, they keep it. Then it is the next player's hand.
  await page.locator('.stock').click()
  const keep = page.getByRole('button', { name: 'Keep it' })
  if (await keep.isVisible()) await keep.click()
  await expect(status).not.toHaveText(`${first}, your turn`)
  await expect(page.locator('.opponent', { hasText: first }).locator('.count')).toHaveText('6')
  await expect(page.locator('.hand .card')).toHaveCount(5)
})

test('a split screen gives two players a part each, and turns one round', async ({ browser }) => {
  const page = await phone(browser, 'Ada')
  await page.setViewportSize({ width: 1280, height: 800 })
  await startLocal(page, ['Ada', 'Bo'], true)
  await page.getByRole('button', { name: 'Four in a Row' }).click()
  const ada = page.getByRole('region', { name: 'Ada' })
  const bo = page.getByRole('region', { name: 'Bo' })
  await expect(page.locator('.pane')).toHaveCount(2)
  await expect(ada.locator('.status.turn')).toHaveText('Your turn')
  await expect(bo.locator('.status.turn')).toHaveText('Ada’s turn')
  await expect(cell(bo, 3)).toBeDisabled()

  // The two parts sit side by side and fill the window.
  const [a, b] = [await ada.boundingBox(), await bo.boundingBox()]
  expect(a && b && a.x + a.width <= b.x).toBe(true)
  expect(a && a.height > 600).toBe(true)

  await cell(ada, 3).click()
  await expect(cell(bo, 5 * 7 + 3)).toHaveClass(/seat-0/)
  await expect(bo.locator('.status.turn')).toHaveText('Your turn')
  await expect(cell(ada, 4)).toBeDisabled()

  // Bo sits across the table: his part turns round to face him, and still takes his moves.
  await page.getByRole('button', { name: 'Turn Bo’s side around' }).click()
  await expect(bo).toHaveClass(/turned/)
  await cell(bo, 4).click()
  await expect(cell(ada, 5 * 7 + 4)).toHaveClass(/seat-1/)
  await expect(ada.locator('.status.turn')).toHaveText('Your turn')
})

test('four play Miau-Miau on a split screen, each part with its own cards', async ({ browser }) => {
  const page = await phone(browser, 'Ada')
  await page.setViewportSize({ width: 1280, height: 900 })
  await startLocal(page, ['Ada', 'Bo', 'Cy', 'Di'], true)
  await page.getByRole('button', { name: 'Miau-Miau' }).click()
  await expect(page.getByRole('note')).toContainText('Open cards')
  const panes = page.locator('.pane')
  await expect(panes).toHaveCount(4)
  for (const name of ['Ada', 'Bo', 'Cy', 'Di']) {
    const pane = page.getByRole('region', { name })
    await expect(pane.locator('.hand .card')).toHaveCount(5)
    await expect(pane.locator('.opponent')).toHaveCount(3)
  }
  // Exactly one part may move: the one whose turn it is, which draws a card.
  const mover = page.locator('.pane.to-move')
  await expect(mover).toHaveCount(1)
  await expect(mover.locator('.status.turn')).toHaveText('Your turn')
  await expect(page.locator('.pane:not(.to-move) .stock:enabled')).toHaveCount(0)
  const name = (await mover.getAttribute('aria-label')) ?? ''
  await mover.locator('.stock').click()
  const keep = mover.getByRole('button', { name: 'Keep it' })
  if (await keep.isVisible()) await keep.click()
  await expect(page.getByRole('region', { name }).locator('.hand .card')).toHaveCount(6)
  await expect(page.locator('.pane.to-move')).not.toHaveAttribute('aria-label', name)
  // The next player sees the card drawn among the cards in that hand.
  await expect(
    page.locator('.pane.to-move').locator('.opponent', { hasText: name }).locator('.count'),
  ).toHaveText('6')
})

test('a split screen is for two to four: with five, players take turns on one screen', async ({
  browser,
}) => {
  const page = await phone(browser, 'Ada')
  await page.getByRole('button', { name: 'Play on this device' }).click()
  await page.getByLabel('Split screen').check()
  await page.getByRole('group', { name: 'Players' }).getByRole('button', { name: '5' }).click()
  await expect(page.getByLabel('Split screen')).toBeDisabled()
  await expect(page.getByLabel('One screen, taking turns')).toBeChecked()
  await expect(page.locator('.names input')).toHaveCount(5)
  await page.getByRole('button', { name: 'Start' }).click()
  // Five fit at Miau-Miau, with a deck of 52.
  await page.getByRole('button', { name: 'Miau-Miau' }).click()
  await expect(page.locator('.opponent')).toHaveCount(4)
  await expect(page.locator('.pane')).toHaveCount(0)
})
