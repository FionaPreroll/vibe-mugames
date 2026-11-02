import { type Browser, expect, type Locator, type Page, test } from '@playwright/test'

/**
 * Phones in separate browser profiles, paired through the text codes, as phones would through
 * the QR codes: the real WebRTC connection, with the library's codes in between.
 */

async function phone(browser: Browser, name: string): Promise<Page> {
  // With the camera allowed, as on a phone, Chrome puts real addresses into the codes.
  const context = await browser.newContext({ locale: 'en-US', permissions: ['camera'] })
  const page = await context.newPage()
  await page.goto('./')
  await page.getByLabel('Your name').fill(name)
  return page
}

async function ownCode(root: Locator): Promise<string> {
  const field = root.locator('.own-code')
  await expect(field).toHaveValue(/^P1~/, { timeout: 10_000 })
  return field.inputValue()
}

async function pasteCode(root: Locator, code: string): Promise<void> {
  const details = root.locator('details.text-codes')
  if (!(await details.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await details.locator('summary').click()
  }
  await root.locator('.paste-code').fill(code)
  await root.getByRole('button', { name: 'Use code' }).click()
}

/** A player sits down at the host's table, through the text codes. */
async function seat(host: Page, player: Page): Promise<void> {
  await host.getByRole('button', { name: 'Add player' }).click()
  const modal = host.locator('.modal')
  const offer = await ownCode(modal)
  await player.getByRole('button', { name: 'Join a table' }).click()
  await pasteCode(player.locator('.join'), offer)
  await pasteCode(modal, await ownCode(player.locator('.join')))
  await expect(modal).toHaveCount(0)
}

const cell = (page: Page, index: number) => page.locator('.board .cell').nth(index)

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

  for (const [page, index] of [
    [ada, 0],
    [bo, 3],
    [ada, 1],
    [bo, 4],
    [ada, 2],
  ] as const) {
    await expect(cell(page, index)).toBeEnabled()
    await cell(page, index).click()
  }
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
