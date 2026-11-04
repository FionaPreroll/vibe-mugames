import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearLog, logLines } from './log'
import { keepOffline, loadNewer, WAIT_MS, type Workers } from './offline'

/** A stand-in for a service worker, which can change its state. */
class FakeWorker extends EventTarget {
  state: ServiceWorkerState = 'installing'
  readonly postMessage = vi.fn()
  become(state: ServiceWorkerState) {
    this.state = state
    this.dispatchEvent(new Event('statechange'))
  }
}

/** A stand-in for `navigator.serviceWorker` with one registration. */
function fakeWorkers(found: { waiting?: FakeWorker; installing?: FakeWorker } = {}) {
  const registration = Object.assign(new EventTarget(), {
    active: null as FakeWorker | null,
    waiting: null as FakeWorker | null,
    installing: null as FakeWorker | null,
    update: vi.fn(async () => {
      registration.waiting = found.waiting ?? null
      registration.installing = found.installing ?? null
    }),
  })
  const container = Object.assign(new EventTarget(), {
    register: vi.fn(async () => registration),
    getRegistration: vi.fn(async () => registration),
  })
  return { registration, workers: container as unknown as Workers, container }
}

describe('keepOffline', () => {
  beforeEach(() => clearLog())

  it('registers the worker beside the page, and logs what happened', async () => {
    const { workers, container, registration } = fakeWorkers()
    await keepOffline(workers)
    expect(container.register).toHaveBeenCalledWith('./sw.js')
    expect(logLines().at(-1)).toContain('keeping an offline copy')
  })

  it('lets a new version take over as soon as it is kept, for the next start', async () => {
    const { workers, registration } = fakeWorkers()
    await keepOffline(workers)
    const installing = new FakeWorker()
    registration.installing = installing
    registration.dispatchEvent(new Event('updatefound'))
    expect(logLines().at(-1)).toContain('new version found')
    installing.become('installing')
    expect(installing.postMessage).not.toHaveBeenCalled()
    installing.become('installed')
    expect(installing.postMessage).toHaveBeenCalledWith('skipWaiting')
  })

  it('does nothing where the browser has no service workers, or refuses', async () => {
    await expect(keepOffline(undefined)).resolves.toBeUndefined()
    const { workers, container } = fakeWorkers()
    container.register.mockRejectedValueOnce(new DOMException('no', 'SecurityError'))
    await keepOffline(workers)
    expect(logLines().at(-1)).toContain('no offline copy: SecurityError')
  })
})

describe('loadNewer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('lets a waiting build take over, then loads the page anew', async () => {
    const waiting = new FakeWorker()
    waiting.state = 'installed'
    const { workers, container, registration } = fakeWorkers({ waiting })
    const reload = vi.fn()
    const loading = loadNewer(workers, reload)
    await vi.waitFor(() => expect(waiting.postMessage).toHaveBeenCalledWith('skipWaiting'))
    expect(registration.update).toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
    container.dispatchEvent(new Event('controllerchange'))
    await loading
    expect(reload).toHaveBeenCalledOnce()
  })

  it('waits for a build still being kept', async () => {
    const installing = new FakeWorker()
    const { workers, container } = fakeWorkers({ installing })
    const reload = vi.fn()
    const loading = loadNewer(workers, reload)
    await vi.advanceTimersByTimeAsync(WAIT_MS / 2)
    expect(installing.postMessage).not.toHaveBeenCalled()
    installing.become('installed')
    await vi.waitFor(() => expect(installing.postMessage).toHaveBeenCalledWith('skipWaiting'))
    container.dispatchEvent(new Event('controllerchange'))
    await loading
    expect(reload).toHaveBeenCalledOnce()
  })

  it('loads anew without waiting when there is no new build, or it failed', async () => {
    const reload = vi.fn()
    await loadNewer(fakeWorkers().workers, reload)
    const installing = new FakeWorker()
    const loading = loadNewer(fakeWorkers({ installing }).workers, reload)
    await vi.advanceTimersByTimeAsync(0)
    installing.become('redundant')
    await loading
    await loadNewer(undefined, reload)
    expect(reload).toHaveBeenCalledTimes(3)
  })

  it('loads anew after a while if the new build never takes over, or offline', async () => {
    const reload = vi.fn()
    const installing = new FakeWorker()
    const slow = loadNewer(fakeWorkers({ installing }).workers, reload)
    await vi.advanceTimersByTimeAsync(WAIT_MS)
    await slow
    expect(reload).toHaveBeenCalledOnce()

    const waiting = new FakeWorker()
    const stuck = loadNewer(fakeWorkers({ waiting }).workers, reload)
    await vi.advanceTimersByTimeAsync(WAIT_MS)
    await stuck
    expect(waiting.postMessage).toHaveBeenCalledWith('skipWaiting')
    expect(reload).toHaveBeenCalledTimes(2)

    const { workers, registration } = fakeWorkers()
    registration.update.mockRejectedValueOnce(new TypeError('offline'))
    await loadNewer(workers, reload)
    const broken = fakeWorkers()
    broken.container.getRegistration.mockRejectedValueOnce(new Error('gone'))
    await loadNewer(broken.workers, reload)
    expect(reload).toHaveBeenCalledTimes(4)
  })
})
