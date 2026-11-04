// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }))

const { setLanguage } = await import('../i18n')
const { foundNewer, webUpdateBanner } = await import('./webUpdates')

describe('the website’s note about a newer build', () => {
  it('stays hidden until a newer build is found, then offers to load it', async () => {
    setLanguage('en')
    const banner = webUpdateBanner()
    document.body.append(banner)
    expect(banner.hidden).toBe(true)

    foundNewer({ version: '0.1.0', commit: 'bbbbbbb', time: '2026-11-02T10:00:00.000Z' })
    expect(banner.hidden).toBe(false)
    expect(banner.textContent).toContain('A new version of the Spielekiste is out.')
    // The start screen drawn again shows it at once.
    expect(webUpdateBanner().hidden).toBe(false)

    const reload = vi.fn()
    vi.stubGlobal('location', { reload })
    banner.querySelector('button')?.click()
    // Once the browser had its say about a newer service worker: here it has none.
    await vi.waitFor(() => expect(reload).toHaveBeenCalledOnce())
    vi.unstubAllGlobals()
  })
})
