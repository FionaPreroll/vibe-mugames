import { expect, test } from './coverage'
import { phone, seat } from './helpers'

/**
 * The connection over real WebRTC: its ping in the table's top line, its details with the
 * addresses hidden until shown, the host's connection test, and the debug report.
 */

test('the table shows the connection, the host tests it, and the report holds it', async ({
  browser,
}) => {
  const ada = await phone(browser, 'Ada')
  const bo = await phone(browser, 'Bo')
  await ada.getByRole('button', { name: 'Open a table' }).click()
  // Alone at the table, there is no connection to show.
  await expect(ada.locator('header button.net')).toBeHidden()
  await seat(ada, bo)
  await expect(ada.locator('header button.net')).toBeVisible({ timeout: 5000 })
  await expect(ada.locator('header button.net')).toContainText(/\d+ ms/)
  await expect(bo.locator('header button.net')).toBeVisible({ timeout: 5000 })

  // The host's connection: the player's, with its addresses hidden until shown.
  await ada.locator('header button.net').click()
  const view = ada.locator('.modal .connection-view')
  await expect(view.locator('section.connection h3')).toHaveText('Bo')
  await expect(view).toContainText('Wi-Fi (WebRTC)')
  await view.getByText('Addresses, protocol and packets').click()
  await expect(view.locator('.address').first()).toHaveClass(/masked/)
  await expect(view).toContainText(/Encryption\s*DTLS/)
  await ada.getByRole('button', { name: 'Show addresses' }).click()
  await expect(view.locator('.address').first()).not.toHaveClass(/masked/)
  await expect(view.locator('.address').first()).not.toContainText('•')
  await ada.getByRole('button', { name: 'Hide addresses' }).click()
  await expect(view.locator('.address').first()).toHaveClass(/masked/)

  // The host tests the connection: both phones hear how it went.
  await ada.getByRole('button', { name: 'Test connections' }).click()
  await expect(bo.locator('.toast')).toContainText('testing the connection')
  await expect(view.locator('.connection-test')).toContainText(/From the host\s*[\d.]+ kB\/s/, {
    timeout: 15_000,
  })
  await bo.locator('header button.net').click()
  await expect(bo.locator('.modal .connection-view section.connection h3')).toHaveText('Ada (host)')
  await expect(bo.locator('.modal .connection-test')).toContainText(/Ping under load\s*\d+ ms/)
  await expect(bo.getByRole('button', { name: 'Test connections' })).toHaveCount(0)

  // The host's report has the connection and the test, without the addresses or names.
  await ada.locator('.modal').getByRole('button', { name: 'Debug report' }).click()
  const report = ada.locator('.modal textarea.report')
  await expect(report).toHaveValue(/## Spielekiste debug report/)
  await expect(report).toHaveValue(/- To player \d/)
  await expect(report).toHaveValue(/ {2}- player \d: ping \d+ ms/)
  const text = await report.inputValue()
  expect(text).not.toMatch(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b|\bBo\b|\bAda\b/)
  await ada.locator('.modal').getByRole('button', { name: 'Close' }).click()
  await expect(ada.locator('.modal')).toHaveCount(0)
})

test('the settings make a debug report, to read before sending it', async ({ browser }) => {
  const ada = await phone(browser, 'Ada')
  await ada.getByRole('button', { name: 'Settings' }).click()
  await ada.getByRole('button', { name: 'Create debug report' }).click()
  const modal = ada.locator('.modal')
  await expect(modal.locator('textarea.report')).toHaveValue(/- Running as: website in a browser/)
  await expect(modal.getByRole('link', { name: 'Report on GitHub' })).toHaveAttribute(
    'href',
    /^https:\/\/github\.com\/FionaPreroll\/vibe-mugames\/issues\/new\?/,
  )
  await expect(modal.getByRole('link', { name: 'Download' })).toHaveAttribute(
    'download',
    /^spielekiste-report-.*\.md$/,
  )
  await modal.getByRole('button', { name: 'Close' }).click()
  await expect(modal).toHaveCount(0)
})
