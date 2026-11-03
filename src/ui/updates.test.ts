// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@capacitor/core', () => ({ registerPlugin: () => ({}) }))
vi.mock('../native', () => ({ isApp: () => true }))

const { AppUpdates } = await import('@fionapreroll/app-updates')
const { FakeUpdater } = await import('@fionapreroll/app-updates/testing')
const { handleBack } = await import('./dom')
const { setLanguage } = await import('../i18n')
const { settings } = await import('../storage')
const { RELEASE } = await import('../updates')
const { appUpdateSettings, offer, offerUpdates } = await import('./updates')

/**
 * The Spielekiste's update dialogs, from @fionapreroll/app-updates (whose own tests play them
 * through): in the Spielekiste's words and language, closed by Android's back button, and the
 * settings' switch and "look now".
 */

const release = { build: 9, commit: 'abc1234', size: 20_000_000 }
const dialog = () => document.querySelector<HTMLElement>('.modal')
const settle = () => vi.advanceTimersByTimeAsync(0)
function button(name: string): HTMLButtonElement {
  const found = [...document.querySelectorAll('button')].find(
    (b) => b.textContent === name && !b.hidden,
  )
  if (!found) throw new Error(`no visible button "${name}"`)
  return found
}
function setup(change: (fake: InstanceType<typeof FakeUpdater>) => void = () => {}) {
  const fake = new FakeUpdater()
  change(fake)
  return { fake, updates: new AppUpdates({ releases: RELEASE, apk: 'spielekiste.apk' }, fake) }
}

beforeEach(() => {
  vi.useFakeTimers()
  setLanguage('en')
  document.body.replaceChildren()
  localStorage.clear()
})

describe('the question at the first start', () => {
  it('looks for updates at every start only if the player says yes, and is asked once', async () => {
    const { updates, fake } = setup()
    const starting = offerUpdates(updates)
    await settle()
    expect(dialog()?.textContent).toContain('Should the Spielekiste look for a new version')
    button('Yes, look').click()
    await starting
    await settle()
    expect(settings()).toMatchObject({ checkUpdates: true, updatesAsked: true })
    // Build 7 is out: offered, in the Spielekiste's words.
    expect(dialog()?.textContent).toContain('A new version of the Spielekiste is ready (build 7).')
    dialog()?.remove()
    // The next start asks no more, and looks at once.
    await offerUpdates(updates)
    expect(fake.count('fetchText')).toBe(2)
    expect(dialog()?.textContent).not.toContain('Should the Spielekiste')
    expect(dialog()?.textContent).toContain('build 7')
  })

  it('takes Android’s back button as no', async () => {
    const starting = offerUpdates(setup().updates)
    await settle()
    handleBack(() => {})
    await starting
    expect(dialog()).toBeNull()
    expect(settings()).toMatchObject({ checkUpdates: false, updatesAsked: true })
  })
})

describe('the update dialog', () => {
  it('speaks German, and closes with Android’s back button, as Later does', async () => {
    setLanguage('de')
    const { updates, fake } = setup()
    offer(release, updates)
    await settle()
    expect(dialog()?.textContent).toContain('Der Download ist 20,0 MB groß.')
    handleBack(() => {})
    expect(dialog()).toBeNull()
    expect(fake.count('pauseDownload')).toBe(0)
  })
})

describe('the settings’ app updates', () => {
  const look = async (section: HTMLElement) => {
    section.querySelector<HTMLButtonElement>('.buttons button')?.click()
    await settle()
    return section.querySelector('.status')?.textContent
  }
  const section = (change?: (fake: InstanceType<typeof FakeUpdater>) => void) => {
    const made = appUpdateSettings(setup(change).updates)
    document.body.append(made)
    return made
  }

  it('switches looking at every start on and off', () => {
    const toggle = section().querySelector<HTMLInputElement>('input[type=checkbox]')
    expect(toggle?.checked).toBe(false)
    toggle?.click()
    expect(settings()).toMatchObject({ checkUpdates: true, updatesAsked: true })
    toggle?.click()
    expect(settings()).toMatchObject({ checkUpdates: false, updatesAsked: true })
  })

  it('looks now, and says what it found', async () => {
    expect(await look(section((fake) => (fake.installedBuild = 7)))).toBe(
      'This is the newest version (build 7).',
    )
    expect(await look(section((fake) => (fake.release = new Error('offline'))))).toBe(
      'Could not look for a new version. Is there internet?',
    )
    expect(dialog()).toBeNull()
    // A newer one is offered, whatever the switch says.
    expect(await look(section())).toBe('')
    expect(dialog()?.textContent).toContain('build 7')
  })
})
