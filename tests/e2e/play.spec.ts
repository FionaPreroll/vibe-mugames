import type { Page } from '@playwright/test'
import { expect, test } from './coverage'
import { phone, seat } from './helpers'

/**
 * Phones in separate browser profiles, paired through the text codes, as phones would through
 * the QR codes: the real WebRTC connection, with the library's codes in between.
 */

const cell = (page: Page, index: number) => page.locator('.board .cell').nth(index)
const point = (page: Page, index: number) => page.locator(`.board [data-cell="${index}"]`)

/**
 * Places pieces in turn, each by a tap on the phone whose turn it is, and waits until every phone
 * shows the piece before the next. A player's phone draws only the table the host sends, a tick
 * later: without the wait, the next tap could land on a board that does not yet show the last
 * move, and the host would rightly refuse it.
 */
async function places(phones: Page[], ...steps: (readonly [Page, number])[]): Promise<void> {
  for (const [page, index] of steps) {
    await expect(point(page, index)).toBeEnabled()
    await point(page, index).click()
    for (const other of phones) await expect(point(other, index)).not.toHaveClass(/\bempty\b/)
  }
}

test('two phones play Tic Tac Toe, and again with the other one starting', async ({ browser }) => {
  const ada = await phone(browser, 'Ada')
  const bo = await phone(browser, 'Bo')
  await ada.getByRole('button', { name: 'Open a table' }).click()
  await expect(ada.getByRole('button', { name: 'Tic Tac Toe' })).toBeDisabled()
  await seat(ada, bo)
  await expect(ada.locator('.toast')).toHaveText('Bo joined.')
  await expect(bo.locator('.players')).toContainText('Ada')
  await expect(bo.locator('.main')).toContainText('Ada chooses a game.')

  await ada.getByRole('button', { name: 'Tic Tac Toe' }).click()
  await expect(ada.locator('.status.turn')).toHaveText('Your turn')
  await expect(bo.locator('.status.turn')).toHaveText('Ada’s turn')
  // Not Bo's turn: Bo's board takes nothing.
  await expect(cell(bo, 0)).toBeDisabled()

  await places([ada, bo], [ada, 0], [bo, 3], [ada, 1], [bo, 4], [ada, 2])
  await expect(ada.locator('.status.turn')).toHaveText('You win!')
  await expect(bo.locator('.status.turn')).toHaveText('Ada wins.')
  await expect(bo.locator('.board .cell.win')).toHaveCount(3)
  await expect(bo.locator('.players li', { hasText: 'Ada' }).locator('.score')).toHaveText('1')
  await expect(bo.locator('.main')).toContainText('Ada decides what comes next.')

  await ada.getByRole('button', { name: 'Play again' }).click()
  await expect(bo.locator('.status.turn')).toHaveText('Your turn')
  await expect(cell(bo, 4)).toBeEnabled()
})

test('a third player watches Four in a Row, and the host closes the table', async ({ browser }) => {
  const ada = await phone(browser, 'Ada')
  const bo = await phone(browser, 'Bo')
  const cy = await phone(browser, 'Cy')
  await ada.getByRole('button', { name: 'Open a table' }).click()
  await seat(ada, bo)
  await seat(ada, cy)
  await ada.getByRole('button', { name: 'Four in a Row' }).click()
  await expect(cy.locator('.status.turn')).toHaveText('You are watching: Ada against Bo.')
  await expect(cy.locator('.board .cell')).toHaveCount(42)

  // Ada drops a piece into the middle column: it falls to the bottom, on every phone.
  await cell(ada, 3).click()
  await expect(cell(cy, 5 * 7 + 3)).toHaveClass(/seat-0/)
  await expect(bo.locator('.status.turn')).toHaveText('Your turn')

  await ada.getByRole('button', { name: 'Close the table for everyone' }).click()
  await expect(bo.locator('.toast')).toHaveText('The host closed the table.')
  await expect(bo.getByRole('button', { name: 'Join a table' })).toBeVisible()
})

/** Taps cells on one phone, such as a piece and where it goes, each once the board offers it. */
async function taps(...steps: (readonly [Page, number])[]): Promise<void> {
  for (const [page, index] of steps) {
    await expect(point(page, index)).toBeEnabled()
    await point(page, index).click()
  }
}

test('in Mühle a mill takes a piece, on every phone', async ({ browser }) => {
  const ada = await phone(browser, 'Ada')
  const bo = await phone(browser, 'Bo')
  await ada.getByRole('button', { name: 'Open a table' }).click()
  await seat(ada, bo)
  await ada.getByRole('button', { name: 'Nine Men’s Morris' }).click()
  await expect(bo.locator('.board .cell')).toHaveCount(24)
  await expect(ada.locator('.hint')).toHaveText('Place a piece on a free point.')
  await expect(bo.locator('.hand')).toHaveText('Ada: 9 to place · Bo: 9 to place')

  await places([ada, bo], [ada, 0], [bo, 8], [ada, 1], [bo, 9], [ada, 2])
  await expect(ada.locator('.status.turn')).toHaveText('A mill! Take one of Bo’s pieces.')
  await expect(bo.locator('.status.turn')).toHaveText('Ada closed a mill and takes a piece.')
  // Only Bo's pieces can be taken.
  await expect(point(ada, 1)).toBeDisabled()
  await expect(point(ada, 3)).toBeDisabled()
  await point(ada, 9).click()
  await expect(point(bo, 9)).toHaveClass(/empty/)
  await expect(point(bo, 9)).toHaveClass(/last/)
  await expect(bo.locator('.status.turn')).toHaveText('Your turn')
  await expect(bo.locator('.hand')).toHaveText('Ada: 6 to place · Bo: 7 to place')
})

test('in Dame a piece is picked, then moved, and a jump takes', async ({ browser }) => {
  const ada = await phone(browser, 'Ada')
  const bo = await phone(browser, 'Bo')
  await ada.getByRole('button', { name: 'Open a table' }).click()
  await seat(ada, bo)
  await ada.getByRole('button', { name: 'Draughts' }).click()
  // Each player's own pieces at the bottom: Bo's board is turned round.
  await expect(ada.locator('.board [data-cell]').first()).toHaveAttribute('data-cell', '1')
  await expect(bo.locator('.board [data-cell]').first()).toHaveAttribute('data-cell', '62')

  // Ada picks c3: d4 and b4 light up, and the piece goes to d4.
  await point(ada, 42).click()
  await expect(point(ada, 42)).toHaveClass(/picked/)
  await expect(ada.locator('.board .cell.target')).toHaveCount(2)
  await point(ada, 35).click()
  await expect(point(bo, 35)).toHaveClass(/seat-0/)
  await taps([bo, 21], [bo, 28])

  // Now Ada must take: only d4 can move, and it jumps over e5.
  await expect(ada.locator('.hint')).toHaveText('You must take: pick a piece that can jump.')
  await expect(point(ada, 44)).toBeDisabled()
  await taps([ada, 35], [ada, 21])
  await expect(point(bo, 28)).toHaveClass(/empty/)
  await expect(point(bo, 21)).toHaveClass(/seat-0/)
  await expect(bo.locator('.status.turn')).toHaveText('Your turn')
})

test('three phones play Miau-Miau, each seeing only its own cards', async ({ browser }) => {
  const ada = await phone(browser, 'Ada')
  const bo = await phone(browser, 'Bo')
  const cy = await phone(browser, 'Cy')
  await ada.getByRole('button', { name: 'Open a table' }).click()
  await expect(ada.getByRole('button', { name: 'Miau-Miau' })).toBeDisabled()
  await seat(ada, bo)
  await seat(ada, cy)
  await ada.getByRole('button', { name: 'Miau-Miau' }).click()

  for (const page of [ada, bo, cy]) {
    await expect(page.locator('.hand .card')).toHaveCount(5)
    // The two others' cards lie face down, five each.
    await expect(page.locator('.opponent .count')).toHaveText(['5', '5'])
  }
  await expect(ada.locator('.status.turn')).toHaveText('Your turn')
  await expect(bo.locator('.status.turn')).toHaveText('Ada’s turn')
  // Not Bo's turn: none of his cards, nor the stock, can be played.
  await expect(bo.locator('.hand .card:enabled')).toHaveCount(0)
  await expect(bo.locator('.stock')).toBeDisabled()

  // Ada draws a card. If it fits, she keeps it and passes; either way it is Bo's turn after.
  await ada.locator('.stock').click()
  await expect(bo.locator('.opponent', { hasText: 'Ada' }).locator('.count')).toHaveText('6')
  const keep = ada.getByRole('button', { name: 'Keep it' })
  if (await keep.isVisible()) await keep.click()
  await expect(bo.locator('.status.turn')).toHaveText('Your turn')
  await expect(cy.locator('.status.turn')).toHaveText('Bo’s turn')

  // Bo plays a card that fits, choosing a suit if it is a jack, or draws.
  const playable = bo.locator('.hand .card:enabled')
  if ((await playable.count()) > 0) {
    await playable.first().click()
    const hearts = bo.locator('.suit-choice').getByRole('button', { name: 'hearts', exact: true })
    if (await hearts.isVisible()) await hearts.click()
    await expect(cy.locator('.opponent', { hasText: 'Bo' }).locator('.count')).toHaveText('4')
  } else {
    await bo.locator('.stock').click()
    await expect(cy.locator('.opponent', { hasText: 'Bo' }).locator('.count')).toHaveText('6')
  }
})

test('two phones play Sea Battle to the end, each seeing only its own fleet', async ({
  browser,
}) => {
  const ada = await phone(browser, 'Ada')
  const bo = await phone(browser, 'Bo')
  await ada.getByRole('button', { name: 'Open a table' }).click()
  await seat(ada, bo)
  await ada.getByRole('button', { name: 'Sea Battle' }).click()
  const square = (page: Page, grid: string, cell: number) =>
    page.locator(`.sea.${grid} [data-cell="${cell}"]`)
  const ships = async (page: Page, grid: string) =>
    (await page
      .locator(`.sea.${grid} .ship`)
      .evaluateAll((all) => all.map((b) => Number((b as HTMLElement).dataset.cell)))) as number[]

  // Both place at once: Bo shuffles first, then both are ready.
  for (const page of [ada, bo]) {
    await expect(page.locator('.status.turn')).toHaveText('Place your fleet')
    await expect(page.locator('.sea.placing .ship')).toHaveCount(17)
  }
  await bo.getByRole('button', { name: 'Shuffle' }).click()
  const boFleet = await ships(bo, 'placing')
  await bo.getByRole('button', { name: 'Ready' }).click()
  await expect(bo.locator('.status.turn')).toHaveText('Waiting for Ada to place their fleet.')
  const adaFleet = await ships(ada, 'placing')
  await ada.getByRole('button', { name: 'Ready' }).click()
  await expect(ada.locator('.status.turn')).toHaveText('Your turn')
  await expect(bo.locator('.status.turn')).toHaveText('Ada’s turn')
  expect(await ships(bo, 'own')).toEqual(boFleet)
  // Neither phone shows the other's ships.
  await expect(ada.locator('.sea.target .ship')).toHaveCount(0)
  await expect(bo.locator('.sea.target .ship')).toHaveCount(0)

  // Ada misses, then Bo misses, then Ada sinks Bo's whole fleet, a hit at a time.
  const water = (fleet: number[]) => [...Array(100).keys()].find((c) => !fleet.includes(c)) ?? 0
  await square(ada, 'target', water(boFleet)).click()
  await expect(bo.locator('.status.turn')).toHaveText('Your turn')
  await expect(bo.locator('.hint').first()).toHaveText('Ada hit water.')
  await expect(square(bo, 'own', water(boFleet))).toHaveClass(/miss/)
  await square(bo, 'target', water(adaFleet)).click()
  await expect(ada.locator('.status.turn')).toHaveText('Your turn')
  for (const cell of boFleet) {
    if (await ada.locator('.status.turn').getByText('You win!').isVisible()) break
    await expect(square(ada, 'target', cell)).toBeEnabled()
    await square(ada, 'target', cell).click()
    await expect(square(bo, 'own', cell)).toHaveClass(/hit/)
  }
  await expect(ada.locator('.status.turn')).toHaveText('You win!')
  await expect(bo.locator('.status.turn')).toHaveText('Ada wins.')
  await expect(ada.locator('.sea.target .sunk')).toHaveCount(17)
  // Once it is over, Bo sees where Ada's ships were.
  await expect(bo.locator('.sea.target .ship')).toHaveCount(17)
  expect(await ships(bo, 'target')).toEqual(adaFleet)
})
