// @vitest-environment happy-dom
import { linkPair } from '@fionapreroll/p2p/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearLog, log } from './log'
import { GuestSeat, HostSeat } from './net/session'
import { debugReport, issueLink, type ReportSources } from './report'

/** The debug report: what a developer needs, and nothing of who the player is. */

const sources = (extra: Partial<ReportSources> = {}): ReportSources => ({
  now: new Date('2026-11-03T12:00:00Z'),
  app: false,
  browser: {
    userAgent: 'TestBrowser/1.0',
    language: 'de-DE',
    online: true,
    screen: '400×800 at 2x',
    features: { WebRTC: true, camera: false },
  },
  ...extra,
})

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'],
  })
  localStorage.clear()
  clearLog()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the debug report', () => {
  it('says what this is, how the last table went, and what happened', async () => {
    const host = new HostSeat('Ada Secret')
    const link = linkPair()
    const attached = host.room.attach(link.host.link)
    link.open()
    const joining = GuestSeat.join(link.guest.link, 'Bo Secret', 'secret-token-1234')
    await vi.advanceTimersByTimeAsync(100)
    await joining
    await attached.joined
    await vi.advanceTimersByTimeAsync(3000)
    log('test', 'the code was P1~abcdefgh and the address 192.168.1.20')

    const report = await debugReport(sources())
    expect(report).toContain('## Spielekiste debug report')
    expect(report).toContain('- Running as: website in a browser')
    expect(report).toMatch(/- Protocols: table \d+, room \d+/)
    expect(report).toContain('- Browser: TestBrowser/1.0')
    expect(report).toContain('WebRTC yes, camera no')
    expect(report).toContain('### Network, last table')
    expect(report).toContain('Connections now:')
    expect(report).toContain('Connection test:')
    expect(report).toContain('player 1 joined')
    // Nothing of who plays, nor any code or address.
    expect(report).not.toMatch(/Secret|secret-token|P1~abcdefgh|192\.168\.1\.20/)
    host.close()
  })

  it('tells the app build and Bluetooth in the app, and what could not be read', async () => {
    const report = await debugReport(
      sources({
        app: true,
        appInfo: () => Promise.resolve({ build: 42, name: '0.9.0' }),
        bluetooth: () => Promise.reject(new Error('no plugin')),
      }),
    )
    expect(report).toContain('- Running as: Android app')
    expect(report).toContain('- App build: 42 (0.9.0)')
    expect(report).toContain('### Bluetooth')
    expect(report).toContain('- Could not read: no plugin')
  })

  it('reads Nearby’s diagnostics, masking what looks like an address', async () => {
    const report = await debugReport(
      sources({
        app: true,
        bluetooth: () =>
          Promise.resolve({
            manufacturer: 'Fair',
            model: 'Phone 5',
            android: '15',
            sdk: 35,
            permissions: { BLUETOOTH_SCAN: 'granted' },
            log: ['connected to aa:bb:cc:dd:ee:ff'],
          }),
      }),
    )
    expect(report).toContain('- Phone: Fair Phone 5, Android 15 (SDK 35)')
    expect(report).toContain('BLUETOOTH_SCAN granted')
    expect(report).not.toContain('aa:bb:cc:dd:ee:ff')
  })
})

describe('the link to a new issue', () => {
  it('carries a short report, and asks to paste a long one', () => {
    expect(issueLink('short', 'paste it')).toBe(
      'https://github.com/FionaPreroll/vibe-mugames/issues/new?title=Debug%20report&body=short',
    )
    expect(issueLink('x'.repeat(8000), 'paste it')).toMatch(/body=paste%20it$/)
  })
})
