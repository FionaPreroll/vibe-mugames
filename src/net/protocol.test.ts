import { MAX_MESSAGE_LENGTH } from '@fionapreroll/p2p'
import { describe, expect, it } from 'vitest'
import type { LiveGameId } from '../core/board'
import { packTaps } from '../core/echo'
import { GAMES } from '../core/games'
import { CELLS, COLUMNS, COUNTDOWN, MAX_RIDERS, ROWS } from '../core/lichtrenner'
import { Table, type TableState } from '../core/table'
import { parseEvent, parseInput, parseState } from './protocol'

/**
 * The messages of games in real time, as another phone may send them: what the host sends is
 * read back as it was, and anything else is turned down.
 */

/** A table of `players` with a game on, run on by `seconds`. */
function playing(game: LiveGameId, players = 2, seconds = 0, viewer = -1): TableState {
  const t = new Table()
  for (let id = 0; id < players; id++) t.join(id, `Player ${id}`)
  t.choose(game)
  t.input(0, game === 'airhockey' ? [1, 0.3, 0.6] : [1, 0])
  for (let left = seconds; left > 0; left -= 1 / 30) {
    t.tick(1 / 30)
    // Everyone taps the signal, or the row's first colour, once it is there.
    const now = t.state(0)
    for (let id = 0; id < players; id++) {
      if (now.reaction) t.input(id, [1, Math.max(1, now.reaction.signal), 200 + id])
      if (now.echo?.phase === 'show') first = now.echo.pattern[0] ?? 0
      if (now.echo) t.input(id, [1, now.echo.length, ...packTaps([id === 0 ? first : 3])])
    }
  }
  return t.state(viewer)
}

let first = 0

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

  it('reads back Snakes, Reaction and Colour Echo as the host sends them', () => {
    for (const state of [
      playing('snakes', 3, 1),
      playing('snakes', 2, 8),
      playing('reaction', 2, 2),
      playing('reaction', 3, 12),
      playing('echo', 2, 1, 0),
      playing('echo', 3, 6, 1),
    ]) {
      expect(parseState(wire(state))).toEqual(wire(state))
    }
  })

  it('turns down snakes, signals and rows that do not fit the table', () => {
    const snaky = wire(playing('snakes', 2, 1))
    const snake = snaky.snakes.snakes[0]
    const quick = wire(playing('reaction', 2, 1))
    const echo = wire(playing('echo', 2, 1, 0))
    const bad = [
      { ...snaky, snakes: null },
      { ...snaky, snakes: { ...snaky.snakes, snakes: [snake] } },
      { ...snaky, snakes: { ...snaky.snakes, snakes: [{ ...snake, body: [0, 2] }, snake] } },
      { ...snaky, snakes: { ...snaky.snakes, snakes: [{ ...snake, body: [] }, snake] } },
      { ...snaky, snakes: { ...snaky.snakes, apples: [5, 5] } },
      { ...snaky, snakes: { ...snaky.snakes, apples: [0, 1, 2, 3] } },
      { ...snaky, snakes: { ...snaky.snakes, countdown: 9 } },
      { ...quick, reaction: null },
      { ...quick, reaction: { ...quick.reaction, phase: 'later' } },
      { ...quick, reaction: { ...quick.reaction, answers: [5000, null] } },
      { ...quick, reaction: { ...quick.reaction, points: [1] } },
      { ...quick, reaction: { ...quick.reaction, scored: [2] } },
      { ...echo, echo: null },
      { ...echo, echo: { ...echo.echo, pattern: [4, 0] } },
      { ...echo, echo: { ...echo.echo, pattern: [0] } },
      { ...echo, echo: { ...echo.echo, length: 0 } },
      { ...echo, echo: { ...echo.echo, progress: [3, 0] } },
      { ...echo, echo: { ...echo.echo, out: [null] } },
      { ...echo, echo: { ...echo.echo, winner: 2 } },
      { ...echo, echo: { ...echo.echo, late: [0, 1] } },
    ]
    for (const value of bad) expect(parseState(value)).toBeUndefined()
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
    expect(parseInput([1, 4, 4, 9])).toEqual([1, 4, 4, 9])
    expect(parseInput([1, 32, 32, 9, 9])).toEqual([1, 32, 32, 9, 9])
    for (const value of [[], [1, 2, 3, 4, 5, 6], ['1'], [Number.POSITIVE_INFINITY], 1, { x: 1 }]) {
      expect(parseInput(value)).toBeUndefined()
    }
    expect(parseEvent({ type: 'move', game: 'lichtrenner', moveNo: 0, move: [1] })).toBeUndefined()
    expect(parseEvent({ type: 'move', game: 'airhockey', moveNo: 0, move: [1] })).toBeUndefined()
  })
})

describe('the protocol of board games for more than two', () => {
  /** Sternhalma for `players`, after a move or two. */
  function star(players: number): TableState {
    const t = new Table()
    for (let id = 0; id < players; id++) t.join(id, `Player ${id}`)
    t.choose('sternhalma')
    for (let id = 0; id < 2; id++) {
      const state = t.state()
      const move = state.position && GAMES.sternhalma.moves(state.position).at(-1)
      if (move) t.move(id, 'sternhalma', state.moveNo, move)
    }
    return t.state()
  }

  it('reads back Sternhalma for two to six players, with long jumps', () => {
    for (let players = 2; players <= 6; players++) {
      const state = star(players)
      expect(state.seats).toHaveLength(players)
      expect(parseState(wire(state))).toEqual(wire(state))
    }
    const path = Array.from({ length: 12 }, (_, i) => i)
    expect(parseEvent({ type: 'move', game: 'sternhalma', moveNo: 3, move: path })).toEqual({
      type: 'move',
      game: 'sternhalma',
      moveNo: 3,
      move: path,
    })
  })

  it('turns down pieces or turns of seats that are not at the board', () => {
    const state = wire(star(3))
    const board = [...state.position.board]
    board[board.indexOf(-1)] = 3
    for (const value of [
      { ...state, position: { ...state.position, board } },
      { ...state, position: { ...state.position, turn: 3 } },
      { ...state, position: { ...state.position, board: board.slice(1) } },
    ]) {
      expect(parseState(value)).toBeUndefined()
    }
  })
})
