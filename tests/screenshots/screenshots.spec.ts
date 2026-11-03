import { qrSvg } from '@fionapreroll/p2p/qr'
import { type Browser, type BrowserContextOptions, expect, type Page, test } from '@playwright/test'
import { seat } from '../e2e/helpers'

/**
 * The README's screenshots: the games and features as players see them, on a phone and on a
 * laptop. Every page draws its luck from the same seed and runs on a clock of its own, so the
 * same code gives the same pictures, and a picture changes only when the screen does.
 */

// The size of a common Android phone, as a browser there lays the page out.
const PHONE: BrowserContextOptions = {
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
}
const LAPTOP: BrowserContextOptions = { viewport: { width: 1280, height: 800 } }

/** Numbers from a seed, the same on every run: mulberry32. */
function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let x = state
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 2 ** 32
  }
}

/** A phone or a laptop, with the player's name given, its luck seeded and its clock fixed. */
async function device(
  browser: Browser,
  options: BrowserContextOptions,
  name = 'Ada',
  seed = 1,
  clock = true,
): Promise<Page> {
  const context = await browser.newContext({ locale: 'en-US', ...options })
  await context.addInitScript((seed) => {
    let state = seed >>> 0
    const next = () => {
      state = (state + 0x6d2b79f5) >>> 0
      let x = state
      x = Math.imul(x ^ (x >>> 15), x | 1)
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
      return (x ^ (x >>> 14)) >>> 0
    }
    Crypto.prototype.getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
      if (
        array instanceof Uint8Array ||
        array instanceof Uint16Array ||
        array instanceof Uint32Array
      ) {
        for (let i = 0; i < array.length; i++) array[i] = next()
      }
      return array
    }
    Math.random = () => next() / 2 ** 32
  }, seed)
  const page = await context.newPage()
  if (clock) await page.clock.install({ time: new Date('2026-11-01T18:00:00Z') })
  await page.goto('./')
  await page.getByLabel('Your name').fill(name)
  await page.getByLabel('Your name').blur()
  return page
}

/** From the start screen to the table on this device, as in tests/e2e/local.spec.ts. */
async function local(page: Page, names: string[], split = false): Promise<void> {
  await page.getByRole('button', { name: 'Play on this device' }).click()
  await page
    .getByRole('group', { name: 'Players' })
    .getByRole('button', { name: String(names.length), exact: true })
    .click()
  for (const [i, name] of names.entries()) {
    await page.getByLabel(`Name of player ${i + 1}`).fill(name)
  }
  await page.getByLabel(split ? 'Split screen' : 'One screen, taking turns').check()
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.locator('.status.turn').first()).toBeVisible()
}

/** Clicks one of the board's cells that can be clicked, chosen by the seed, a number of times. */
async function play(page: Page, clicks: number, seed = 7): Promise<void> {
  const pick = seeded(seed)
  for (let i = 0; i < clicks; i++) {
    const cells = page.locator('.board .cell:enabled')
    const count = await cells.count()
    if (count === 0) return
    await cells.nth(Math.floor(pick() * count)).click()
  }
}

/** Holds keys down for a while of the page's clock, as a player steering a game in real time. */
async function steer(page: Page, keys: string[], ms: number): Promise<void> {
  for (const key of keys) await page.keyboard.down(key)
  await page.clock.runFor(ms)
  for (const key of keys) await page.keyboard.up(key)
}

type Clip = NonNullable<Parameters<Page['screenshot']>[0]>['clip']

async function shot(
  page: Page,
  name: string,
  options: { clip?: Clip; maxDiffPixelRatio?: number } = {},
) {
  await expect(page).toHaveScreenshot(`${name}.png`, options)
}

/** A moment after any page here starts, for games in real time to stand still at. */
const PAUSE = new Date('2026-11-01T18:30:00Z')

const NAMES = ['Ada', 'Bo', 'Cy', 'Di', 'Ed', 'Flo']

test('start screen', async ({ browser }) => {
  const page = await device(browser, PHONE)
  await shot(page, 'home')
})

test('game chooser', async ({ browser }) => {
  const page = await device(browser, LAPTOP)
  await local(page, NAMES.slice(0, 2))
  await shot(page, 'chooser')
})

test('rules', async ({ browser }) => {
  const page = await device(browser, PHONE)
  await local(page, NAMES.slice(0, 2))
  await page
    .getByRole('group', { name: 'Nine Men’s Morris' })
    .getByRole('button', { name: 'Rules' })
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await shot(page, 'rules')
})

test('Nine Men’s Morris', async ({ browser }) => {
  const page = await device(browser, PHONE)
  await local(page, NAMES.slice(0, 2))
  await page.getByRole('button', { name: 'Nine Men’s Morris' }).click()
  await play(page, 15)
  await shot(page, 'muehle')
})

test('Draughts', async ({ browser }) => {
  const page = await device(browser, PHONE)
  await local(page, NAMES.slice(0, 2))
  await page.getByRole('button', { name: 'Draughts' }).click()
  await play(page, 60)
  await shot(page, 'dame')
})

test('Reversi', async ({ browser }) => {
  const page = await device(browser, PHONE)
  await local(page, NAMES.slice(0, 2))
  await page.getByRole('button', { name: 'Reversi' }).click()
  await play(page, 18)
  await shot(page, 'reversi')
})

test('Ludo', async ({ browser }) => {
  const page = await device(browser, PHONE)
  await local(page, NAMES.slice(0, 4))
  await page.getByRole('button', { name: 'Ludo' }).click()
  for (let i = 0; i < 80; i++) {
    if (await page.locator('.die.can').count()) await page.locator('.die.can').click()
    else if (await page.locator('.cell.can').count()) {
      await page.locator('.cell.can').first().click()
      await page.locator('.cell.target').first().click()
    }
  }
  await shot(page, 'ludo')
})

test('Chinese Checkers', async ({ browser }) => {
  const page = await device(browser, LAPTOP)
  await local(page, NAMES.slice(0, 6))
  await page.getByRole('button', { name: 'Chinese Checkers' }).click()
  await play(page, 40)
  await shot(page, 'sternhalma')
})

test('Miau-Miau on a split screen', async ({ browser }) => {
  const page = await device(browser, LAPTOP)
  await local(page, NAMES.slice(0, 4), true)
  await page.getByRole('button', { name: 'Miau-Miau' }).click()
  await expect(page.locator('.pane')).toHaveCount(4)
  await shot(page, 'miaumiau-split')
})

test('Sea Battle', async ({ browser }) => {
  const page = await device(browser, PHONE)
  await local(page, NAMES.slice(0, 2))
  await page.getByRole('button', { name: 'Sea Battle' }).click()
  for (const [name, next] of [
    ['Ada', 'Bo'],
    ['Bo', 'Ada'],
  ]) {
    await page.getByRole('button', { name: `I am ${name}: show my sea` }).click()
    await page.getByRole('button', { name: 'Ready' }).click()
    await page.getByRole('button', { name: `Done: hand over to ${next}` }).click()
  }
  // Each shoots until a miss, twice round, at squares the seed picks.
  const pick = seeded(3)
  for (const [name, next] of [
    ['Ada', 'Bo'],
    ['Bo', 'Ada'],
    ['Ada', 'Bo'],
    ['Bo', 'Ada'],
  ]) {
    await page.getByRole('button', { name: `I am ${name}: show my sea` }).click()
    const over = page.getByRole('button', { name: `Done: hand over to ${next}` })
    while (!(await over.isVisible())) {
      const free = page.locator('.sea.target [data-cell]:enabled')
      await free.nth(Math.floor(pick() * (await free.count()))).click()
    }
    await over.click()
  }
  await page.getByRole('button', { name: 'I am Ada: show my sea' }).click()
  await shot(page, 'seeschlacht')
})

test('Mäxchen', async ({ browser }) => {
  const page = await device(browser, PHONE)
  await local(page, NAMES.slice(0, 3))
  await page.getByRole('button', { name: 'Mäxchen' }).click()
  await page.getByRole('button', { name: 'I am Ada: show my turn' }).click()
  await page.getByRole('button', { name: 'Roll', exact: true }).click()
  await expect(page.locator('.cup.open')).toBeVisible()
  await shot(page, 'maexchen')
})

test('Werewolf', async ({ browser }) => {
  const page = await device(browser, PHONE)
  await local(page, NAMES.slice(0, 5))
  await page.getByRole('button', { name: /^Werewolf/ }).click()
  await page.getByRole('button', { name: 'I am Ada: show my role' }).click()
  await shot(page, 'werwolf')
})

test('Light Racers', async ({ browser }) => {
  const page = await device(browser, LAPTOP)
  await local(page, NAMES.slice(0, 4), true)
  // The game's time stands still between the steps below, which move it on.
  await page.clock.pauseAt(PAUSE)
  await page.getByRole('button', { name: 'Light Racers' }).click()
  // The countdown, then everyone rides a little, turns away from the others, and back.
  await page.clock.runFor(3500)
  await steer(page, ['KeyW', 'ArrowUp', 'KeyK', 'Numpad5'], 100)
  await page.clock.runFor(200)
  await steer(page, ['KeyD', 'Numpad4'], 100)
  await page.clock.runFor(300)
  await steer(page, ['KeyL', 'ArrowLeft'], 100)
  await page.clock.runFor(500)
  await shot(page, 'lichtrenner')
})

test('Air Hockey', async ({ browser }) => {
  const page = await device(browser, LAPTOP)
  await local(page, NAMES.slice(0, 2), true)
  // The game's time stands still between the steps below, which move it on.
  await page.clock.pauseAt(PAUSE)
  await page.getByRole('button', { name: 'Air Hockey' }).click()
  // The countdown, then Ada's mallet shoots the puck on, and Bo's moves over.
  await page.clock.runFor(3500)
  await steer(page, ['KeyW', 'ArrowLeft'], 800)
  await shot(page, 'airhockey')
})

test('adding a player', async ({ browser }) => {
  const host = await device(browser, PHONE)
  await host.getByRole('button', { name: 'Open a table' }).click()
  await host.getByRole('button', { name: 'Add player' }).click()
  const modal = host.locator('.modal')
  await expect(modal.locator('.own-code')).toHaveValue(/^P1~/, { timeout: 10_000 })
  // Every code holds new keys and addresses, and its size depends on the machine's network: the
  // picture shows a sample code of a usual size instead, and stops above the camera, whose test
  // picture is no sight for a README.
  const sample = `P1~${'Spielekiste'.repeat(12).slice(0, 120)}`
  await modal.locator('.qr-box').evaluate((box, svg) => {
    const qr = box.querySelector('.qr')
    if (qr) qr.innerHTML = svg
  }, qrSvg(sample))
  const qr = await modal.locator('.qr-box').boundingBox()
  if (!qr) throw new Error('no QR code')
  await shot(host, 'pairing', { clip: { x: 0, y: 0, width: 412, height: qr.y + qr.height + 6 } })
})

test('the connection', async ({ browser }) => {
  // On the real clock, as the connection's numbers come from it.
  const host = await device(browser, PHONE, 'Ada', 1, false)
  const player = await device(browser, PHONE, 'Bo', 2, false)
  await host.getByRole('button', { name: 'Open a table' }).click()
  await seat(host, player)
  await host.getByRole('button', { name: 'Four in a Row' }).click()
  await expect(host.locator('header button.net')).toBeVisible({ timeout: 5000 })
  // A few seconds of pings for the graph.
  await host.waitForTimeout(6000)
  await host.locator('header button.net').click()
  // Its pings and numbers are new every time: only a larger change takes a new picture.
  await shot(host, 'connection', { maxDiffPixelRatio: 0.03 })
})
