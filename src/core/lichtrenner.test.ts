import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  advance,
  ahead,
  CELLS,
  COLUMNS,
  COUNTDOWN,
  isPath,
  type LichtState,
  MAX_RIDERS,
  MIN_RIDERS,
  outcome,
  pathCells,
  ROWS,
  STEPS_PER_SECOND,
  start,
  starts,
  step,
  turn,
  view,
  type Want,
} from './lichtrenner'

const STEP = 1 / STEPS_PER_SECOND
const head = (state: LichtState, seat: number) => {
  const path = state.riders[seat]?.path ?? []
  return path[path.length - 1]
}

/** Steps with the same wants until the race is over, or `limit` steps. */
function ride(state: LichtState, wants: (Want | null)[], limit = 200): LichtState {
  let next = state
  for (let i = 0; i < limit && outcome(next) === null; i++) next = step(next, wants)
  return next
}

describe('Lichtrenner', () => {
  it('starts two to six riders apart, on free cells, heading into the grid', () => {
    for (let riders = MIN_RIDERS; riders <= MAX_RIDERS; riders++) {
      const places = starts(riders)
      expect(new Set(places.map((p) => p.cell)).size).toBe(riders)
      for (const { cell, heading } of places) {
        expect(cell).toBeGreaterThanOrEqual(0)
        expect(cell).toBeLessThan(CELLS)
        expect(ahead(cell, heading)).not.toBeNull()
      }
      const state = start(riders)
      expect(state.walls.filter((w) => w !== -1)).toHaveLength(riders)
      expect(outcome(state)).toBeNull()
    }
    expect(() => start(1)).toThrow(RangeError)
    expect(() => start(MAX_RIDERS + 1)).toThrow(RangeError)
  })

  it('waits for the countdown, then rides one cell a step', () => {
    let state = start(2)
    const first = head(state, 0) ?? 0
    state = advance(state, [null, null], COUNTDOWN - 0.5)
    expect(state.countdown).toBeCloseTo(0.5)
    expect(state.steps).toBe(0)
    // Half a second more ends the countdown, and three steps more ride three cells.
    state = advance(state, [null, null], 0.5 + 3 * STEP + 0.001)
    expect(state.countdown).toBe(0)
    expect(state.steps).toBe(3)
    expect(head(state, 0)).toBe(first + 3)
    // A straight wall keeps two cells in its path: where it starts and the head.
    expect(state.riders[0]?.path).toEqual([first, first + 3])
  })

  it('turns a quarter at a time, never straight back', () => {
    expect(turn(1, null)).toBe(1)
    expect(turn(1, 0)).toBe(0)
    expect(turn(1, 2)).toBe(2)
    expect(turn(1, 1)).toBe(1)
    // Straight back, asked for by two right turns: a right turn now.
    expect(turn(1, 3)).toBe(2)
    // … or by two left turns.
    expect(turn(1, 3 + 4)).toBe(0)
  })

  it('makes a turn a corner of the wall', () => {
    let state = start(2)
    const first = head(state, 0) ?? 0
    state = step(state, [1, null])
    state = step(state, [0, null])
    state = step(state, [0, null])
    expect(state.riders[0]?.path).toEqual([first, first + 1, first + 1 - 2 * COLUMNS])
    expect(pathCells(state.riders[0]?.path ?? [])).toEqual([
      first,
      first + 1,
      first + 1 - COLUMNS,
      first + 1 - 2 * COLUMNS,
    ])
    expect(isPath(state.riders[0]?.path ?? [])).toBe(true)
  })

  it('reaches a heading straight back in two steps, the way it was asked for', () => {
    let state = start(2)
    const first = head(state, 0) ?? 0
    // Two quick left turns: up, then left.
    state = step(state, [3 + 4, null])
    expect(state.riders[0]?.heading).toBe(0)
    state = step(state, [3 + 4, null])
    expect(state.riders[0]?.heading).toBe(3)
    expect(head(state, 0)).toBe(first - COLUMNS - 1)
  })

  it('puts out a rider at the edge, and the other wins', () => {
    // Seat 0 heads up from row 20 and reaches the top after 20 steps, long before seat 1,
    // heading left along row 20, comes to where seat 0 started.
    const state = ride(start(2), [0, null])
    expect(state.riders[0]?.alive).toBe(false)
    expect(outcome(state)).toBe(1)
    // Nothing moves once the race is over.
    expect(advance(state, [0, 2], 5)).toBe(state)
  })

  it('puts out a rider who rides into a wall', () => {
    // Seat 1 heads up, then left, then down into its own wall.
    let state = start(2)
    state = step(state, [null, 0])
    state = step(state, [null, 3])
    expect(state.riders[1]?.alive).toBe(true)
    state = step(state, [null, 2])
    state = step(state, [null, 1])
    expect(state.riders[1]?.alive).toBe(false)
    expect(outcome(state)).toBe(0)
  })

  it('makes a draw of riders who crash in the same step', () => {
    // Head-on in the same row: both ride into the same cell or into each other.
    const state = ride(start(2), [null, null])
    expect(state.riders.every((r) => !r.alive)).toBe(true)
    expect(outcome(state)).toBe('draw')
  })

  it('goes on while two of three ride', () => {
    let state = start(3)
    state = ride(state, [0, null, 2], 25)
    // Seat 0 heads up into the top edge first; the others go on until they meet.
    expect(state.riders[0]?.alive).toBe(false)
    expect(state.riders[2]?.alive).toBe(false)
    expect(outcome(state)).toBe(1)
  })

  it('shows every phone the riders, rounded, without the walls cell by cell', () => {
    const state = advance(start(2), [null, null], 1.04)
    const shown = view(state)
    expect(shown).toEqual({ riders: state.riders, countdown: 2, steps: 0 })
    expect(shown).not.toHaveProperty('walls')
  })

  it('keeps every rider’s path made of the walls it left, whatever the players do', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MIN_RIDERS, max: MAX_RIDERS }),
        fc.array(fc.array(fc.option(fc.integer({ min: 0, max: 7 })), { maxLength: 6 }), {
          maxLength: 120,
        }),
        (riders, turns) => {
          let state = advance(start(riders), [], COUNTDOWN)
          for (const wants of turns) state = step(state, wants)
          const walls = state.walls.filter((w) => w !== -1).length
          let cells = 0
          for (const [seat, rider] of state.riders.entries()) {
            expect(isPath(rider.path)).toBe(true)
            const own = pathCells(rider.path)
            cells += own.length
            for (const cell of own) expect(state.walls[cell]).toBe(seat)
          }
          expect(cells).toBe(walls)
        },
      ),
    )
  })

  it('tells paths from other lists of cells', () => {
    expect(isPath([])).toBe(false)
    expect(isPath([0, 5])).toBe(true)
    expect(isPath([0, COLUMNS + 1])).toBe(false)
    expect(isPath([0, 0])).toBe(false)
    expect(isPath([CELLS])).toBe(false)
    expect(isPath([1.5])).toBe(false)
    expect(ROWS * COLUMNS).toBe(CELLS)
  })
})
