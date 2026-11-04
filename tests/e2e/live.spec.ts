import type { Page } from '@playwright/test'
import { expect, test } from './coverage'
import { phone, seat } from './helpers'

/**
 * Games in real time between phones over WebRTC, and on one device: the host runs them, the
 * phones steer by buttons, fingers and keys, and draw what the host sends.
 */

/** Ada opens a table and Bo sits down at it. */
async function table(browser: Parameters<typeof phone>[0]): Promise<[Page, Page]> {
  const ada = await phone(browser, 'Ada')
  const bo = await phone(browser, 'Bo')
  await ada.getByRole('button', { name: 'Open a table' }).click()
  await seat(ada, bo)
  return [ada, bo]
}

test('two phones race at Light Racers: Bo turns into the edge, Ada wins', async ({ browser }) => {
  const [ada, bo] = await table(browser)
  await ada.getByRole('button', { name: 'Light Racers' }).click()
  for (const page of [ada, bo]) {
    await expect(page.getByRole('img', { name: 'Light Racers' })).toBeVisible()
    await expect(page.locator('.status.turn')).toContainText('Turn before you hit a wall')
  }
  // Bo heads left from the right; a right turn takes him up into the top edge, long before
  // Ada, riding right along the middle, reaches the other side.
  await bo.getByRole('button', { name: 'Turn right' }).click()
  await expect(ada.locator('.status.turn')).toHaveText('You win!', { timeout: 10_000 })
  await expect(bo.locator('.status.turn')).toHaveText('Ada wins.')
  await expect(bo.locator('.players li', { hasText: 'Ada' }).locator('.score')).toHaveText('1')

  // Again, with Bo starting from the left now. Nobody turns: they meet in the middle.
  await ada.getByRole('button', { name: 'Play again' }).click()
  await expect(bo.locator('.status.turn')).toContainText('Turn before you hit a wall')
  await expect(ada.locator('.status.turn')).toHaveText('A draw.', { timeout: 10_000 })
})

test('two phones play air hockey: the whole rink, or one half, smoothed', async ({ browser }) => {
  const ada = await phone(browser, 'Ada')
  const bo = await phone(browser, 'Bo')
  // Ada keeps the settings as they come: the whole rink, smoothed by the host's clock. Bo
  // chooses his own half, for phones laid top edge to top edge, drawn as states arrive.
  await bo.getByRole('button', { name: 'Settings' }).click()
  await bo.getByLabel('Show the whole rink').uncheck()
  await expect(bo.getByLabel('Smooth out the network')).toBeChecked()
  await bo.getByLabel('Smooth out the network').uncheck()
  await bo.getByRole('button', { name: 'Back' }).click()
  const errors: Error[] = []
  for (const page of [ada, bo]) page.on('pageerror', (error) => errors.push(error))
  await ada.getByRole('button', { name: 'Open a table' }).click()
  await seat(ada, bo)
  await ada.getByRole('button', { name: 'Air Hockey' }).click()
  // Each player's rink covers their screen, with the goals, their own first.
  await expect(ada.locator('.live.rink.arena')).toBeVisible()
  await expect(bo.locator('.live.rink.arena')).toBeVisible()
  await expect(ada.locator('.rink-score')).toHaveText('Ada 0 : 0 Bo · First to 7 goals wins.')
  await expect(bo.locator('.rink-score')).toHaveText('Bo 0 : 0 Ada · First to 7 goals wins.')
  await expect(ada.locator('.rink-help')).toContainText('Your goal is at the bottom')
  await expect(bo.locator('.rink-help')).toContainText('top edge to top edge')
  // The rink covers the top line, so the ping's small graph shows beside the score.
  for (const page of [ada, bo]) {
    await expect(page.locator('.rink-bar .net')).toBeVisible({ timeout: 5000 })
  }

  // After the countdown, Bo's finger sweeps his mallet up through the puck in the middle,
  // at the top of his screen, and Ada's drags hers about.
  await bo.waitForTimeout(3200)
  for (const [page, from, to] of [
    [bo, 0.8, 0.02],
    [ada, 0.6, 0.4],
  ] as const) {
    const box = await page.getByRole('img', { name: 'Air Hockey' }).boundingBox()
    if (!box) throw new Error('no rink')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * from)
    await page.mouse.down()
    for (let step = 0; step <= 12; step++) {
      const y = from + ((to - from) * step) / 12
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * y)
      await page.waitForTimeout(20)
    }
    await page.mouse.up()
  }
  // Keys move a mallet too.
  await ada.keyboard.down('ArrowLeft')
  await ada.waitForTimeout(300)
  await ada.keyboard.up('ArrowLeft')

  // The host stops the game: back to the lobby, on both phones.
  await ada.getByRole('button', { name: 'Stop the game' }).click()
  await expect(ada.locator('.live')).toHaveCount(0)
  await expect(ada.locator('.status.turn')).toHaveText('Choose a game')
  await expect(bo.locator('.main')).toContainText('Ada chooses a game.')
  expect(errors).toEqual([])
})

test('a third phone watches the whole rink and the race', async ({ browser }) => {
  const [ada, bo] = await table(browser)
  const cy = await phone(browser, 'Cy')
  await seat(ada, cy)
  await ada.getByRole('button', { name: 'Air Hockey' }).click()
  await expect(cy.locator('.status.turn')).toHaveText('You are watching: Ada against Bo.')
  await expect(cy.locator('.live.rink')).not.toHaveClass(/arena/)
  await ada.getByRole('button', { name: 'Stop the game' }).click()
  // All three ride in Light Racers.
  await ada.getByRole('button', { name: 'Light Racers' }).click()
  for (const page of [ada, bo, cy]) {
    await expect(page.getByRole('button', { name: 'Turn left' })).toBeVisible()
  }
  await cy.getByRole('img', { name: 'Light Racers' }).hover()
  await cy.mouse.down()
  await cy.mouse.move(10, 10, { steps: 5 })
  await cy.mouse.up()
  await expect(ada.locator('.status.turn')).toHaveText(/wins|draw/, { timeout: 15_000 })
})

test('two race on one keyboard, and play air hockey on a split screen', async ({ browser }) => {
  const page = await phone(browser, 'Ada')
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.getByRole('button', { name: 'Play on this device' }).click()
  await page.getByLabel('Name of player 2').fill('Bo')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: 'Light Racers' }).click()
  await expect(page.locator('.turns-name')).toHaveText(['● Ada: W A S D', '● Bo: arrow keys'])
  // Ada heads up into the top edge, long before Bo, who turns right and back left, rides
  // along the middle to where she started.
  await page.keyboard.press('KeyW')
  await page.getByRole('button', { name: 'Bo: turn right' }).click()
  await page.getByRole('button', { name: 'Bo: turn left' }).click()
  await expect(page.locator('.status.turn')).toHaveText('Bo wins.', { timeout: 10_000 })

  await page.getByRole('button', { name: 'Stop playing' }).click()
  await page.getByLabel('Split screen').check()
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: 'Air Hockey' }).click()
  const ada = page.getByRole('region', { name: 'Ada' })
  const bo = page.getByRole('region', { name: 'Bo' })
  await expect(ada.locator('.rink-score')).toHaveText('Ada 0 : 0 Bo · First to 7 goals wins.')
  await expect(bo.locator('.rink-help')).toHaveText('Bo: arrow keys')
  // Bo sits across: his part turns round, and his finger still moves his own mallet.
  await page.getByRole('button', { name: 'Turn Bo’s side around' }).click()
  const box = await bo.getByRole('img', { name: 'Air Hockey' }).boundingBox()
  if (!box) throw new Error('no rink')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 3, box.y + box.height / 3, { steps: 5 })
  await page.mouse.up()
  await page.keyboard.down('KeyW')
  await page.waitForTimeout(500)
  await page.keyboard.up('KeyW')
  await expect(ada.locator('.rink-score')).toHaveText(/^Ada \d : \d Bo/)
})
