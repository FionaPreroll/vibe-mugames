import { describe, expect, it } from 'vitest'
import { GOALS_TO_WIN, HALF, MALLET } from './airhockey'
import { START_LENGTH as ECHO_START, packTaps, showTime } from './echo'
import { COUNTDOWN, STEPS_PER_SECOND } from './lichtrenner'
import { READY as REACTION_READY, RESULT as REACTION_RESULT, WAIT_MAX } from './reaction'
import { COUNTDOWN as SNAKE_COUNTDOWN, STEPS_PER_SECOND as SNAKE_STEPS } from './snakes'
import { playerToMove, Table } from './table'

/** A table with players 0, 1, … as named. */
function table(...names: string[]): Table {
  const t = new Table()
  names.forEach((name, id) => {
    t.join(id, name)
  })
  return t
}

/** Runs the table on by `seconds`, in ticks of a thirtieth of a second, as the host does. */
function run(t: Table, seconds: number): void {
  for (let left = seconds; left > 0; left -= 1 / 30) t.tick(Math.min(1 / 30, left))
}

describe('games in real time at the table', () => {
  it('seats two to six riders in Lichtrenner, everyone else watches', () => {
    const t = table('Ada', 'Bo', 'Cy', 'Di', 'Ed', 'Flo', 'Gus')
    expect(t.choose('lichtrenner')).toBe(true)
    const state = t.state()
    expect(state.seats).toEqual([0, 1, 2, 3, 4, 5])
    expect(state.race?.riders).toHaveLength(6)
    expect(state).toMatchObject({ rink: null, position: null, cards: null, round: 1 })
    // Nobody's turn in a game in real time.
    expect(playerToMove(state)).toBeNull()
    expect(table('Ada').choose('lichtrenner')).toBe(false)
  })

  it('takes a rider’s heading only for this round, from a rider, as a heading', () => {
    const t = table('Ada', 'Bo', 'Cy')
    t.choose('airhockey')
    expect(t.state().seats).toEqual([0, 1])
    t.lobby()
    t.choose('lichtrenner')
    const round = t.state().round
    expect(round).toBe(2)
    expect(t.input(0, [round, 0])).toBe(true)
    // The last round's input, a watcher's, nonsense, or a move: none of it is taken.
    expect(t.input(1, [round - 1, 0])).toBe(false)
    expect(t.input(1, [round, 8])).toBe(false)
    expect(t.input(1, [round, 1.5])).toBe(false)
    expect(t.input(1, [round, 0, 1])).toBe(false)
    expect(t.input(1, [round])).toBe(false)
    expect(t.input(9, [round, 0])).toBe(false)
    expect(t.move(0, 'lichtrenner', 0, [0])).toBe(false)

    const start = t.state().race?.riders[0]?.path[0] ?? 0
    run(t, COUNTDOWN + 2.05 / STEPS_PER_SECOND)
    // Ada heads up from the first step on.
    expect(t.state().race?.riders[0]?.path.at(-1)).toBe(start - 2 * 40)
    expect(t.state().race?.steps).toBe(2)
  })

  it('ends a race with the last rider riding, who scores', () => {
    const t = table('Ada', 'Bo')
    t.choose('lichtrenner')
    // Ada heads up into the top edge; Bo rides on along the middle.
    t.input(0, [t.state().round, 0])
    run(t, COUNTDOWN + 3)
    expect(t.state().outcome).toEqual({ winner: 1, line: [] })
    expect(t.state().scores).toEqual({ 1: 1 })
    // Nothing moves once it is over, and input is not taken.
    expect(t.tick(1)).toBe(false)
    expect(t.input(1, [t.state().round, 0])).toBe(false)
    // The next race is a new round, which last round's input does not steer.
    expect(t.rematch()).toBe(true)
    expect(t.state().round).toBe(2)
    expect(t.state().outcome).toBeNull()
    expect(t.input(0, [1, 0])).toBe(false)
  })

  it('makes a draw of riders crashing at once, and scores nobody', () => {
    const t = table('Ada', 'Bo')
    t.choose('lichtrenner')
    run(t, COUNTDOWN + 4)
    expect(t.state().outcome).toBe('draw')
    expect(t.state().scores).toEqual({})
  })

  it('moves each mallet where its player wants it, in their own half', () => {
    const t = table('Ada', 'Bo')
    t.choose('airhockey')
    const round = t.state().round
    expect(t.input(0, [round, 0.2, 0.5])).toBe(true)
    // Bo wants his mallet beyond the middle line, as he sees his half: it stops at the line.
    expect(t.input(1, [round, 0.2, 2.9])).toBe(true)
    expect(t.input(1, [round, Number.NaN, 0])).toBe(false)
    expect(t.input(1, [round, 0.5])).toBe(false)
    run(t, 1)
    const [ada, bo] = t.state().rink?.mallets ?? []
    expect(ada?.x).toBeCloseTo(0.2)
    expect(ada?.y).toBeCloseTo(0.5)
    expect(bo?.x).toBeCloseTo(0.8)
    expect(bo?.y).toBeCloseTo(HALF + MALLET)
    // The puck waits for the countdown.
    expect(t.state().rink?.pause).toBeGreaterThan(0)
  })

  it('ends air hockey with the first to score enough goals, who scores at the table', () => {
    const t = table('Ada', 'Bo')
    t.choose('airhockey')
    const round = t.state().round
    run(t, 3)
    // The puck waits in the half of whoever let the last goal in, or in the middle. Its player
    // goes behind it, then straight through it towards the other goal, while the other keeps
    // to the side.
    for (let goal = 0; goal < 2 * GOALS_TO_WIN && t.state().outcome === null; goal++) {
      const puck = t.state().rink?.puck ?? { x: 0.5, y: HALF }
      const seat = puck.y <= HALF ? 0 : 1
      const own = seat === 0 ? puck.y : 3 - puck.y
      t.input(1 - seat, [round, 0.05, 0.3])
      t.input(seat, [round, 0.5, Math.max(0.1, own - 0.3)])
      run(t, 1.6)
      t.input(seat, [round, 0.5, 1.45])
      run(t, 1.5)
    }
    const state = t.state()
    expect(state.rink?.goals).toContain(GOALS_TO_WIN)
    expect(state.outcome).not.toBeNull()
    const winner = state.outcome === 'draw' ? -1 : (state.outcome?.winner ?? -1)
    expect(state.rink?.goals[winner]).toBe(GOALS_TO_WIN)
    expect(state.scores).toEqual({ [winner]: 1 })
  })

  it('runs nothing in a game of turns', () => {
    const t = table('Ada', 'Bo')
    expect(t.tick(1)).toBe(false)
    t.choose('tictactoe')
    expect(t.tick(1)).toBe(false)
    expect(t.input(0, [t.state().round, 0])).toBe(false)
    expect(t.state()).toMatchObject({ race: null, rink: null })
  })
})

describe('Snakes, Reaction and Colour Echo at the table', () => {
  it('steers snakes as riders are steered, and ends with a snake that scores', () => {
    const t = table('Ada', 'Bo', 'Cy')
    expect(t.choose('snakes')).toBe(true)
    const round = t.state().round
    expect(t.state().snakes?.snakes).toHaveLength(3)
    expect(t.input(0, [round, 0])).toBe(true)
    expect(t.input(1, [round, 8])).toBe(false)
    expect(t.input(1, [round, 0, 1])).toBe(false)
    expect(t.move(0, 'snakes', 0, [0])).toBe(false)
    // Ada crawls up into the top edge, Cy below her too; Bo crawls on, and is left.
    t.input(2, [round, 0])
    run(t, SNAKE_COUNTDOWN + 30 / SNAKE_STEPS)
    const state = t.state()
    expect(state.outcome).not.toBeNull()
    expect(state.snakes?.snakes[0]?.alive).toBe(false)
    expect(state).toMatchObject({ race: null, rink: null, reaction: null, echo: null })
  })

  it('gives Reaction’s point to the fastest tap, a phone’s own time, for this signal', () => {
    const t = table('Ada', 'Bo')
    t.choose('reaction')
    const round = t.state().round
    run(t, REACTION_READY)
    expect(t.state().reaction?.phase).toBe('wait')
    // Nothing of when the signal comes.
    expect(t.state().reaction).not.toHaveProperty('timer')
    expect(t.input(0, [round, 1, 1.5])).toBe(false)
    expect(t.input(0, [round, 1])).toBe(false)
    for (let i = 0; i < 30 * WAIT_MAX && t.state().reaction?.phase === 'wait'; i++) run(t, 1 / 30)
    expect(t.state().reaction?.phase).toBe('go')
    expect(t.input(0, [round, 1, 320])).toBe(true)
    expect(t.input(1, [round, 1, 280])).toBe(true)
    run(t, 0.1)
    expect(t.state().reaction).toMatchObject({ phase: 'result', points: [0, 1], scored: [1] })
    // The answers hold, but are for the last signal: the next waits for new ones.
    run(t, REACTION_RESULT + 0.1)
    expect(t.state().reaction).toMatchObject({ signal: 2, answers: [null, null] })
  })

  it('takes Colour Echo’s taps, all of them each time, and shows each only their own', () => {
    const t = table('Ada', 'Bo')
    t.choose('echo')
    const round = t.state().round
    const row = t.state().echo?.pattern ?? []
    expect(row).toHaveLength(ECHO_START)
    run(t, showTime(row.length) + 0.1)
    expect(t.state().echo?.pattern).toEqual([])
    expect(t.input(0, [round, row.length, ...packTaps(row.slice(0, 1))])).toBe(true)
    expect(t.input(1, [round, row.length, 9])).toBe(false)
    run(t, 0.1)
    expect(t.state(0).echo).toMatchObject({ progress: [1, 0], entries: row.slice(0, 1) })
    expect(t.state(1).echo?.entries).toEqual([])
    t.input(0, [round, row.length, ...packTaps(row)])
    t.input(1, [round, row.length, ...packTaps(row.map((c) => (c + 1) % 4))])
    run(t, 0.1)
    expect(t.state().outcome).toEqual({ winner: 0, line: [] })
    expect(t.state().scores).toEqual({ 0: 1 })
  })
})
