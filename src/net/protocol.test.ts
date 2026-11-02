import { MAX_MESSAGE_LENGTH } from '@fionapreroll/p2p'
import { describe, expect, it } from 'vitest'
import { CELLS, COLUMNS, COUNTDOWN, MAX_RIDERS, ROWS } from '../core/lichtrenner'
import { Table, type TableState } from '../core/table'
import { parseEvent, parseInput, parseState } from './protocol'

/**
 * The messages of games in real time, as another phone may send them: what the host sends is
 * read back as it was, and anything else is turned down.
 */

/** A table of `players` with a game on, run on by `seconds`. */
function playing(game: 'lichtrenner' | 'airhockey', players = 2, seconds = 0): TableState {
  const t = new Table()
  for (let id = 0; id < players; id++) t.join(id, `Player ${id}`)
  t.choose(game)
  t.input(0, game === 'lichtrenner' ? [1, 0] : [1, 0.3, 0.6])
  for (let left = seconds; left > 0; left -= 1 / 30) t.tick(1 / 30)
  return t.state()
}

/** A state as it travels: JSON there and back. */
const wire = (state: unknown) => JSON.parse(JSON.stringify(state))

describe('the protocol of games in real time', () => {
  it('reads back a race and a rink as the host sends them', () => {
    for (const state of [
      playing('lichtrenner', 3, COUNTDOWN + 1),
      playing('airhockey', 2, COUNTDOWN + 1),
      playing('lichtrenner', 2, 30),
    ]) {
      expect(parseState(wire(state))).toEqual(wire(state))
    }
  })

  it('turns down races that do not fit the table', () => {
    const state = wire(playing('lichtrenner', 2, COUNTDOWN + 1))
    const rider = state.race.riders[0]
    const bad = [
      { ...state, race: null },
      { ...state, rink: playing('airhockey').rink },
      { ...state, round: -1 },
      { ...state, race: { ...state.race, riders: [rider] } },
      { ...state, race: { ...state.race, countdown: COUNTDOWN + 1 } },
      { ...state, race: { ...state.race, steps: 0.5 } },
      { ...state, race: { ...state.race, riders: [{ ...rider, path: [0, COLUMNS + 1] }, rider] } },
      { ...state, race: { ...state.race, riders: [{ ...rider, path: [] }, rider] } },
      { ...state, race: { ...state.race, riders: [{ ...rider, heading: 4 }, rider] } },
      { ...state, race: { ...state.race, riders: [{ ...rider, alive: 1 }, rider] } },
      { ...state, last: [1] },
    ]
    for (const value of bad) expect(parseState(value)).toBeUndefined()
  })

  it('turns down rinks with discs far off it, too fast, or a score past the end', () => {
    const state = wire(playing('airhockey', 2, COUNTDOWN + 1))
    const rink = state.rink
    const bad = [
      { ...state, rink: null },
      { ...state, race: playing('lichtrenner').race },
      { ...state, rink: { ...rink, puck: { ...rink.puck, x: 5 } } },
      { ...state, rink: { ...rink, puck: { ...rink.puck, vy: 1e9 } } },
      { ...state, rink: { ...rink, mallets: [rink.puck] } },
      { ...state, rink: { ...rink, goals: [8, 0] } },
      { ...state, rink: { ...rink, goals: [1] } },
      { ...state, rink: { ...rink, pause: 60 } },
      { ...state, rink: { ...rink, scored: 2 } },
    ]
    for (const value of bad) expect(parseState(value)).toBeUndefined()
  })

  it('fits the largest race into one message', () => {
    // Every cell a corner, as no race can have more: a snake through the whole grid, shared
    // out among six riders, at a table of eight with the longest names.
    const snake = Array.from({ length: CELLS }, (_, i) => {
      const row = Math.floor(i / COLUMNS)
      const column = row % 2 === 0 ? i % COLUMNS : COLUMNS - 1 - (i % COLUMNS)
      return row * COLUMNS + column
    })
    const share = Math.ceil(CELLS / MAX_RIDERS)
    const t = new Table()
    for (let id = 0; id < 8; id++) t.join(id, `Longest name ${id}…`.slice(0, 16))
    t.choose('lichtrenner')
    const state = {
      ...t.state(),
      race: {
        riders: Array.from({ length: MAX_RIDERS }, (_, seat) => ({
          path: snake.slice(seat * share, (seat + 1) * share),
          heading: 0,
          alive: true,
        })),
        countdown: 0,
        steps: ROWS * COLUMNS,
      },
      scores: Object.fromEntries(Array.from({ length: 8 }, (_, id) => [id, 999_999])),
    }
    expect(parseState(wire(state))).toBeDefined()
    expect(JSON.stringify({ type: 'state', data: state }).length).toBeLessThan(MAX_MESSAGE_LENGTH)
  })

  it('reads input as a few numbers, and turns down moves in games in real time', () => {
    expect(parseInput(null)).toBeNull()
    expect(parseInput([1, 0.25, 0.5])).toEqual([1, 0.25, 0.5])
    for (const value of [[], [1, 2, 3, 4], ['1'], [Number.POSITIVE_INFINITY], 1, { x: 1 }]) {
      expect(parseInput(value)).toBeUndefined()
    }
    expect(parseEvent({ type: 'move', game: 'lichtrenner', moveNo: 0, move: [1] })).toBeUndefined()
    expect(parseEvent({ type: 'move', game: 'airhockey', moveNo: 0, move: [1] })).toBeUndefined()
  })
})
