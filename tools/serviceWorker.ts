import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import type { Plugin } from 'vite'

/** The worker's own file. Browsers fetch it afresh to look for a new version of the website. */
export const WORKER_FILE = 'sw.js'

/**
 * Files the worker never keeps and always leaves to the network: `version.json` tells an open
 * page of a newer build (src/webUpdates.ts), so it must be the one deployed, never a kept one.
 */
export const NETWORK_ONLY = ['version.json']

/**
 * Adds the service worker to production builds: once the website has loaded, it keeps every
 * file of the build, so the Spielekiste also starts offline, on a hotspot without internet.
 * Started from the page by src/offline.ts; never in the app, which has its files inside.
 * Spark Hunt (FionaPreroll/vibe-p2pgame) has the same worker, with its own name.
 */
export function serviceWorker(): Plugin {
  let outDir = ''
  return {
    name: 'spielekiste-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    // After the build has written everything, public files included.
    closeBundle: {
      order: 'post',
      async handler() {
        await writeServiceWorker(outDir)
      },
    },
  }
}

/**
 * Writes the worker into a finished build, with the list of its files and a version made from
 * their contents, so that every change to the website is a new worker.
 */
export async function writeServiceWorker(folder: string): Promise<void> {
  const files = (await filesIn(folder)).filter(
    (file) => file !== WORKER_FILE && !NETWORK_ONLY.includes(file) && !file.endsWith('.map'),
  )
  const hash = createHash('sha256')
  for (const file of files) hash.update(`${file}\n`).update(await readFile(join(folder, file)))
  await writeFile(join(folder, WORKER_FILE), workerSource(files, hash.digest('hex').slice(0, 16)))
}

/** Every file below a folder, as sorted paths with forward slashes. */
async function filesIn(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { recursive: true, withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(folder, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .sort()
}

/**
 * The worker as plain JavaScript, as browsers run it. Files are relative to the worker, which
 * sits at the top of the website's folder.
 *
 * - Installing keeps every file in a cache named after the worker's scope and the version,
 *   fetched past the browser's HTTP cache so that no file of an older version slips in.
 * - Activating removes older versions of this scope only: on a shared origin such as
 *   github.io, other sites' caches stay. It then takes over pages that are already open.
 * - Requests inside the scope come from the cache, and anything else from the network. A page
 *   load gets its own page, such as privacy.html, or else index.html. `version.json` always
 *   comes from the network. Lookups ignore Vary headers: servers such as Vite's vary on the
 *   Origin header, which the website's own module requests carry and the worker's did not.
 * - A new version waits until the page asks it to take over. The page asks as soon as one has
 *   installed, so the next start runs it, without loading the open page anew, which would end
 *   a table (see src/offline.ts).
 */
export function workerSource(files: readonly string[], version: string): string {
  return `// The Spielekiste's service worker, written by tools/serviceWorker.ts during the build.
const FILES = ${JSON.stringify(files)}
const NETWORK_ONLY = ${JSON.stringify(NETWORK_ONLY)}
const SCOPE = self.registration.scope
const PREFIX = 'spielekiste ' + SCOPE + ' '
const CACHE = PREFIX + ${JSON.stringify(version)}
const INDEX = new URL('index.html', SCOPE).href

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES.map((file) => new Request(file, { cache: 'reload' })))),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || !request.url.startsWith(SCOPE)) return
  if (NETWORK_ONLY.includes(request.url.slice(SCOPE.length).split(/[?#]/)[0])) return
  const navigate = request.mode === 'navigate'
  event.respondWith(
    caches
      .open(CACHE)
      .then((cache) =>
        cache
          .match(request, { ignoreVary: true, ignoreSearch: navigate })
          .then((cached) => cached ?? (navigate ? cache.match(INDEX, { ignoreVary: true }) : cached)),
      )
      .then((cached) => cached ?? fetch(request)),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting()
})
`
}
