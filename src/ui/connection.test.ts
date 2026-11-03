// @vitest-environment happy-dom
import { linkPair } from '@fionapreroll/p2p/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setLanguage } from '../i18n'
import { GuestSeat, HostSeat } from '../net/session'
import { settingsScreen } from './settings'
import { tableScreen } from './table'

/**
 * The connection at a glance in the table's top line, its details a tap away, the host's
 * connection test, and the debug report from there and from the settings: two phones in memory,
 * each table on the one page of happy-dom.
 */

const $ = <E extends Element = HTMLElement>(selector: string, root: ParentNode = document) => {
  const element = root.querySelector<E>(selector)
  if (!element) throw new Error(`no ${selector}`)
  return element
}
const button = (name: string, root: ParentNode = document) => {
  const found = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => b.textContent?.trim() === name,
  )
  if (!found) throw new Error(`no button ${name}`)
  return found
}
const later = (ms: number) => vi.advanceTimersByTimeAsync(ms)

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'],
  })
  localStorage.clear()
  document.body.innerHTML = '<div id="app"></div>'
  setLanguage('en')
})

afterEach(() => {
  for (const modal of document.querySelectorAll('.modal')) modal.remove()
  vi.useRealTimers()
})

/** A host and one player, Bo, connected in memory. */
async function pair() {
  const host = new HostSeat('Ada')
  const link = linkPair()
  const attached = host.room.attach(link.host.link)
  link.open()
  const guest = await GuestSeat.join(link.guest.link, 'Bo', 'connection-token-1234')
  await attached.joined
  return { host, guest }
}

describe('the connection on the table screen', () => {
  it('shows the ping once there is a connection, and its details on a tap', async () => {
    const { host, guest } = await pair()
    tableScreen(host, () => {})
    const net = $<HTMLButtonElement>('header button.net')
    expect(net.hidden).toBe(true)
    await later(3000)
    expect(net.hidden).toBe(false)
    expect(net.textContent).toMatch(/\d+ ms|…/)
    expect(net.ariaLabel).toBe('Connection details')

    net.click()
    const modal = $('.modal .connection-card')
    expect($('h2', modal).textContent).toBe('Connection')
    await later(1000)
    expect($('section.connection h3', modal).textContent).toBe('Bo')
    expect(modal.textContent).toContain('In memory')
    // The host tests every player's connection; the player hears of it.
    const toasts = () => [...document.querySelectorAll('.toast')].map((t) => t.textContent)
    const test = button('Test connections', modal)
    test.click()
    expect(test.textContent).toBe('Testing for 5 seconds…')
    await later(9000)
    expect(test.textContent).toBe('Test connections')
    expect($('.connection-test', modal).textContent).toContain('Last connection test')
    expect($('.connection-test', modal).textContent).toContain('Bo')
    expect(host.lastTest()?.players[0]?.result).not.toBeNull()
    expect(guest.lastTest()).not.toBeNull()
    // The first button closes the dialog, as Android's back button does.
    $<HTMLButtonElement>('.buttons button', modal).click()
    expect(document.querySelector('.connection-card')).toBeNull()
    expect(toasts()).toEqual([])
    host.close()
  })

  it('tells the player when the host tests, and names the host in the details', async () => {
    const { host, guest } = await pair()
    tableScreen(guest, () => {})
    await later(3000)
    const net = $<HTMLButtonElement>('header button.net')
    expect(net.hidden).toBe(false)
    net.click()
    await later(1000)
    const modal = $('.modal .connection-card')
    expect($('section.connection h3', modal).textContent).toBe('Ada (host)')
    // Only the host tests.
    expect(() => button('Test connections', modal)).toThrow()
    void host.testConnections()
    await later(500)
    expect(document.querySelector('.toast')?.textContent).toBe(
      'The host is testing the connection for a few seconds.',
    )
    button('Debug report', modal).click()
    await later(100)
    expect(document.querySelector('.connection-card')).toBeNull()
    expect($<HTMLTextAreaElement>('.modal textarea.report').value).toContain('Connections now:')
    host.close()
  })
})

describe('the debug report in the settings', () => {
  it('opens to read, with its buttons to copy, download and report it', async () => {
    settingsScreen(() => {})
    button('Create debug report').click()
    await later(100)
    const modal = $('.modal .report-card')
    const report = $<HTMLTextAreaElement>('textarea.report', modal).value
    expect(report).toContain('## Spielekiste debug report')
    expect($<HTMLAnchorElement>('a.button.primary', modal).href).toMatch(
      /^https:\/\/github\.com\/FionaPreroll\/vibe-mugames\/issues\/new\?title=Debug%20report&body=/,
    )
    expect($<HTMLAnchorElement>('a.button:not(.primary)', modal).download).toMatch(
      /^spielekiste-report-.*\.md$/,
    )
    $<HTMLButtonElement>('.buttons button', modal).click()
    expect(document.querySelector('.report-card')).toBeNull()
  })
})
