import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  advance,
  ahead,
  appleCount,
  CELLS,
  COLUMNS,
  COUNTDOWN,
  isBody,
  MAX_SNAKES,
  MIN_SNAKES,
  outcome,
  type Snake,
  type SnakesState,
  START_LENGTH,
  STEPS_PER_SECOND,
  start,
  starts,
  step,
  view,
  WIN_LENGTH,
} from './snakes'

/** Randomness that always picks the first free cell. */
const first = () => 0

const snake = (body: number[], heading: number, alive = true): Snake => ({ body, heading, alive })

/** A game of the snakes given, with its apples where given, already crawling. */
function game(snakes: Snake[], apples: number[] = []): SnakesState {
  return { snakes, apples, countdown: 0, clock: 0, steps: 0 }
}

/** Cells in row `row`, from column `from` towards `to`, both included. */
function row(row: number, from: number, to: number): number[] {
  const step = to >= from ? 1 : -1
  return Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => row * COLUMNS + from + i * step)
}

describe('Snakes', () => {
  it('starts two to six snakes apart, on free cells, heading into the grid, with apples', () => {
    for (let snakes = MIN_SNAKES; snakes <= MAX_SNAKES; snakes++) {
      const placed = starts(snakes)
      const cells = placed.flatMap((s) => s.body)
      expect(new Set(cells).size).toBe(snakes * START_LENGTH)
      for (const { body, heading } of placed) {
        expect(isBody(body)).toBe(true)
        const head = body[0] ?? -1
        expect(ahead(head, heading)).not.toBeNull()
        // Heading away from its own tail.
        expect(ahead(head, heading)).not.toBe(body[1])
      }
      const state = start(snakes, Math.random)
      expect(state.apples).toHaveLength(appleCount(snakes))
      expect(state.apples.some((apple) => cells.includes(apple))).toBe(false)
      expect(new Set(state.apples).size).toBe(state.apples.length)
      expect(outcome(state)).toBeNull()
    }
    expect(() => start(1, first)).toThrow(RangeError)
    expect(() => start(MAX_SNAKES + 1, first)).toThrow(RangeError)
  })

  it('waits for the countdown, then crawls one cell a step, its tail following', () => {
    let state = start(2, first)
    const body = state.snakes[0]?.body ?? []
    state = advance(state, [null, null], COUNTDOWN - 0.5, first)
    expect(state.countdown).toBeCloseTo(0.5)
    expect(state.snakes[0]?.body).toEqual(body)
    state = advance(state, [null, null], 0.5 + 1.01 / STEPS_PER_SECOND, first)
    expect(state.steps).toBe(1)
    const head = body[0] ?? 0
    expect(state.snakes[0]?.body).toEqual([head + 1, ...body.slice(0, -1)])
  })

  it('turns a quarter a step, never straight back', () => {
    const s = snake(row(5, 5, 3), 1)
    expect(step(game([s, snake(row(20, 5, 3), 1)]), [0, null], first).snakes[0]?.body[0]).toBe(
      4 * COLUMNS + 5,
    )
    // Straight back, by two turns to the left: a quarter turn now.
    const back = step(game([s, snake(row(20, 5, 3), 1)]), [3 + 4, null], first)
    expect(back.snakes[0]?.heading).toBe(0)
  })

  it('grows by one with every apple it eats, and puts a new apple on a free cell', () => {
    const s = snake(row(5, 5, 3), 1)
    const other = snake(row(20, 5, 3), 1)
    const apple = 5 * COLUMNS + 6
    const state = step(game([s, other], [apple, 0, 1]), [null, null], first)
    expect(state.snakes[0]?.body).toEqual([apple, ...row(5, 5, 3)])
    expect(state.apples).toHaveLength(3)
    expect(state.apples).not.toContain(apple)
    const taken = new Set(state.snakes.flatMap((x) => x.body))
    expect(state.apples.some((a) => taken.has(a))).toBe(false)
  })

  it('puts out a snake that crawls into the edge, itself or another', () => {
    const edge = step(game([snake(row(0, 2, 0), 0), snake(row(20, 5, 3), 1)]), [], first)
    expect(edge.snakes.map((s) => s.alive)).toEqual([false, true])
    expect(outcome(edge)).toBe(1)
    // A snake curled round, turning down into its own body: out, unless that is its tail.
    const at = (r: number, c: number) => r * COLUMNS + c
    const curl = [at(5, 5), at(5, 6), at(6, 6), at(6, 5)]
    const other = snake(row(20, 5, 3), 1)
    const chase = step(game([snake(curl, 3), other]), [2], first)
    expect(chase.snakes[0]?.alive).toBe(true)
    const bite = step(game([snake([...curl, at(6, 4)], 3), other]), [2], first)
    expect(bite.snakes[0]?.alive).toBe(false)
    // Into another snake's body: out, and the other crawls on.
    const across = snake([at(4, 6), at(5, 6), at(6, 6)], 0)
    const into = step(game([snake(row(5, 5, 3), 1), across]), [], first)
    expect(into.snakes.map((s) => s.alive)).toEqual([false, true])
  })

  it('lets a head follow a tail that moves away, but not one that grows', () => {
    // Snake 0 heads right into the cell snake 1's tail leaves.
    const tail = 5 * COLUMNS + 6
    const zero = snake(row(5, 5, 3), 1)
    const one = snake([4 * COLUMNS + 7, 4 * COLUMNS + 6, tail], 0)
    expect(step(game([zero, one]), [], first).snakes.map((s) => s.alive)).toEqual([true, true])
    const fed = step(game([zero, one], [3 * COLUMNS + 7]), [], first)
    expect(fed.snakes.map((s) => s.alive)).toEqual([false, true])
  })

  it('puts out both heads crawling into the same cell, and makes it a draw', () => {
    const state = step(game([snake(row(5, 3, 1), 1), snake(row(5, 5, 7), 3)]), [], first)
    expect(state.snakes.map((s) => s.alive)).toEqual([false, false])
    expect(outcome(state)).toBe('draw')
  })

  it('is won by the first snake as long as WIN_LENGTH, or the longest of several', () => {
    const long = snake(row(3, WIN_LENGTH - 1, 0), 1)
    const short = snake(row(9, 3, 0), 1)
    expect(outcome(game([short, long]))).toBe(1)
    expect(outcome(game([long, long]))).toBe('draw')
    expect(outcome(game([{ ...long, alive: false }, short, short]))).toBeNull()
    expect(outcome(game([snake(row(3, WIN_LENGTH - 2, 0), 1), short]))).toBeNull()
  })

  it('stays as it is once over', () => {
    const over = game([snake(row(5, 5, 3), 1), snake(row(9, 5, 3), 1, false)])
    expect(outcome(over)).toBe(0)
    expect(advance(over, [], 5, first)).toBe(over)
  })

  it('keeps every snake a body on the grid, whatever its players want', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MIN_SNAKES, max: MAX_SNAKES }),
        fc.array(fc.array(fc.integer({ min: 0, max: 7 }), { minLength: 6, maxLength: 6 }), {
          maxLength: 120,
        }),
        fc.double({ min: 0, max: 0.999, noNaN: true }),
        (players, wants, luck) => {
          let state = advance(
            start(players, () => luck),
            [],
            COUNTDOWN,
            () => luck,
          )
          for (const want of wants) {
            state = step(state, want, () => luck)
            for (const s of state.snakes) expect(isBody(s.body)).toBe(true)
            const alive = state.snakes.filter((s) => s.alive).flatMap((s) => s.body)
            expect(new Set(alive).size).toBe(alive.length)
            expect(state.apples.every((a) => a >= 0 && a < CELLS)).toBe(true)
            if (outcome(state) !== null) break
          }
        },
      ),
    )
  })

  it('shows everything but the time not yet a step', () => {
    const state = advance(start(3, first), [], 1.234, first)
    const shown = view(state)
    expect(shown).not.toHaveProperty('clock')
    expect(shown.countdown).toBe(1.8)
    expect(shown.snakes).toBe(state.snakes)
  })

  it('knows a body from cells that are not one', () => {
    expect(isBody(row(2, 4, 1))).toBe(true)
    expect(isBody([])).toBe(false)
    expect(isBody([0, 2])).toBe(false)
    expect(isBody([0, 1, 0])).toBe(false)
    expect(isBody([COLUMNS - 1, COLUMNS])).toBe(false)
    expect(isBody([CELLS])).toBe(false)
    expect(isBody(row(0, WIN_LENGTH, 0))).toBe(false)
  })
})
