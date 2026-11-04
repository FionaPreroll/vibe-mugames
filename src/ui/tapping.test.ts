// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { showTime } from '../core/echo'
import { COUNTDOWN, STEPS_PER_SECOND } from '../core/snakes'
import { setLanguage } from '../i18n'
import { LocalTable } from '../local'
import { localScreen } from './local'
import { grid } from './zones'

/**
 * Snakes, Reaction and Colour Echo on one device, in happy-dom, which draws nothing: each
 * player's keys steer their snake, tap their button and their pad.
 */

const button = (name: string) => {
  const found = [...document.querySelectorAll('button')].find(
    (b) => b.textContent?.trim() === name || b.ariaLabel === name,
  )
  if (!found) throw new Error(`no button ${name}`)
  return found
}
const status = () => document.querySelector('.status.turn')?.textContent
const press = (code: string) => window.dispatchEvent(new KeyboardEvent('keydown', { code }))

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance'],
  })
  document.body.innerHTML = '<div id="app"></div>'
  setLanguage('en')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('games of tapping and steering on one device', () => {
  it('steers each snake by its own keys, and shows how long each is', () => {
    const local = new LocalTable(['Ada', 'Bo'])
    localScreen(local, false, () => {})
    button('Snakes').click()
    expect(status()).toContain('Eat apples and grow to 15')
    expect(document.querySelector('.snake-lengths')?.textContent).toBe('● Ada 3● Bo 3first to 15')
    press('KeyW')
    press('ArrowDown')
    vi.advanceTimersByTime(COUNTDOWN * 1000 + 1000 / STEPS_PER_SECOND + 50)
    expect(local.state(-1).snakes?.snakes.map((s) => s.heading)).toEqual([0, 2])
    expect(document.querySelectorAll('canvas.snakes-field')).toHaveLength(1)
  })

  it('takes a key before the signal as too early, for that player alone', () => {
    const local = new LocalTable(['Ada', 'Bo'])
    localScreen(local, false, () => {})
    button('Reaction').click()
    expect(status()).toContain('Wait for the light')
    vi.advanceTimersByTime(2600)
    expect(local.state(-1).reaction?.phase).toBe('wait')
    press('KeyD')
    vi.advanceTimersByTime(100)
    expect(local.state(-1).reaction?.answers).toEqual([-1, null])
    // A second key counts for nothing.
    press('KeyW')
    vi.advanceTimersByTime(100)
    expect(local.state(-1).reaction?.answers).toEqual([-1, null])
  })

  it('taps each pad by its player’s keys, a colour for each side', () => {
    const local = new LocalTable(['Ada', 'Bo'])
    localScreen(local, false, () => {})
    button('Colour Echo').click()
    const row = local.table.state(0).echo?.pattern ?? []
    // Keys while the row lights up count for nothing.
    press('KeyW')
    vi.advanceTimersByTime(showTime(row.length) * 1000 + 100)
    expect(local.state(-1).echo?.phase).toBe('repeat')
    const keys = ['KeyW', 'KeyD', 'KeyS', 'KeyA']
    for (const colour of row) press(keys[colour] ?? '')
    // Bo taps a colour that is not the first.
    press(['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'][row[0] ?? 0] ?? '')
    vi.advanceTimersByTime(100)
    expect(local.state(-1).echo?.out).toEqual([null, row.length])
    expect(local.state(-1).outcome).toEqual({ winner: 0, line: [] })
  })

  it('lays the parts side by side on a wide screen, above each other on a tall one', () => {
    expect(grid(1, true)).toEqual({ columns: 1, rows: 1 })
    expect(grid(2, false)).toEqual({ columns: 2, rows: 1 })
    expect(grid(2, true)).toEqual({ columns: 1, rows: 2 })
    expect(grid(4, true)).toEqual({ columns: 2, rows: 2 })
    expect(grid(6, false)).toEqual({ columns: 3, rows: 2 })
    expect(grid(6, true)).toEqual({ columns: 2, rows: 3 })
  })
})
