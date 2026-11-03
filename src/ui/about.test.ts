// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'

let native = false
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => native },
  registerPlugin: () => ({ info: async () => ({ build: 42, name: '42' }) }),
}))

const { setLanguage } = await import('../i18n')
const { aboutScreen, changelogView, CONTACT, parseLicenses } = await import('./about')

const LICENSE = {
  name: 'uqr',
  version: '0.1.3',
  license: 'MIT',
  homepage: 'https://github.com/unjs/uqr',
  text: 'Permission is hereby granted',
}

function open(onBack = () => {}): HTMLElement {
  document.body.innerHTML = '<div id="app"></div>'
  aboutScreen(onBack)
  const app = document.getElementById('app')
  if (!app) throw new Error('no app')
  return app
}

afterEach(() => {
  native = false
  vi.unstubAllGlobals()
})

describe('About the Spielekiste', () => {
  it('shows the build, the contact, the privacy policy, the changelog and the licenses', async () => {
    setLanguage('en')
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify([LICENSE, { name: 1 }])))
    const app = open()
    expect(app.querySelector('h1')?.textContent).toBe('About the Spielekiste')
    expect(app.querySelector('.about-build')?.textContent).toContain(__BUILD__.commit)
    expect(app.querySelector('.about-build')?.textContent).toContain(__BUILD__.time.slice(0, 10))
    expect(app.querySelector(`a[href="mailto:${CONTACT}"]`)?.textContent).toBe(CONTACT)
    expect(app.querySelector('.changelog details[open] summary')?.textContent).toBe('This version')
    await vi.waitFor(() => expect(app.querySelectorAll('.license-list li')).toHaveLength(1))
    expect(app.querySelector('.license-list summary')?.textContent).toBe('uqr 0.1.3 · MIT')
    // The website needs no word on the app's own parts.
    expect(app.textContent).not.toContain('The Android app also contains')
  })

  it('says where the licenses are when the build wrote none, as with pnpm dev', async () => {
    setLanguage('de')
    vi.stubGlobal('fetch', async () => new Response('', { status: 404 }))
    const app = open()
    expect(app.querySelector('h1')?.textContent).toBe('Über die Spielekiste')
    await vi.waitFor(() => expect(app.textContent).toContain('nicht zum Entwicklungsserver'))
  })

  it('in the app, names its build number and its native parts', async () => {
    setLanguage('en')
    native = true
    vi.stubGlobal('fetch', async () => new Response('[]'))
    const app = open()
    await vi.waitFor(() =>
      expect(app.querySelector('.about-build')?.textContent).toContain('app build 42'),
    )
    expect(app.textContent).toContain('Capacitor for Android')
    expect(app.textContent).toContain('Play in the browser')
  })

  it('opens the privacy policy in the player’s language, and comes back', () => {
    setLanguage('de')
    vi.stubGlobal('fetch', async () => new Response('[]'))
    const back = vi.fn()
    const app = open(back)
    app.querySelector<HTMLButtonElement>('button.link')?.click()
    expect(app.querySelector('h1')?.textContent).toBe('Datenschutzerklärung')
    expect(app.querySelector('.document')?.textContent).toContain('Was auf deinem Gerät bleibt')
    app.querySelector<HTMLButtonElement>('header button')?.click()
    expect(app.querySelector('h1')?.textContent).toBe('Über die Spielekiste')
    app.querySelector<HTMLButtonElement>('header button')?.click()
    expect(back).toHaveBeenCalledOnce()
  })
})

describe('changelogView', () => {
  it('puts each version in a section, the newest open, and leaves out an empty one', () => {
    setLanguage('en')
    const view = changelogView(
      [
        '# Changelog',
        '## [Unreleased]',
        '## [0.2.0] - 2026-12-01',
        '### Added',
        '- Something new',
        '## [0.1.0] - 2026-11-01',
        '- The start',
      ].join('\n'),
    )
    const sections = view.querySelectorAll('details')
    expect([...sections].map((s) => s.querySelector('summary')?.textContent)).toEqual([
      '0.2.0 - 2026-12-01',
      '0.1.0 - 2026-11-01',
    ])
    expect(sections[0]?.open).toBe(true)
    expect(sections[1]?.open).toBe(false)
    expect(sections[0]?.querySelector('h4')?.textContent).toBe('Added')
  })
})

describe('parseLicenses', () => {
  it('keeps only entries that fit, and links only to https', () => {
    expect(parseLicenses({})).toBeNull()
    expect(
      parseLicenses([LICENSE, { ...LICENSE, homepage: 'javascript:alert(1)' }, null, 'x']),
    ).toEqual([LICENSE])
  })
})
