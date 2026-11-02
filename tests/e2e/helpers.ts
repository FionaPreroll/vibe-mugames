import { type Browser, expect, type Locator, type Page } from '@playwright/test'

/** Phones for the browser tests, and pairing them through the text codes. */

export async function phone(browser: Browser, name: string): Promise<Page> {
  // With the camera allowed, as on a phone, Chrome puts real addresses into the codes.
  const context = await browser.newContext({ locale: 'en-US', permissions: ['camera'] })
  const page = await context.newPage()
  await page.goto('./')
  await page.getByLabel('Your name').fill(name)
  return page
}

export async function ownCode(root: Locator): Promise<string> {
  const field = root.locator('.own-code')
  await expect(field).toHaveValue(/^P1~/, { timeout: 10_000 })
  return field.inputValue()
}

export async function pasteCode(root: Locator, code: string): Promise<void> {
  const details = root.locator('details.text-codes')
  if (!(await details.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await details.locator('summary').click()
  }
  await root.locator('.paste-code').fill(code)
  await root.getByRole('button', { name: 'Use code' }).click()
}

/** A player sits down at the host's table, through the text codes. */
export async function seat(host: Page, player: Page): Promise<void> {
  await host.getByRole('button', { name: 'Add player' }).click()
  const modal = host.locator('.modal')
  const offer = await ownCode(modal)
  await player.getByRole('button', { name: 'Join a table' }).click()
  await pasteCode(player.locator('.join'), offer)
  await pasteCode(modal, await ownCode(player.locator('.join')))
  await expect(modal).toHaveCount(0)
}
