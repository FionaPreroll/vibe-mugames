// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HALF, COUNTDOWN as HOCKEY_COUNTDOWN } from '../core/airhockey'
import { COLUMNS, COUNTDOWN } from '../core/lichtrenner'
import { setLanguage } from '../i18n'
import { LocalTable } from '../local'
import { keyDirection, keysLabel } from './canvas'
import { LiveSlot } from './live'
import { localScreen } from './local'

/**
 * Games in real time on one device, in happy-dom: the fields stay while the screen is drawn
 * anew, and buttons and keys steer the riders and mallets of the players they belong to.
 */

const $$ = <E extends Element = HTMLElement>(selector: string, root: ParentNode = document) => [
  ...root.querySelectorAll<E>(selector),
]
const button = (name: string, root: ParentNode = document) => {
  const found = $$<HTMLButtonElement>('button', root).find(
    (b) => b.textContent?.trim() === name || b.ariaLabel === name,
  )
  if (!found) throw new Error(`no button ${name}`)
  return found
}
const status = () => document.querySelector('.status.turn')?.textContent
const press = (code: string, type: 'keydown' | 'keyup' = 'keydown') =>
  window.dispatchEvent(new KeyboardEvent(type, { code }))

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

describe('Lichtrenner on one device', () => {
  it('steers each rider by its buttons and its keys, on one screen for everyone', () => {
    const local = new LocalTable(['Ada', 'Bo', 'Cy'])
    localScreen(local, false, () => {})
    button('Light Racers').click()
    expect(status()).toBe(
      'Turn before you hit a wall, with your keys or your ⟲ and ⟳. The last one riding wins.',
    )
    const field = document.querySelector('canvas.race-field')
    expect(field).not.toBeNull()
    expect($$('.turns-name').map((name) => name.textContent)).toEqual([
      '● Ada: W A S D',
      '● Bo: arrow keys',
      '● Cy: I J K L',
    ])
    const starts = local.state(-1).race?.riders.map((r) => r.path[0] ?? 0) ?? []

    // Ada turns left (up), Bo heads down by his arrow key, Cy turns right twice: straight back.
    button('Ada: turn left').click()
    press('ArrowDown')
    button('Cy: turn right').click()
    button('Cy: turn right').click()
    // A rider cannot head straight back by a key.
    press('KeyS')
    vi.advanceTimersByTime(COUNTDOWN * 1000 + 250)
    const race = local.state(-1).race
    expect(race?.steps).toBe(2)
    expect(race?.riders.map((r) => r.heading)).toEqual([0, 2, 3])
    expect(race?.riders[0]?.path).toEqual([starts[0], (starts[0] ?? 0) - 2 * COLUMNS])
    // The field is the same one, drawn on, while the screen around it stays.
    expect(document.querySelector('canvas.race-field')).toBe(field)
  })

  it('plays until one rider is left, and the next race starts afresh', () => {
    const local = new LocalTable(['Ada', 'Bo'])
    localScreen(local, false, () => {})
    button('Light Racers').click()
    press('KeyW')
    vi.advanceTimersByTime(COUNTDOWN * 1000 + 4000)
    expect(status()).toBe('Bo wins.')
    button('Play again').click()
    expect(local.state(-1).round).toBe(2)
    // Ada's last turn does not steer this race: in the other seat now, she rides on as she starts.
    vi.advanceTimersByTime(COUNTDOWN * 1000 + 250)
    expect(local.state(-1).race?.riders[1]?.heading).toBe(3)
    // Nobody turns: they meet in the middle.
    vi.advanceTimersByTime(4000)
    expect(status()).toBe('A draw.')
    button('Other game').click()
    expect(status()).toBe('Choose a game')
  })

  it('gives each part of a split screen its own field, buttons and keys', () => {
    const local = new LocalTable(['Ada', 'Bo'])
    localScreen(local, true, () => {})
    button('Light Racers').click()
    const panes = $$('.pane')
    expect(panes.map((pane) => $$('canvas', pane).length)).toEqual([1, 1])
    // In Bo's part, only Bo's buttons; and W A S D steers only Ada.
    expect($$('button', panes[1]).map((b) => b.ariaLabel)).toContain('Bo: turn right')
    expect($$('button', panes[1]).map((b) => b.ariaLabel)).not.toContain('Ada: turn right')
    button('Bo: turn right', panes[1]).click()
    press('KeyS')
    vi.advanceTimersByTime(COUNTDOWN * 1000 + 150)
    expect(local.state(-1).race?.riders.map((r) => r.heading)).toEqual([2, 0])
  })

  it('stops the clock and the fields when the players stop', () => {
    const local = new LocalTable(['Ada', 'Bo'])
    const stopped = vi.fn()
    localScreen(local, false, stopped)
    button('Light Racers').click()
    button('Stop playing').click()
    expect(stopped).toHaveBeenCalled()
    vi.advanceTimersByTime(COUNTDOWN * 1000 + 1000)
    expect(local.state(-1).race?.steps).toBe(0)
  })
})

describe('air hockey on one device', () => {
  it('shows each player their half on a split screen, and the score', () => {
    const local = new LocalTable(['Ada', 'Bo'])
    localScreen(local, true, () => {})
    button('Air Hockey').click()
    const panes = $$('.pane')
    expect(panes.map((pane) => $$('canvas.rink-field', pane).length)).toEqual([1, 1])
    expect(panes.map((pane) => pane.querySelector('.rink-score')?.textContent)).toEqual([
      'Ada 0 : 0 Bo · First to 7 goals wins.',
      'Bo 0 : 0 Ada · First to 7 goals wins.',
    ])
    expect(panes.map((pane) => pane.querySelector('.rink-help')?.textContent)).toEqual([
      'Ada: W A S D',
      'Bo: arrow keys',
    ])
    vi.advanceTimersByTime(HOCKEY_COUNTDOWN * 1000)
    expect(local.state(-1).rink?.pause).toBe(0)
    expect(local.state(-1).rink?.puck.y).toBe(HALF)
  })
})

describe('the field of a game in real time', () => {
  it('is made once for a game and a seat, and given up for another game', () => {
    const local = new LocalTable(['Ada', 'Bo'])
    const slot = new LiveSlot({ steers: [0], send: () => {}, local: false })
    expect(slot.element(local.state(0), 0, false)).toBeNull()
    local.choose('lichtrenner')
    const field = slot.element(local.state(0), 0, false)
    expect(field?.classList.contains('race')).toBe(true)
    expect(slot.element(local.state(0), 0, false)).toBe(field)
    // A watcher's field is another one.
    expect(slot.element(local.state(0), 5, false)).not.toBe(field)
    local.lobby()
    local.choose('airhockey')
    expect(slot.element(local.state(0), 0, false)?.classList.contains('rink')).toBe(true)
    // On a phone at the board, the player's half covers the screen while the game is on.
    expect(document.querySelector('.arena')).toBeNull()
    const rink = slot.element(local.state(0), 0, false)
    expect(rink?.classList.contains('arena')).toBe(true)
    slot.stop()
  })

  it('knows every seat’s keys', () => {
    expect(keyDirection('KeyW', null)).toEqual({ seat: 0, direction: 0 })
    expect(keyDirection('ArrowLeft', null)).toEqual({ seat: 1, direction: 3 })
    expect(keyDirection('Numpad6', null)).toEqual({ seat: 3, direction: 1 })
    // A phone's player has the arrows and W A S D, and no other keys.
    expect(keyDirection('KeyS', 4)).toEqual({ seat: 4, direction: 2 })
    expect(keyDirection('ArrowRight', 4)).toEqual({ seat: 4, direction: 1 })
    expect(keyDirection('KeyI', 4)).toBeNull()
    expect(keyDirection('Space', null)).toBeNull()
    expect(keysLabel(1)).toBe('arrow keys')
    expect(keysLabel(5)).toBe('')
  })
})
