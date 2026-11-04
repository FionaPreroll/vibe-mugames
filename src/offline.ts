import { log } from './log'

/**
 * The website's offline copy: a service worker (tools/serviceWorker.ts, written by the build as
 * `sw.js`) keeps every file of the build, so that the Spielekiste also starts without internet,
 * on a hotspot, and can be installed from the browser. The app has its files inside and needs
 * none (see src/main.ts).
 *
 * A new build reaches the player at the next start: the browser looks for a new `sw.js` whenever
 * the page opens, and the new worker keeps the new build and takes over as soon as it has it. The
 * open page goes on with the build it started with, never loaded anew by itself, as that would end
 * a table; it needs none of its files any more, as the website loads all of its code at the start
 * (only the app's Android plugins are chunks of their own). _Load it_ on the start screen loads
 * the new build at once, with `loadNewer`.
 */

/** What this file needs of the browser's service workers: `navigator.serviceWorker`. */
export type Workers = Pick<ServiceWorkerContainer, 'register' | 'getRegistration'> &
  Pick<EventTarget, 'addEventListener' | 'removeEventListener'>

/** How long `loadNewer` waits for the new build to be kept, and then to take over. */
export const WAIT_MS = 10_000

function browserWorkers(): Workers | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.serviceWorker
}

/** Keeps the website for offline use, where the browser can; quietly does nothing elsewhere. */
export async function keepOffline(workers: Workers | undefined = browserWorkers()): Promise<void> {
  if (!workers) return
  try {
    const registration = await workers.register('./sw.js')
    log('offline', registration.active ? 'offline copy in use' : 'keeping an offline copy')
    registration.addEventListener('updatefound', () => {
      log('offline', 'new version found')
      const worker = registration.installing
      worker?.addEventListener('statechange', () => {
        if (worker.state !== 'installed') return
        log('offline', 'new version kept for the next start')
        worker.postMessage('skipWaiting')
      })
    })
  } catch (error) {
    log('offline', `no offline copy: ${error instanceof Error ? error.name : 'failed'}`)
  }
}

/**
 * Loads the newest build: asks the browser to look for it, waits until it is kept and has taken
 * over, then loads the page anew. Without a service worker, offline, or if that takes too long,
 * it loads the page anew at once. Only for the start screen, as loading anew ends a table.
 */
export async function loadNewer(
  workers: Workers | undefined = browserWorkers(),
  reload: () => void = () => location.reload(),
  waitMs = WAIT_MS,
): Promise<void> {
  try {
    const registration = await workers?.getRegistration()
    if (workers && registration) {
      await registration.update().catch(() => {})
      const waiting = await installed(registration, waitMs)
      if (waiting) await takeOver(workers, waiting, waitMs)
    }
  } catch {
    // Load anew anyway: at worst the same build again.
  }
  reload()
}

/** The new worker once it is installed, or undefined if there is none or it failed. */
function installed(
  registration: ServiceWorkerRegistration,
  waitMs: number,
): Promise<ServiceWorker | undefined> {
  if (registration.waiting) return Promise.resolve(registration.waiting)
  const installing = registration.installing
  if (!installing) return Promise.resolve(undefined)
  return new Promise((resolve) => {
    const done = (worker: ServiceWorker | undefined) => {
      clearTimeout(timer)
      installing.removeEventListener('statechange', changed)
      resolve(worker)
    }
    const changed = () => {
      if (installing.state === 'installed') done(installing)
      else if (installing.state === 'redundant') done(undefined)
    }
    const timer = setTimeout(() => done(undefined), waitMs)
    installing.addEventListener('statechange', changed)
  })
}

/** Asks a waiting worker to take over, and waits until it has, or a while. */
function takeOver(workers: Workers, waiting: ServiceWorker, waitMs: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer)
      workers.removeEventListener('controllerchange', done)
      resolve()
    }
    const timer = setTimeout(done, waitMs)
    workers.addEventListener('controllerchange', done)
    waiting.postMessage('skipWaiting')
  })
}
