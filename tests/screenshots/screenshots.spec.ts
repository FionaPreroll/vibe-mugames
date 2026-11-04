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

const NAMES = ['Ada', 'Bo', 'Cy', 'Di', 'Ed', 'Flo']

test('start screen', async ({ browser }) => {
  const page = await device(browser, PHONE)
  await shot(page, 'home')
})

test('themes', async ({ browser }) => {
  // The page's clock says 1 November: with the seasons, that is still Halloween.
  const page = await device(browser, PHONE)
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('radiogroup', { name: 'Theme' }).getByText('With the seasons').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'halloween')
  await shot(page, 'themes')
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

/**
 * Over the network, the host may hear from the other phone a moment earlier or later, which can
 * move the puck by a few pixels: only a larger change takes a new picture of Air Hockey.
 */
const PUCK_NOISE = 0.005

/**
 * Stops a page's clock where it is now. Every phone at a table stops, so none of them waits for
 * another in vain and gives the connection up; time then moves on by `runFor` alone.
 */
async function freeze(page: Page): Promise<void> {
  await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 10))
}

/** Phones at one table: the first opens it, the others sit down, and the host starts a game. */
async function liveTable(game: string, pages: Page[]): Promise<void> {
  const [host, ...players] = pages
  if (!host) throw new Error('no host')
  await host.getByRole('button', { name: 'Open a table' }).click()
  for (const player of players) await seat(host, player)
  // The host runs the game: its time stands still between the steps that move it on, and the
  // players' phones draw what it sends.
  for (const page of pages) await freeze(page)
  // Forced: with the clock standing still, no animation frame comes to show the button is still.
  await host.getByRole('button', { name: game }).click({ force: true })
}

/** A phone's whole screen, as a picture to put into a phone's frame. */
async function screen(page: Page): Promise<string> {
  // A moment for the page to draw what came last.
  await page.clock.runFor(50)
  const png = await page.screenshot({ animations: 'disabled', caret: 'hide' })
  return `data:image/png;base64,${png.toString('base64')}`
}

/**
 * Phones as on a table: each screen in a generic phone's frame, the frames one above the
 * other, a turned one upside down, as for a player across the table.
 */
async function phones(
  browser: Browser,
  name: string,
  screens: { src: string; turned?: boolean }[],
  maxDiffPixelRatio?: number,
): Promise<void> {
  const context = await browser.newContext({
    viewport: { width: 600, height: 2200 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()
  const { width, height } = PHONE.viewport ?? { width: 412, height: 915 }
  await page.setContent(`<!doctype html>
<style>
  body { margin: 0; background: transparent; }
  .stand { display: inline-flex; flex-direction: column; padding: 8px; }
  .phone {
    position: relative; padding: 14px; border-radius: 58px;
    background: linear-gradient(145deg, #3a3d42, #16181b);
    box-shadow: inset 0 0 0 2px #5b5f66, inset 0 0 0 5px #0b0c0e, 0 6px 18px rgb(0 0 0 / 0.35);
  }
  .phone.turned { transform: rotate(180deg); }
  .phone img { display: block; width: ${width}px; height: ${height}px; border-radius: 44px; }
  .camera {
    position: absolute; top: 26px; left: 50%; width: 14px; height: 14px; margin-left: -7px;
    border-radius: 50%; background: #050608; box-shadow: inset 0 0 0 3px #1c2230;
  }
  .button { position: absolute; width: 4px; border-radius: 2px; background: #2b2e33; }
  .power { right: -4px; top: 210px; height: 90px; }
  .volume { left: -4px; top: 170px; height: 130px; }
</style>
<div class="stand">${screens
    .map(
      (screen) => `<div class="phone${screen.turned ? ' turned' : ''}">
    <img src="${screen.src}"><span class="camera"></span>
    <span class="button power"></span><span class="button volume"></span>
  </div>`,
    )
    .join('')}</div>`)
  await expect(page.locator('.stand')).toHaveScreenshot(`${name}.png`, {
    omitBackground: true,
    maxDiffPixelRatio,
  })
  await context.close()
}

test('Light Racers on a phone', async ({ browser }) => {
  const pages = await Promise.all(
    ['Ada', 'Bo', 'Cy'].map((name, i) => device(browser, PHONE, name, i + 1)),
  )
  await liveTable('Light Racers', pages)
  const [ada] = pages
  if (!ada) throw new Error('no host')
  // The countdown, then Ada rides a little and turns twice; the others ride straight on.
  await ada.clock.runFor(3900)
  await steer(ada, ['ArrowDown'], 100)
  await ada.clock.runFor(400)
  await steer(ada, ['ArrowRight'], 100)
  await ada.clock.runFor(500)
  await phones(browser, 'lichtrenner', [{ src: await screen(ada) }])
})

test('Air Hockey on two phones, top edge to top edge', async ({ browser }) => {
  // Both show their own half alone, for two phones laid on the table, top edge to top edge.
  const pages = await Promise.all(
    ['Ada', 'Bo'].map((name, i) => device(browser, PHONE, name, i + 1)),
  )
  for (const page of pages) {
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByLabel('Show the whole rink').uncheck()
    await page.getByRole('button', { name: 'Back' }).click()
  }
  await liveTable('Air Hockey', pages)
  const [ada, bo] = pages
  if (!ada || !bo) throw new Error('no phones')
  // The countdown, then Ada's mallet shoots the puck over to Bo's phone.
  await ada.clock.runFor(3500)
  await steer(ada, ['ArrowUp'], 800)
  await ada.clock.runFor(250)
  // A moment of real time for the last state to reach Bo's phone.
  await bo.waitForTimeout(500)
  await phones(
    browser,
    'airhockey-table',
    [{ src: await screen(bo), turned: true }, { src: await screen(ada) }],
    PUCK_NOISE,
  )
})

test('Air Hockey on a phone, the whole rink', async ({ browser }) => {
  const pages = await Promise.all(
    ['Ada', 'Bo'].map((name, i) => device(browser, PHONE, name, i + 1)),
  )
  await liveTable('Air Hockey', pages)
  const [ada] = pages
  if (!ada) throw new Error('no host')
  await ada.clock.runFor(3500)
  await steer(ada, ['ArrowUp'], 800)
  await ada.clock.runFor(150)
  await phones(browser, 'airhockey', [{ src: await screen(ada) }], PUCK_NOISE)
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
