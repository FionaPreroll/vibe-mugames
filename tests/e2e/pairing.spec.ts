import { expect, test } from '@playwright/test'
import { ownCode, pasteCode, phone } from './helpers'

/**
 * Pairing by copying the codes over, as players do when the camera will not read them: every
 * step says what is going on, and what goes wrong says so, with a way to try again.
 */

test('a code sent over slowly still lets the player in', async ({ browser }) => {
  // A code sent through a messenger takes far longer than a scan: here 40 seconds.
  test.setTimeout(120_000)
  const ada = await phone(browser, 'Ada')
  const bo = await phone(browser, 'Bo')
  await ada.getByRole('button', { name: 'Open a table' }).click()
  await ada.getByRole('button', { name: 'Add player' }).click()
  const modal = ada.locator('.modal')
  const offer = await ownCode(modal)

  await bo.getByRole('button', { name: 'Join a table' }).click()
  const join = bo.locator('.join')
  await pasteCode(join, offer)
  const answer = await ownCode(join)
  await expect(join.locator('.status')).toHaveText(/Waiting for the host/)
  // Nothing more to paste on this phone.
  await expect(join.getByRole('button', { name: 'Use code' })).toBeHidden()

  await bo.waitForTimeout(40_000)
  await expect(join.locator('.status')).toHaveText(/Waiting for the host/)
  await pasteCode(modal, answer)
  await expect(ada.locator('.toast')).toHaveText('Bo joined.')
  await expect(bo.locator('.players')).toContainText('Ada')
})

test('a code that is not one says so, and a good one is taken after it', async ({ browser }) => {
  const ada = await phone(browser, 'Ada')
  const bo = await phone(browser, 'Bo')
  await ada.getByRole('button', { name: 'Open a table' }).click()
  await ada.getByRole('button', { name: 'Add player' }).click()
  const modal = ada.locator('.modal')
  const offer = await ownCode(modal)

  await bo.getByRole('button', { name: 'Join a table' }).click()
  const join = bo.locator('.join')
  for (const wrong of ['', 'hello', 'P1~broken']) {
    await pasteCode(join, wrong)
    await expect(join.locator('.status')).toHaveText('That is not a Spielekiste code.')
  }
  // The host's own code is the wrong kind for the host.
  await pasteCode(modal, offer)
  await expect(modal.locator('.status')).toHaveText('That is not a Spielekiste code.')

  await pasteCode(join, offer)
  // The complaint is gone once a code is taken.
  await expect(join.locator('.status')).toHaveText(/Waiting for the host/)
  await pasteCode(modal, await ownCode(join))
  await expect(ada.locator('.toast')).toHaveText('Bo joined.')
})

test('a connection that fails says so on both phones, and both can try again', async ({
  browser,
}) => {
  test.setTimeout(120_000)
  const ada = await phone(browser, 'Ada')
  const bo = await phone(browser, 'Bo')
  await ada.getByRole('button', { name: 'Open a table' }).click()
  await ada.getByRole('button', { name: 'Add player' }).click()
  const modal = ada.locator('.modal')
  const stale = await ownCode(modal)
  // The host gives up on this invitation, but its code has already been sent.
  await modal.getByRole('button', { name: 'Cancel' }).click()

  await bo.getByRole('button', { name: 'Join a table' }).click()
  const join = bo.locator('.join')
  await pasteCode(join, stale)
  const answer = await ownCode(join)
  await expect(join.locator('.status')).toContainText('The connection failed', {
    timeout: 45_000,
  })

  // The host takes the answer to the invitation it gave up: that fails too, and says so.
  await ada.getByRole('button', { name: 'Add player' }).click()
  await pasteCode(modal, answer)
  await expect(modal.locator('.status')).toContainText(/Connecting|did not answer|failed/)
  await expect(modal.locator('.status')).toContainText(/did not answer|failed/, {
    timeout: 45_000,
  })
  await modal.getByRole('button', { name: 'Try again' }).click()
  const offer = await ownCode(ada.locator('.modal'))
  expect(offer).not.toBe(stale)

  await join.getByRole('button', { name: 'Try again' }).click()
  await pasteCode(bo.locator('.join'), offer)
  await pasteCode(ada.locator('.modal'), await ownCode(bo.locator('.join')))
  await expect(ada.locator('.toast')).toHaveText('Bo joined.')
})

test('copying a code says whether it worked', async ({ browser }) => {
  const ada = await phone(browser, 'Ada')
  await ada.context().grantPermissions(['camera', 'clipboard-read', 'clipboard-write'])
  await ada.getByRole('button', { name: 'Open a table' }).click()
  await ada.getByRole('button', { name: 'Add player' }).click()
  const modal = ada.locator('.modal')
  const offer = await ownCode(modal)
  await modal.locator('summary').click()
  await modal.getByRole('button', { name: 'Copy' }).click()
  await expect(ada.locator('.toast')).toHaveText('Copied.')
  expect(await ada.evaluate(() => navigator.clipboard.readText())).toBe(offer)

  // Without the clipboard, the page copies the old way, or asks the player to.
  const bo = await phone(browser, 'Bo')
  await bo.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined })
  })
  await bo.reload()
  await bo.getByRole('button', { name: 'Open a table' }).click()
  await bo.getByRole('button', { name: 'Add player' }).click()
  const other = bo.locator('.modal')
  await ownCode(other)
  await other.locator('summary').click()
  await other.getByRole('button', { name: 'Copy' }).click()
  await expect(bo.locator('.toast')).toHaveText(/^(Copied\.|Copying did not work.*)$/)
})
