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
  await page.getByRole('button', { name: 'Tic Tac Toe', exact: true }).click()
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

test('every game shows a thumbnail, and its rules with drawings, in the chooser and in the game', async ({
  browser,
}) => {
  const page = await phone(browser, 'Ada')
  await startLocal(page, ['Ada', 'Bo'], false)
  const games = page.locator('.game-card')
  await expect(games.first()).toBeVisible()
  // Every game in the chooser has its thumbnail.
  const count = await games.count()
  expect(count).toBeGreaterThanOrEqual(15)
  await expect(page.locator('.game-card svg.thumbnail')).toHaveCount(count)

  await page.getByRole('group', { name: 'Draughts' }).getByRole('button', { name: 'Rules' }).click()
  const rules = page.getByRole('dialog', { name: 'Rules of Draughts' })
  await expect(rules).toBeVisible()
  await expect(rules.locator('.rule-steps li')).toHaveCount(5)
  await expect(rules.locator('.rule-steps svg')).toHaveCount(3)
  await rules.getByRole('button', { name: 'Close' }).click()
  await expect(rules).toHaveCount(0)
  // Reading the rules chose nothing.
  await expect(page.locator('.status.turn')).toHaveText('Choose a game')

  await page.getByRole('button', { name: 'Sea Battle' }).click()
  await page.getByRole('button', { name: 'Rules' }).click()
  await expect(page.getByRole('dialog', { name: 'Rules of Sea Battle' })).toContainText(
    'Ships may not touch',
  )
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

test('two take turns at Dots and Boxes, and closing a box draws again', async ({ browser }) => {
  const page = await phone(browser, 'Ada')
  await startLocal(page, ['Ada', 'Bo'], false)
  await page.getByRole('button', { name: 'Dots and Boxes' }).click()
  const status = page.locator('.status.turn')
  // The top, the left and the right of the first box, then Bo draws its bottom.
  for (const [line, next] of [
    [0, 'Bo, your turn'],
    [30, 'Ada, your turn'],
    [31, 'Bo, your turn'],
    [5, 'Bo, your turn'],
  ] as const) {
    await cell(page, line).click()
    await expect(cell(page, line)).not.toHaveClass(/\bempty\b/)
    await expect(status).toHaveText(next)
  }
  await expect(cell(page, 60)).toHaveClass(/seat-1/)
  await expect(page.locator('.hint')).toHaveText('Bo closed a box and draws again.')
  await expect(page.locator('.hand')).toHaveText('Boxes: Ada 0 · Bo 1')
  await expect(cell(page, 0)).toBeDisabled()
})

test('three play Chinese Checkers on a split screen, each with their own side', async ({
  browser,
}) => {
  const page = await phone(browser, 'Ada')
  await page.setViewportSize({ width: 1280, height: 800 })
  await startLocal(page, ['Ada', 'Bo', 'Cy'], true)
  await page.getByRole('button', { name: 'Chinese Checkers' }).click()
  const ada = page.getByRole('region', { name: 'Ada' })
  const bo = page.getByRole('region', { name: 'Bo' })
  await expect(page.locator('.pane')).toHaveCount(3)
  await expect(ada.locator('.status.turn')).toHaveText('Your turn')
  // A jump: from the second row of Ada's triangle over the piece in front of it.
  await cell(ada, 116).click()
  await expect(ada.locator('.board .cell.target').first()).toBeVisible()
  await cell(ada, 103).click()
  await expect(cell(bo, 103)).toHaveClass(/seat-0/)
  await expect(cell(bo, 116)).toHaveClass(/last/)
  await expect(bo.locator('.status.turn')).toHaveText('Your turn')
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

test('two take turns at Sea Battle, handing the device over between them', async ({ browser }) => {
  const page = await phone(browser, 'Ada')
  await startLocal(page, ['Ada', 'Bo'], false)
  await page.getByRole('button', { name: 'Sea Battle' }).click()
  const status = page.locator('.status.turn')
  for (const [name, next] of [
    ['Ada', 'Bo'],
    ['Bo', 'Ada'],
  ]) {
    await expect(status).toHaveText(`Pass the device to ${name}. Only ${name} looks now.`)
    await expect(page.locator('.sea')).toHaveCount(0)
    await page.getByRole('button', { name: `I am ${name}: show my sea` }).click()
    await expect(status).toHaveText(`${name}, place your fleet`)
    // Pick a ship and turn it, then ready.
    await page.locator('.sea.placing .ship').first().click()
    await expect(page.locator('.sea.placing .picked').first()).toBeVisible()
    await page.getByRole('button', { name: 'Turn the ship' }).click()
    await expect(page.locator('.sea.placing .ship')).toHaveCount(17)
    await page.getByRole('button', { name: 'Ready' }).click()
    await page.getByRole('button', { name: `Done: hand over to ${next}` }).click()
  }
  await page.getByRole('button', { name: 'I am Ada: show my sea' }).click()
  await expect(status).toHaveText('Ada, your turn')
  await expect(page.locator('.sea.own .ship')).toHaveCount(17)
  await expect(page.locator('.sea.target .ship')).toHaveCount(0)
  // Shooting until a miss, then the device goes to Bo.
  for (let cell = 0; cell < 100; cell++) {
    if (await page.getByRole('button', { name: 'Done: hand over to Bo' }).isVisible()) break
    await page.locator(`.sea.target [data-cell="${cell}"]`).click()
  }
  await page.getByRole('button', { name: 'Done: hand over to Bo' }).click()
  await expect(page.locator('.sea')).toHaveCount(0)
  await page.getByRole('button', { name: 'I am Bo: show my sea' }).click()
  await expect(status).toHaveText('Bo, your turn')
  await expect(page.locator('.hint').first()).toHaveText('Ada hit water.')
})

test('two take turns at Ludo on one screen, rolling until a piece comes out', async ({
  browser,
}) => {
  const page = await phone(browser, 'Ada')
  await startLocal(page, ['Ada', 'Bo'], false)
  await page.getByRole('button', { name: 'Ludo' }).click()
  const status = page.locator('.status.turn')
  await expect(status).toHaveText('Ada, your turn')
  await expect(page.locator('.notice')).toHaveCount(0)
  const track = page.locator('.board .cell.track .token')
  for (let i = 0; i < 300 && (await track.count()) === 0; i++) {
    if (await page.locator('.die.can').count()) await page.locator('.die.can').click()
    else {
      await page.locator('.cell.can').first().click()
      await expect(page.locator('.cell.target')).toHaveCount(1)
      await page.locator('.cell.target').click()
    }
  }
  await expect(track).toHaveCount(1)
  // Only a six brings a piece out, and a six rolls again.
  await expect(page.locator('.hint')).toContainText(['A six: roll again.'])
})
