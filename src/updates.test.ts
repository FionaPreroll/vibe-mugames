// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const native = vi.hoisted(() => ({ app: true }))
vi.mock('./native', () => ({ isApp: () => native.app }))
vi.mock('@capacitor/core', () => ({ registerPlugin: () => ({}) }))

const { AppUpdates } = await import('@fionapreroll/app-updates')
const { FakeUpdater } = await import('@fionapreroll/app-updates/testing')
const { settings, updateSettings } = await import('./storage')
const { RELEASE, updateOnStart } = await import('./updates')

/** The Spielekiste's updates: the library does the work, with the settings keeping the answer. */

function setup() {
  const fake = new FakeUpdater()
  return { fake, updates: new AppUpdates({ releases: RELEASE, apk: 'spielekiste.apk' }, fake) }
}
const dialogs = (answer: boolean) => ({ ask: vi.fn(async () => answer), offer: vi.fn() })
const release = { build: 7, commit: '0123abc', size: null }

beforeEach(() => {
  native.app = true
  localStorage.clear()
})

describe('updateOnStart', () => {
  it('asks once at the first start, keeps the answer, and looks only if it is yes', async () => {
    const { updates, fake } = setup()
    const first = dialogs(true)
    await updateOnStart(first, updates)
    expect(first.ask).toHaveBeenCalledOnce()
    expect(first.offer).toHaveBeenCalledWith(release)
    expect(fake.calls).toContainEqual({
      method: 'fetchText',
      options: { url: `${RELEASE}version.json` },
    })
    expect(settings()).toMatchObject({ checkUpdates: true, updatesAsked: true })

    const next = dialogs(false)
    await updateOnStart(next, updates)
    expect(next.ask).not.toHaveBeenCalled()
    expect(next.offer).toHaveBeenCalledOnce()
  })

  it('stays off when the player says no, or switches it off', async () => {
    const { updates, fake } = setup()
    await updateOnStart(dialogs(false), updates)
    expect(settings()).toMatchObject({ checkUpdates: false, updatesAsked: true })
    updateSettings({ checkUpdates: false })
    await updateOnStart(dialogs(true), updates)
    expect(fake.count('fetchText')).toBe(0)
  })

  it('does nothing at all in a browser', async () => {
    native.app = false
    const { updates, fake } = setup()
    const web = dialogs(true)
    await updateOnStart(web, updates)
    expect(web.ask).not.toHaveBeenCalled()
    expect(fake.calls).toEqual([])
    expect(settings().updatesAsked).toBe(false)
  })
})
