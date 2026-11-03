// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CHECK_AGAIN_MS,
  CHECK_EVERY_MS,
  checkWebUpdate,
  isNewer,
  lookForWebUpdate,
  parseWebBuild,
  watchWebUpdates,
} from './webUpdates'

const running = { version: '0.1.0', commit: 'aaaaaaa', time: '2026-11-01T10:00:00.000Z' }
const newer = { version: '0.1.0', commit: 'bbbbbbb', time: '2026-11-02T10:00:00.000Z' }

describe('parseWebBuild', () => {
  it('takes a version, a commit hash and a time, and nothing else', () => {
    expect(parseWebBuild(newer)).toEqual(newer)
    expect(parseWebBuild({ ...newer, extra: 1 })).toEqual(newer)
    for (const value of [
      null,
      'x',
      [],
      { ...newer, version: 1 },
      { ...newer, version: 'new' },
      { ...newer, commit: 'unknown' },
      { ...newer, commit: 'BBBBBBB' },
      { ...newer, time: 'yesterday' },
      { ...newer, time: 5 },
      { version: '0.1.0', commit: 'bbbbbbb' },
    ]) {
      expect(parseWebBuild(value)).toBeUndefined()
    }
  })
})

describe('isNewer', () => {
  it('is another commit, built later', () => {
    expect(isNewer(newer, running)).toBe(true)
    expect(isNewer(running, running)).toBe(false)
    // An older build, as a cache in between might serve: not newer.
    expect(isNewer(running, newer)).toBe(false)
    // The same commit built again: nothing new for players.
    expect(isNewer({ ...running, time: newer.time }, running)).toBe(false)
  })
})

describe('checkWebUpdate', () => {
  it('reads version.json beside the page, past the cache', async () => {
    const read = vi.fn(async () => newer)
    expect(await checkWebUpdate(running, read)).toEqual(newer)
    expect(read).toHaveBeenCalledWith(expect.stringMatching(/^\.\/version\.json\?t=\d+$/))
  })

  it('finds nothing in the same build, offline, or in a file that is not sound', async () => {
    expect(await checkWebUpdate(running, async () => running)).toBeNull()
    expect(await checkWebUpdate(running, async () => ({ build: 3 }))).toBeNull()
    expect(
      await checkWebUpdate(running, async () => {
        throw new Error('offline')
      }),
    ).toBeNull()
  })
})

describe('lookForWebUpdate', () => {
  it('tells a newer build, the same one, and a failure apart', async () => {
    expect(await lookForWebUpdate(running, async () => newer)).toEqual({
      kind: 'newer',
      build: newer,
    })
    expect(await lookForWebUpdate(running, async () => running)).toEqual({ kind: 'current' })
    expect(await lookForWebUpdate(running, async () => ({ build: 3 }))).toEqual({ kind: 'failed' })
    expect(
      await lookForWebUpdate(running, async () => {
        throw new Error('offline')
      }),
    ).toEqual({ kind: 'failed' })
  })
})

describe('watchWebUpdates', () => {
  let visibility: DocumentVisibilityState = 'visible'
  const setVisibility = (next: DocumentVisibilityState) => {
    visibility = next
    document.dispatchEvent(new Event('visibilitychange'))
  }

  beforeEach(() => {
    vi.useFakeTimers()
    visibility = 'visible'
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('looks at once, then now and then, and tells of a newer build once', async () => {
    let deployed = running
    const read = vi.fn(async () => deployed)
    const found = vi.fn()
    watchWebUpdates(found, running, read)
    await vi.advanceTimersByTimeAsync(0)
    expect(read).toHaveBeenCalledOnce()
    expect(found).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(CHECK_EVERY_MS)
    expect(read).toHaveBeenCalledTimes(2)
    deployed = newer
    await vi.advanceTimersByTimeAsync(CHECK_EVERY_MS)
    expect(found).toHaveBeenCalledExactlyOnceWith(newer)
    // Found: it stops looking.
    await vi.advanceTimersByTimeAsync(CHECK_EVERY_MS * 3)
    setVisibility('visible')
    expect(read).toHaveBeenCalledTimes(3)
  })

  it('looks when the page comes back to the front, but not in the background', async () => {
    const read = vi.fn(async () => running)
    watchWebUpdates(vi.fn(), running, read)
    await vi.advanceTimersByTimeAsync(0)
    expect(read).toHaveBeenCalledOnce()
    // Back too soon: no need to look again.
    setVisibility('hidden')
    setVisibility('visible')
    expect(read).toHaveBeenCalledOnce()

    setVisibility('hidden')
    await vi.advanceTimersByTimeAsync(CHECK_EVERY_MS)
    expect(read).toHaveBeenCalledOnce()
    setVisibility('visible')
    await vi.advanceTimersByTimeAsync(0)
    expect(read).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(CHECK_AGAIN_MS)
    setVisibility('visible')
    expect(read).toHaveBeenCalledTimes(3)
  })

  it('stops when asked', async () => {
    const read = vi.fn(async () => newer)
    const found = vi.fn()
    const stop = watchWebUpdates(found, running, read)
    stop()
    await vi.advanceTimersByTimeAsync(CHECK_EVERY_MS)
    expect(found).not.toHaveBeenCalled()
  })
})
