import { expect, test } from './coverage'

/**
 * The website tells of a newer build deployed beside it, once the player switched that on in the
 * settings, and loads it on a tap. It also leads to the Android app.
 */

test('the start screen offers a newer build of the website, if asked to', async ({ page }) => {
  const own = await (await page.request.get('./version.json')).json()
  expect(own).toMatchObject({ version: expect.any(String), commit: expect.any(String) })
  let reads = 0
  await page.route('**/version.json*', (route) => {
    reads += 1
    return route.fulfill({
      json: { version: own.version, commit: 'fedcba9', time: '2099-01-01T00:00:00.000Z' },
    })
  })

  // Off until switched on: the page does not look.
  await page.goto('./')
  await expect(page.getByRole('button', { name: 'Open a table' })).toBeVisible()
  await expect(page.locator('.web-update')).toBeHidden()
  expect(reads).toBe(0)

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByLabel('Tell me on the start screen when a new version is out').check()
  await page.getByRole('button', { name: 'Back' }).click()
  const banner = page.locator('.web-update')
  await expect(banner).toContainText('A new version of the Spielekiste is out.')

  // Remembered: the next start looks at once.
  await page.reload()
  await expect(banner).toContainText('A new version of the Spielekiste is out.')
  const loaded = page.waitForEvent('load')
  await banner.getByRole('button', { name: 'Load it' }).click()
  await loaded
})

test('the website leads to the Android app', async ({ page }) => {
  await page.goto('./')
  const link = page.getByRole('link', { name: 'Get the Spielekiste as an Android app' })
  await expect(link).toHaveAttribute(
    'href',
    'https://github.com/FionaPreroll/vibe-mugames/releases/tag/android-latest',
  )
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.locator('.settings .app-link a')).toBeVisible()
})
