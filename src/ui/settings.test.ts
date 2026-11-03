// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// On the website: the app's side stays out.
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
  registerPlugin: () => ({}),
}))

const { setLanguage } = await import('../i18n')
const { settings } = await import('../storage')
const { APP_RELEASE, settingsScreen } = await import('./settings')
const { watchForWebUpdates, webUpdateBanner } = await import('./webUpdates')

const newer = { version: '0.1.0', commit: 'fedcba9', time: '2099-01-01T00:00:00.000Z' }
const settle = () => vi.advanceTimersByTimeAsync(0)
const screen = () => document.querySelector<HTMLElement>('.settings')
const toggle = () => screen()?.querySelector<HTMLInputElement>('.web-updates input')
const status = () => screen()?.querySelector('.web-updates .status')?.textContent
function button(name: string): HTMLButtonElement {
  const found = [...document.querySelectorAll('button')].find(
    (b) => b.textContent === name && !b.hidden,
  )
  if (!found) throw new Error(`no visible button "${name}"`)
  return found
}

let deployed: unknown = newer
const fetch = vi.fn(async () => ({ ok: true, json: async () => deployed }))

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv('DEV', false)
  vi.stubGlobal('fetch', fetch)
  fetch.mockClear()
  deployed = newer
  setLanguage('en')
  localStorage.clear()
  document.body.replaceChildren(Object.assign(document.createElement('div'), { id: 'app' }))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('the settings on the website', () => {
  it('look for a newer build only once the player switches it on', async () => {
    watchForWebUpdates()
    await settle()
    expect(fetch).not.toHaveBeenCalled()

    const back = vi.fn()
    settingsScreen(back)
    expect(toggle()?.checked).toBe(false)
    toggle()?.click()
    expect(settings().webUpdates).toBe(true)
    await settle()
    expect(fetch).toHaveBeenCalledOnce()
    // Found: the start screen says so.
    expect(webUpdateBanner().hidden).toBe(false)

    button('←').click()
    expect(back).toHaveBeenCalledOnce()
  })

  it('look now, whatever the switch says, and offer to load a newer build', async () => {
    deployed = { ...newer, commit: __BUILD__.commit, time: __BUILD__.time }
    settingsScreen(() => {})
    button('Look for a new version now').click()
    await settle()
    expect(status()).toBe('This is the newest version.')
    expect(() => button('Load it')).toThrow()

    deployed = 'broken'
    button('Look for a new version now').click()
    await settle()
    expect(status()).toBe('Could not look for a new version. Is there internet?')

    deployed = newer
    button('Look for a new version now').click()
    await settle()
    expect(status()).toBe('A new version of the Spielekiste is out.')
    const reload = vi.fn()
    vi.stubGlobal('location', { reload })
    button('Load it').click()
    expect(reload).toHaveBeenCalledOnce()
    expect(settings().webUpdates).toBe(false)
  })

  it('lead to the Android app', () => {
    settingsScreen(() => {})
    const link = screen()?.querySelector<HTMLAnchorElement>('.app-link a')
    expect(link?.href).toBe(APP_RELEASE)
    expect(link?.textContent).toBe('Get the Spielekiste as an Android app')
  })
})
