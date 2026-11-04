import { expect, test } from './coverage'

/** The themes: picked in the settings, applied at once, and kept for the next start. */

test('a theme picked in the settings colours the page and stays', async ({ page }) => {
  // In July, the seasons say summer, the theme of a device that never chose one.
  await page.clock.install({ time: new Date('2026-07-15T12:00:00') })
  await page.goto('./')
  const root = page.locator('html')
  await expect(root).toHaveAttribute('data-theme', 'summer')
  await expect(page.locator('.decor-summer .sun')).toBeAttached()
  await page.getByRole('button', { name: 'Settings' }).click()
  const themes = page.getByRole('radiogroup', { name: 'Theme' })
  await expect(themes.getByRole('radio')).toHaveCount(21)
  await expect(themes.getByRole('radio', { name: /^With the seasons/ })).toBeChecked()

  await themes.getByText('Green felt', { exact: true }).click()
  await expect(root).toHaveAttribute('data-theme', 'felt')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0f4a30')
  const background = () => root.evaluate((html) => getComputedStyle(html).backgroundColor)
  expect(await background()).toBe('rgb(15, 74, 48)')

  await page.reload()
  await expect(root).toHaveAttribute('data-theme', 'felt')
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(themes.getByRole('radio', { name: 'Green felt' })).toBeChecked()

  // A seasonal theme brings its decorations, behind the screens and out of the way.
  await themes.getByText('Winter', { exact: true }).click()
  await expect(page.locator('.decor-winter .flake').first()).toBeAttached()
  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('button', { name: 'Play on this device' }).click()
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible()
  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('button', { name: 'Settings' }).click()
  await themes.getByText('Classic', { exact: true }).click()
  await expect(root).not.toHaveAttribute('data-theme')
  await expect(page.locator('.decor')).toHaveCount(0)
})
