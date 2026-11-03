import { expect, test } from './coverage'

/** About the Spielekiste, and the privacy policy, in the app and as a page of its own. */

test('About shows the build, the contact, the changelog, the licenses and the privacy policy', async ({
  page,
}) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'About the Spielekiste' }).click()
  const about = page.locator('.about')
  await expect(about.getByRole('heading', { name: 'About the Spielekiste' })).toBeVisible()
  const own = await (await page.request.get('./version.json')).json()
  await expect(about.locator('.about-build')).toContainText(`build ${own.commit}`)
  await expect(about.getByRole('link', { name: 'fipreroll+app@gmail.com' })).toHaveAttribute(
    'href',
    'mailto:fipreroll+app@gmail.com',
  )
  await expect(about.locator('.changelog details[open] summary')).toHaveText('This version')
  // The build's own list of other people's code, each with its license text.
  const jsqr = about.locator('.license-list details', { hasText: 'jsqr' })
  await jsqr.locator('summary').click()
  await expect(jsqr.locator('.license-text')).toContainText('Apache License')

  await about.getByRole('button', { name: 'Privacy policy' }).click()
  await expect(page.locator('.privacy .document')).toContainText('What stays on your device')
  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('button', { name: 'Open a table' })).toBeVisible()
})

test('the privacy policy has a page of its own, in English and German', async ({ page }) => {
  await page.goto('./privacy.html')
  await expect(page.locator('#en h1')).toHaveText('Privacy policy')
  await expect(page.locator('#de h1')).toHaveText('Datenschutzerklärung')
  await expect(page.locator('#en')).toContainText('fipreroll+app@gmail.com')
})
