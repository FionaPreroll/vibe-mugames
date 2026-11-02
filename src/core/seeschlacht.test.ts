import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  afloat,
  allowed,
  around,
  decode,
  encode,
  FLEET,
  type Fleet,
  fitsBeside,
  isFleet,
  known,
  legal,
  nextToPlace,
  outcome,
  placing,
  play,
  randomFleet,
  SEA_CELLS,
  type SeaMove,
  type SeaState,
  shipCells,
  start,
  view,
} from './seeschlacht'

/** A fleet in rows 0, 2, 4, 6 and 8, every ship from the left edge. */
const ROWS: Fleet = FLEET.map((size, i) => ({ cell: i * 20, down: false, size }))
/** A fleet standing down in columns 0, 2, 4, 6 and 8, every ship from the top. */
const COLUMNS: Fleet = FLEET.map((size, i) => ({ cell: i * 2, down: true, size }))

const place = (fleet: Fleet): SeaMove => ({ kind: 'place', fleet })
const shoot = (cell: number): SeaMove => ({ kind: 'shoot', cell })

/** Both fleets placed: seat 0 has ROWS, seat 1 COLUMNS. */
function placed(): SeaState {
  return play(play(start(), 0, place(ROWS)), 1, place(COLUMNS))
}

/** A random source that always gives the same numbers. */
function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

describe('ships and fleets', () => {
  it('knows the squares a ship covers, and which ships fall off the sea', () => {
    expect(shipCells({ cell: 0, down: false, size: 3 })).toEqual([0, 1, 2])
    expect(shipCells({ cell: 5, down: true, size: 2 })).toEqual([5, 15])
    expect(shipCells({ cell: 7, down: false, size: 3 })).toEqual([7, 8, 9])
    expect(shipCells({ cell: 8, down: false, size: 3 })).toBeNull()
    expect(shipCells({ cell: 80, down: true, size: 3 })).toBeNull()
    expect(shipCells({ cell: 100, down: true, size: 1 })).toBeNull()
  })

  it('knows the water around a ship, at the edge too', () => {
    expect(around({ cell: 0, down: false, size: 2 })).toEqual([2, 10, 11, 12])
    expect(around({ cell: 55, down: true, size: 1 })).toEqual([44, 45, 46, 54, 56, 64, 65, 66])
  })

  it('takes a fleet of the right ships, none touching another', () => {
    expect(isFleet(ROWS)).toBe(true)
    expect(isFleet(COLUMNS)).toBe(true)
    expect(isFleet(ROWS.slice(1))).toBe(false)
    // Ships in the wrong order, overlapping, touching side by side and at a corner.
    expect(isFleet([...ROWS].reverse())).toBe(false)
    const moved = (i: number, cell: number) =>
      ROWS.map((ship, j) => (j === i ? { ...ship, cell } : ship))
    expect(isFleet(moved(1, 1))).toBe(false)
    expect(isFleet(moved(1, 10))).toBe(false)
    expect(isFleet(moved(1, 15))).toBe(false)
    expect(isFleet(moved(1, 16))).toBe(true)
    expect(fitsBeside(ROWS.slice(0, 1), { cell: 11, down: true, size: 2 })).toBe(false)
  })

  it('places random fleets that are always whole and legal', () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        expect(isFleet(randomFleet(seeded(seed)))).toBe(true)
      }),
      { numRuns: 200 },
    )
  })

  it('carries moves as numbers and back, and nothing else', () => {
    expect(encode(shoot(42))).toEqual([42])
    expect(encode(place(COLUMNS))).toEqual([100, 102, 104, 106, 108])
    expect(decode([100, 102, 104, 106, 108])).toEqual(place(COLUMNS))
    expect(decode(encode(place(ROWS)))).toEqual(place(ROWS))
    expect(decode([99])).toEqual(shoot(99))
    for (const bad of [[], [100], [-1], [1.5], [1, 2], [0, 20, 40, 60, 200], [0, 2, 4, 6, 8, 10]]) {
      expect(decode(bad)).toBeUndefined()
    }
  })
})

describe('a game of Sea Battle', () => {
  it('lets both players place at the same time, each once, before anyone shoots', () => {
    const state = start()
    expect(placing(view(state, 0))).toBe(true)
    expect(nextToPlace(view(state, 0))).toBe(0)
    expect(legal(state, 0, shoot(0))).toBe(false)
    expect(legal(state, 1, place(COLUMNS))).toBe(true)
    const one = play(state, 1, place(COLUMNS))
    expect(nextToPlace(view(one, 0))).toBe(0)
    expect(legal(one, 1, place(COLUMNS))).toBe(false)
    expect(legal(one, 0, place(ROWS.slice(0, 4)))).toBe(false)
    expect(legal(one, 0, place(ROWS))).toBe(true)
    expect(legal(one, 2, place(ROWS))).toBe(false)
    const both = play(one, 0, place(ROWS))
    expect(placing(view(both, -1))).toBe(false)
    expect(nextToPlace(view(both, -1))).toBeNull()
    expect(legal(both, 0, place(ROWS))).toBe(false)
    expect(legal(both, 0, shoot(0))).toBe(true)
    expect(legal(both, 1, shoot(0))).toBe(false)
  })

  it('lets a hit shoot again, and passes the turn on a miss', () => {
    let state = placed()
    state = play(state, 0, shoot(0))
    expect(state.turn).toBe(0)
    state = play(state, 0, shoot(1))
    expect(state.turn).toBe(1)
    expect(legal(state, 1, shoot(0))).toBe(true)
    state = play(state, 1, shoot(0))
    expect(state.turn).toBe(1)
    expect(legal(state, 1, shoot(0))).toBe(false)
  })

  it('shows a sunk ship and the water around it, where nobody may shoot', () => {
    let state = placed()
    // Seat 0 sinks seat 1's ship of two in column 8: rows 0 and 1.
    state = play(state, 0, shoot(8))
    expect(view(state, 1).seas[1]?.sunk).toEqual([])
    state = play(state, 0, shoot(18))
    const sea = view(state, 1).seas[1]
    expect(sea?.sunk).toEqual([{ cell: 8, down: true, size: 2 }])
    expect(sea?.hits).toEqual([8, 18])
    expect(afloat(sea ?? { shots: [], hits: [], sunk: [] })).toEqual([5, 4, 3, 3])
    expect(known(sea ?? { shots: [], hits: [], sunk: [] }).has(28)).toBe(true)
    expect(legal(state, 0, shoot(28))).toBe(false)
    expect(legal(state, 0, shoot(9))).toBe(false)
    expect(legal(state, 0, shoot(38))).toBe(true)
  })

  it('hides each fleet from the other player and from those who watch, until the end', () => {
    let state = placed()
    expect(view(state, 0).fleets).toEqual([ROWS, null])
    expect(view(state, 1).fleets).toEqual([null, COLUMNS])
    expect(view(state, -1).fleets).toEqual([null, null])
    expect(view(state, -1).placed).toEqual([true, true])
    // Seat 1 hits seat 0's ship of five, then misses: the hit shows, the ship does not.
    state = play(play(state, 0, shoot(99)), 1, shoot(0))
    state = play(state, 1, shoot(99))
    expect(view(state, 0).seas[0]).toEqual({ shots: [0, 99], hits: [0], sunk: [] })
    expect(view(state, 1).fleets[0]).toBeNull()
  })

  it('is won by sinking the whole fleet, and then shows every fleet', () => {
    let state = placed()
    const targets = COLUMNS.flatMap((ship) => shipCells(ship) ?? [])
    for (const cell of targets) {
      expect(outcome(state)).toBeNull()
      expect(legal(state, 0, shoot(cell))).toBe(true)
      state = play(state, 0, shoot(cell))
    }
    expect(outcome(state)).toBe(0)
    expect(view(state, -1).fleets).toEqual([ROWS, COLUMNS])
    expect(legal(state, 0, shoot(99))).toBe(false)
    expect(legal(state, 1, shoot(0))).toBe(false)
  })

  it('always ends, with one winner, when both shoot at random', () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        const random = seeded(seed)
        let state = play(
          play(start(), 0, place(randomFleet(random))),
          1,
          place(randomFleet(random)),
        )
        for (let shots = 0; shots < 2 * SEA_CELLS && outcome(state) === null; shots++) {
          const seat = state.turn
          const seen = view(state, seat)
          const done = known(seen.seas[1 - seat] ?? { shots: [], hits: [], sunk: [] })
          const open = Array.from({ length: SEA_CELLS }, (_, cell) => cell).filter(
            (cell) => !done.has(cell),
          )
          const cell = open[Math.floor(random() * open.length)] as number
          expect(allowed(seen, seat, shoot(cell))).toBe(true)
          state = play(state, seat, shoot(cell))
        }
        const winner = outcome(state)
        expect(winner === 0 || winner === 1).toBe(true)
        const loser = view(state, -1).seas[1 - (winner as number)]
        expect(loser?.sunk).toHaveLength(FLEET.length)
      }),
      { numRuns: 50 },
    )
  })
})
