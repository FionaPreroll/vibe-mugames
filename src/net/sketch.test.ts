import { MAX_MESSAGE_LENGTH } from '@fionapreroll/p2p'
import { linkPair } from '@fionapreroll/p2p/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CHOOSE_SECONDS,
  DRAW_SECONDS,
  encode,
  GRID,
  MAX_FEED,
  MAX_GUESS,
  MAX_INK,
  MAX_STROKE,
  names,
  SHOW_SECONDS,
  type SketchMove,
} from '../core/montagsmaler'
import { playerToMove, Table, type TableState } from '../core/table'
import { encodeText } from '../core/text'
import { parseEvent, parseState } from './protocol'
import { GuestSeat, HostSeat } from './session'

/**
 * Montagsmaler at the table and between phones: the one drawing draws while the others guess,
 * the time runs on the host, only the one drawing sees the word, and whatever another phone
 * sends is checked.
 */

const wire = (state: unknown) => JSON.parse(JSON.stringify(state))

function table(players: number, together = false): Table {
  const t = new Table(() => 0, { together })
  for (let id = 0; id < players; id++) t.join(id, `Player ${id}`)
  expect(t.choose('montagsmaler')).toBe(true)
  return t
}

/** Plays a move at the table's own move number. */
const play = (t: Table, id: number, move: SketchMove) =>
  t.move(id, 'montagsmaler', t.state().moveNo, encode(move))

describe('Montagsmaler at the table', () => {
  it('takes the drawing and the guesses at once, and none meant for a turn before', () => {
    const t = table(3)
    expect(playerToMove(t.state())).toBe(0)
    expect(t.state(0).sketch?.options).toEqual([0, 1, 2])
    expect(t.state(1).sketch?.options).toEqual([])
    expect(play(t, 1, { kind: 'choose', option: 0 })).toBe(false)
    expect(play(t, 0, { kind: 'choose', option: 0 })).toBe(true)
    const drawn = t.state().moveNo
    expect(play(t, 0, { kind: 'draw', ink: [-1, 101, 102] })).toBe(true)
    // Bo guessed before the stroke arrived: an older move number still counts.
    expect(t.move(1, 'montagsmaler', drawn, encode({ kind: 'guess', text: 'Hütte' }))).toBe(true)
    expect(t.state(2).sketch?.ink).toEqual([-1, 101, 102])
    expect(t.state(2).sketch?.feed).toEqual([{ seat: 1, text: 'Hütte', close: false }])
    expect(t.state(2).sketch?.word).toBeNull()
    expect(t.state(0).sketch?.word).toBe(0)
    expect(t.state().last).toBeNull()

    expect(play(t, 2, { kind: 'guess', text: 'Haus' })).toBe(true)
    expect(play(t, 1, { kind: 'guess', text: 'house' })).toBe(true)
    expect(t.state(1).sketch?.phase).toBe('show')
    expect(t.state(1).sketch?.word).toBe(0)
    expect(t.state().sketch?.points).toEqual([2, 2, 3])

    // The next turn: guesses meant for the last one no longer count.
    expect(t.tick(SHOW_SECONDS)).toBe(true)
    expect(playerToMove(t.state())).toBe(1)
    expect(t.move(2, 'montagsmaler', drawn, encode({ kind: 'guess', text: 'Baum' }))).toBe(false)
  })

  it('runs the time on the host, and sends the table when a second has passed', () => {
    const t = table(2)
    expect(t.tick(0.4)).toBe(false)
    expect(t.tick(0.7)).toBe(true)
    expect(t.tick(CHOOSE_SECONDS)).toBe(true)
    expect(t.state().sketch?.phase).toBe('draw')
    expect(t.state().sketch?.left).toBe(DRAW_SECONDS)
    expect(t.tick(DRAW_SECONDS / 2)).toBe(true)
    expect(t.state(1).sketch?.hint.de).toBe('H___')
    expect(t.tick(DRAW_SECONDS / 2)).toBe(true)
    expect(t.state(1).sketch?.phase).toBe('show')
  })

  it('counts the game for the player with the most points', () => {
    const t = table(2)
    for (let turn = 0; turn < 4; turn++) {
      t.tick(CHOOSE_SECONDS)
      const word = t.state(turn % 2).sketch?.word ?? 0
      if (turn % 2 === 0) play(t, 1, { kind: 'guess', text: names(word, 'de')[0] ?? '' })
      else t.tick(DRAW_SECONDS)
      t.tick(SHOW_SECONDS)
    }
    expect(t.state().outcome).toEqual({ winner: 1, line: [] })
    expect(t.state().scores).toEqual({ 1: 1 })
    expect(t.tick(1)).toBe(false)
  })

  it('has the one drawing mark who said it on one device, where nobody types', () => {
    const t = table(3, true)
    play(t, 0, { kind: 'choose', option: 1 })
    expect(play(t, 1, { kind: 'guess', text: 'Baum' })).toBe(false)
    expect(play(t, 0, { kind: 'got', seat: 2 })).toBe(true)
    expect(t.state().sketch?.guessed).toEqual([2])
  })
})

describe('the messages of Montagsmaler', () => {
  it('reads back the table as the host sends it, and keeps it small', () => {
    const t = table(8)
    play(t, 0, { kind: 'choose', option: 0 })
    // The fullest drawing there may be, with points as far out as they go.
    const far = GRID * GRID - 1
    for (let n = 0; n < MAX_INK / MAX_STROKE; n++) {
      const ink = Array.from({ length: MAX_STROKE }, (_, i) => (i === 0 ? -5 : far - i))
      expect(play(t, 0, { kind: 'draw', ink })).toBe(true)
    }
    expect(play(t, 0, { kind: 'draw', ink: [5] })).toBe(false)
    for (let n = 0; n < MAX_FEED; n++) {
      play(t, 1 + (n % 7), {
        kind: 'guess',
        text: `${'ö'.repeat(MAX_GUESS - 2)} ${n % 10}`,
      })
    }
    t.tick(DRAW_SECONDS * 0.8)
    for (const viewer of [0, 3, -1]) {
      const state = t.state(viewer)
      expect(parseState(wire(state))).toEqual(wire(state))
      expect(JSON.stringify({ type: 'state', data: state }).length).toBeLessThan(MAX_MESSAGE_LENGTH)
    }
  })

  it('turns down a table that does not fit', () => {
    const t = table(3)
    play(t, 0, { kind: 'choose', option: 0 })
    play(t, 0, { kind: 'draw', ink: [-1, 5] })
    play(t, 1, { kind: 'guess', text: 'Hof' })
    const state: TableState = wire(t.state(1))
    expect(parseState(state)).toEqual(state)
    const s = state.sketch as NonNullable<TableState['sketch']>
    const bad = [
      { ...state, sketch: null },
      { ...state, sketch: { ...s, drawer: 1 } },
      { ...state, sketch: { ...s, turn: 6 } },
      { ...state, sketch: { ...s, phase: 'paint' } },
      { ...state, sketch: { ...s, left: DRAW_SECONDS + 1 } },
      { ...state, sketch: { ...s, word: 10_000 } },
      { ...state, sketch: { ...s, options: [0, 1, 2, 3] } },
      { ...state, sketch: { ...s, ink: [-7] } },
      { ...state, sketch: { ...s, ink: [GRID * GRID] } },
      { ...state, sketch: { ...s, guessed: [1, 1] } },
      { ...state, sketch: { ...s, points: [0, 0] } },
      {
        ...state,
        sketch: { ...s, feed: [{ seat: 3, text: 'Hof', close: false }] },
      },
      {
        ...state,
        sketch: {
          ...s,
          feed: [{ seat: 1, text: 'x'.repeat(31), close: false }],
        },
      },
      { ...state, sketch: { ...s, hint: { de: '____' } } },
      { ...state, sketch: { ...s, winner: 'nobody' } },
      { ...state, sketch: { ...s, together: 'no' } },
      { ...state, words: s },
      { ...state, last: [5, 72] },
    ]
    for (const [i, value] of bad.entries()) expect([i, parseState(value)]).toEqual([i, undefined])
  })

  it('takes moves only as the rules make them', () => {
    const move = (m: unknown) =>
      parseEvent({ type: 'move', game: 'montagsmaler', moveNo: 3, move: m })
    const stroke = encode({ kind: 'draw', ink: [-2, 0, 9999] })
    expect(move(stroke)?.move).toEqual(stroke)
    expect(move([1, ...Array<number>(MAX_STROKE + 1).fill(0)])).toBeUndefined()
    expect(move([1, -7])).toBeUndefined()
    expect(move([5, ...encodeText('Hund 🐶', MAX_GUESS)])?.move).toEqual(
      encode({ kind: 'guess', text: 'Hund 🐶' }),
    )
    expect(move([5, ...encodeText('x'.repeat(MAX_GUESS + 1), MAX_GUESS + 1)])).toBeUndefined()
    expect(move([5, 0xd800])).toBeUndefined()
    expect(move([4, 2])?.move).toEqual([4, 2])
    expect(move([4, 3])).toBeUndefined()
    expect(move([2])?.move).toEqual([2])
    expect(move([6, 1])?.move).toEqual([6, 1])
    expect(move('Haus')).toBeUndefined()
  })
})

describe('Montagsmaler between phones', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'],
    })
  })
  afterEach(() => vi.useRealTimers())

  it('shows the word only to the one drawing, and the drawing to everyone', async () => {
    const host = new HostSeat('Ada')
    const pair = linkPair()
    const attached = host.room.attach(pair.host.link)
    pair.open()
    const bo = await GuestSeat.join(pair.guest.link, 'Bo', 'sketch-token')
    await attached.joined
    await vi.advanceTimersByTimeAsync(150)
    expect(host.choose('montagsmaler')).toBe(true)
    await vi.advanceTimersByTimeAsync(150)
    expect(bo.state()?.sketch?.options).toEqual([])
    const options = host.state().sketch?.options ?? []
    expect(options).toHaveLength(3)
    host.move('montagsmaler', host.state().moveNo, encode({ kind: 'choose', option: 1 }))
    host.move('montagsmaler', host.state().moveNo, encode({ kind: 'draw', ink: [-1, 1, 2, 3] }))
    await vi.advanceTimersByTimeAsync(300)
    expect(bo.state()?.sketch?.ink).toEqual([-1, 1, 2, 3])
    expect(bo.state()?.sketch?.word).toBeNull()
    const word = options[1] ?? 0
    bo.move(
      'montagsmaler',
      bo.state()?.moveNo ?? 0,
      encode({ kind: 'guess', text: names(word, 'en')[0] ?? '' }),
    )
    await vi.advanceTimersByTimeAsync(300)
    expect(bo.state()?.sketch?.phase).toBe('show')
    expect(bo.state()?.sketch?.word).toBe(word)
    await vi.advanceTimersByTimeAsync(SHOW_SECONDS * 1000 + 500)
    expect(bo.state()?.sketch?.drawer).toBe(1)
    expect(bo.state()?.sketch?.options).toHaveLength(3)
    host.close()
  })
})
