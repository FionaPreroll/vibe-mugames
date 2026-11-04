import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { extname, join, normalize } from 'node:path'
import type { Page } from '@playwright/test'
import { writeServiceWorker } from '../../tools/serviceWorker.ts'
import { expect, test } from './coverage'

/**
 * The website as an installable app: the built page keeps itself with its service worker, opens
 * offline, and takes a new build at the next start or through _Load it_, never at a table.
 *
 * Each test serves its own copy of the build under a folder, as GitHub Pages does, so that it can
 * deploy a "new build" into it: the same files, with a mark in index.html and a newer
 * version.json, and the worker written anew for them.
 */

test.use({ serviceWorkers: 'allow', locale: 'en-US' })

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
}

interface Site {
  readonly url: string
  /** Deploys a new build: index.html carries `build` in a meta tag, version.json is newer. */
  deploy(build: number): Promise<void>
  close(): Promise<void>
}

async function serve(): Promise<Site> {
  const folder = await mkdtemp(join(tmpdir(), 'spielekiste-site-'))
  await cp('dist', folder, { recursive: true })
  const server: Server = createServer(async (request, response) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname
    if (!path.startsWith('/spielekiste/')) {
      response.writeHead(404).end()
      return
    }
    const file = normalize(path.slice('/spielekiste/'.length) || 'index.html')
    try {
      const body = await readFile(join(folder, file.endsWith('/') ? `${file}index.html` : file))
      response
        .writeHead(200, {
          'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
          'cache-control': 'max-age=600',
        })
        .end(body)
    } catch {
      response.writeHead(404).end()
    }
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  const original = await readFile(join(folder, 'index.html'), 'utf8')
  return {
    url: `http://localhost:${port}/spielekiste/`,
    async deploy(build) {
      await writeFile(
        join(folder, 'index.html'),
        original.replace('<title>', `<meta name="build" content="${build}" />\n    <title>`),
      )
      const own = JSON.parse(await readFile(join(folder, 'version.json'), 'utf8'))
      await writeFile(
        join(folder, 'version.json'),
        JSON.stringify({ version: own.version, commit: `${build}`.repeat(7), time: '2099-01-01' }),
      )
      await writeServiceWorker(folder)
    },
    async close() {
      server.closeAllConnections()
      await new Promise((resolve) => server.close(resolve))
      await rm(folder, { recursive: true, force: true })
    },
  }
}

let site: Site
test.beforeEach(async () => {
  site = await serve()
})
test.afterEach(async () => {
  await site.close()
})

/** Opens the site and waits until its worker has kept the build and serves the page. */
async function open(page: Page): Promise<void> {
  await page.goto(site.url)
  await expect(page.getByRole('button', { name: 'Open a table' })).toBeVisible()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (navigator.serviceWorker.controller) return
    await new Promise((resolve) =>
      navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }),
    )
  })
}

/** The mark of a deployed build in the page; none on the first build. */
const mark = (page: Page) => page.locator('meta[name="build"]')

/** Has the browser look for a new worker now, as it does at every start, and waits for it. */
async function lookForNewWorker(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    const changed = new Promise((resolve) =>
      navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }),
    )
    await registration.update()
    await changed
  })
}

test('the website can be installed, and opens offline after one visit', async ({ page }) => {
  await open(page)

  // What Chrome needs to offer installing it: a manifest with icons, and a service worker.
  const cdp = await page.context().newCDPSession(page)
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors')
  expect(installabilityErrors).toEqual([])
  const manifest = await (await page.request.get(`${site.url}manifest.webmanifest`)).json()
  expect(manifest).toMatchObject({ name: 'Spielekiste', display: 'standalone', start_url: './' })
  expect(manifest.orientation).toBeUndefined()
  for (const icon of manifest.icons) {
    expect((await page.request.get(`${site.url}${icon.src}`)).ok(), icon.src).toBe(true)
  }

  await page.context().setOffline(true)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Open a table' })).toBeVisible()
  await page.getByRole('button', { name: 'Play on this device' }).click()
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible()
  // The privacy policy's own page too, as the stores link it.
  await page.goto(`${site.url}privacy.html`)
  await expect(page.getByRole('heading', { name: 'Privacy policy' }).first()).toBeVisible()
})

test('a new build comes at the next start, and never ends a table', async ({ page, context }) => {
  await open(page)
  await expect(mark(page)).toHaveCount(0)

  // At a table on this device when a new build is deployed and found.
  await page.getByRole('button', { name: 'Play on this device' }).click()
  await page.getByLabel('Name of player 1').fill('Ada')
  await page.getByLabel('Name of player 2').fill('Bo')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.locator('.status.turn')).toHaveText('Choose a game')
  await site.deploy(2)
  await lookForNewWorker(page)
  // The table goes on with the build it started with.
  await expect(page.locator('.status.turn')).toHaveText('Choose a game')
  await expect(mark(page)).toHaveCount(0)

  // The next start, offline even, runs the new build.
  await context.setOffline(true)
  const next = await context.newPage()
  await next.goto(site.url)
  await expect(next.getByRole('button', { name: 'Open a table' })).toBeVisible()
  await expect(mark(next)).toHaveAttribute('content', '2')
})

test('Load it on the start screen loads a new build at once', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByLabel('Tell me on the start screen when a new version is out').check()
  await page.getByRole('button', { name: 'Back' }).click()

  await site.deploy(3)
  await page.reload()
  const banner = page.locator('.web-update')
  await expect(banner).toContainText('A new version of the Spielekiste is out.')
  await banner.getByRole('button', { name: 'Load it' }).click()
  await expect(mark(page)).toHaveAttribute('content', '3')
  await expect(page.getByRole('button', { name: 'Open a table' })).toBeVisible()
})
