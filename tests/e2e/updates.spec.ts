import { expect, test } from '@playwright/test'

/** The website tells of a newer build deployed beside it, and loads it on a tap. */

test('the start screen offers a newer build of the website', async ({ page }) => {
  // The build served is the one running: nothing to say.
  await page.goto('./')
  await expect(page.getByRole('button', { name: 'Open a table' })).toBeVisible()
  const own = await (await page.request.get('./version.json')).json()
  expect(own).toMatchObject({ version: expect.any(String), commit: expect.any(String) })
  await expect(page.locator('.web-update')).toBeHidden()

  // A newer build is deployed.
  await page.route('**/version.json*', (route) =>
    route.fulfill({
      json: { version: own.version, commit: 'fedcba9', time: '2099-01-01T00:00:00.000Z' },
    }),
  )
  await page.reload()
  const banner = page.locator('.web-update')
  await expect(banner).toContainText('A new version of the Spielekiste is out.')
  const loaded = page.waitForEvent('load')
  await banner.getByRole('button', { name: 'Load it' }).click()
  await loaded
})
