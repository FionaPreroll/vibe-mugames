import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  AFTER_GOAL,
  advance,
  bounce,
  COUNTDOWN,
  clampMallet,
  fromRink,
  GOALS_TO_WIN,
  glide,
  HALF,
  type HockeyState,
  hit,
  isTarget,
  LENGTH,
  MALLET,
  MAX_PUCK_SPEED,
  outcome,
  PUCK,
  start,
  toRink,
  view,
  WIDTH,
} from './airhockey'

/** A game with the puck free, at a spot and speed of the test's choosing. */
function playing(x: number, y: number, vx: number, vy: number): HockeyState {
  return { ...start(), pause: 0, puck: { x, y, vx, vy } }
}

describe('Air hockey', () => {
  it('starts with the puck in the middle and a countdown', () => {
    const state = start()
    expect(state.puck).toMatchObject({ x: WIDTH / 2, y: HALF, vx: 0, vy: 0 })
    expect(state.pause).toBe(COUNTDOWN)
    expect(state.goals).toEqual([0, 0])
    expect(outcome(state)).toBeNull()
    // The puck waits until the countdown is over, while the mallets move.
    const later = advance(state, [{ x: 0.2, y: 0.5 }, null], 1)
    expect(later.puck).toEqual(state.puck)
    expect(later.pause).toBeCloseTo(COUNTDOWN - 1)
    expect(later.mallets[0].x).toBeCloseTo(0.2)
    expect(later.mallets[0].y).toBeCloseTo(0.5)
  })

  it('turns each player’s own view of their half into the rink, and back', () => {
    expect(toRink(0, { x: 0.2, y: 0.3 })).toEqual({ x: 0.2, y: 0.3 })
    expect(toRink(1, { x: 0.2, y: 0.3 })).toEqual({ x: WIDTH - 0.2, y: LENGTH - 0.3 })
    expect(fromRink(1, toRink(1, { x: 0.25, y: 0.5 }))).toEqual({ x: 0.25, y: 0.5 })
  })

  it('keeps each mallet in its own half, inside the rink', () => {
    expect(clampMallet(0, { x: -1, y: 2 })).toEqual({ x: MALLET, y: HALF - MALLET })
    expect(clampMallet(1, { x: 2, y: 0 })).toEqual({ x: WIDTH - MALLET, y: HALF + MALLET })
    // Seat 1 reaching for the middle line from its side stops before it.
    const state = advance(start(), [null, { x: 0.5, y: 3 }], 1)
    expect(state.mallets[1].y).toBeCloseTo(HALF + MALLET)
  })

  it('slides a mallet towards its target, not there at once', () => {
    const state = advance(start(), [{ x: 0.5, y: 1.4 }, null], 0.05)
    expect(state.mallets[0].y).toBeGreaterThan(0.3)
    expect(state.mallets[0].y).toBeLessThan(1.4 - MALLET)
  })

  it('bounces the puck off the sides, and off the ends beside the goals', () => {
    expect(bounce({ x: 0, y: 1, vx: -1, vy: 0 })).toMatchObject({ x: PUCK })
    expect(bounce({ x: 0, y: 1, vx: -1, vy: 0 }).vx).toBeGreaterThan(0)
    expect(bounce({ x: 1, y: 1, vx: 1, vy: 0 }).vx).toBeLessThan(0)
    expect(bounce({ x: 0.1, y: 0, vx: 0, vy: -1 }).vy).toBeGreaterThan(0)
    expect(bounce({ x: 0.1, y: LENGTH, vx: 0, vy: 1 }).vy).toBeLessThan(0)
    // In front of the goal, it slides on.
    expect(bounce({ x: 0.5, y: 0.01, vx: 0, vy: -1 }).vy).toBe(-1)
  })

  it('sends the puck away from a mallet that hits it', () => {
    const puck = { x: 0.5, y: 0.5 + MALLET + PUCK - 0.01, vx: 0, vy: 0 }
    const mallet = { x: 0.5, y: 0.5, vx: 0, vy: 3 }
    const after = hit(puck, mallet)
    expect(after.vy).toBeGreaterThan(3)
    expect(after.y).toBeCloseTo(0.5 + MALLET + PUCK)
    expect(Math.hypot(after.vx, after.vy)).toBeLessThanOrEqual(MAX_PUCK_SPEED + 1e-9)
    // A puck already moving away is only pushed out.
    expect(hit({ ...puck, vy: 5 }, { ...mallet, vy: 0 }).vy).toBe(5)
    // Nothing happens apart.
    expect(hit({ ...puck, y: 1 }, mallet)).toEqual({ ...puck, y: 1 })
  })

  it('scores a goal for the other player, and gives them the puck back on their side', () => {
    let state = playing(0.5, 0.1, 0, -2)
    state = advance(state, [null, null], 0.2)
    expect(state.goals).toEqual([0, 1])
    expect(state.scored).toBe(1)
    expect(state.pause).toBeGreaterThan(0)
    expect(state.puck).toMatchObject({ y: HALF / 2, vx: 0, vy: 0 })
    state = advance(state, [null, null], AFTER_GOAL + 0.01)
    expect(state.scored).toBeNull()
    expect(state.pause).toBe(0)

    state = advance(playing(0.5, LENGTH - 0.1, 0, 2), [null, null], 0.2)
    expect(state.goals).toEqual([1, 0])
    expect(state.puck.y).toBe(LENGTH - HALF / 2)
  })

  it('is won by the first to score enough goals, and then stands still', () => {
    let state: HockeyState = { ...playing(0.5, 0.1, 0, -2), goals: [3, GOALS_TO_WIN - 1] }
    state = advance(state, [null, null], 0.2)
    expect(outcome(state)).toBe(1)
    expect(advance(state, [{ x: 0, y: 0 }, null], 1)).toBe(state)
  })

  it('takes only targets about the size of a half', () => {
    expect(isTarget(0.5, 1)).toBe(true)
    expect(isTarget(Number.NaN, 1)).toBe(false)
    expect(isTarget(0.5, 100)).toBe(false)
  })

  it('shows phones the game rounded, and lets them draw the puck gliding', () => {
    const state = playing(0.123456789, 1, 1, 0)
    expect(view(state).puck.x).toBe(0.1235)
    expect(glide(state.puck, 0.1).x).toBeCloseTo(0.2234, 3)
    expect(glide({ x: 0.9, y: 1, vx: 2, vy: 0 }, 0.1).x).toBe(WIDTH - PUCK)
  })

  it('keeps the puck in the rink and no faster than its limit, whatever the players do', () => {
    const point = fc.record({
      x: fc.double({ min: -1, max: 2 }),
      y: fc.double({ min: -1, max: 3 }),
    })
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.option(point), fc.option(point)), { maxLength: 60 }),
        (moves) => {
          let state: HockeyState = { ...start(), pause: 0 }
          for (const targets of moves) {
            state = advance(state, targets, 1 / 30)
            const { x, y, vx, vy } = state.puck
            expect(x).toBeGreaterThanOrEqual(PUCK - 1e-9)
            expect(x).toBeLessThanOrEqual(WIDTH - PUCK + 1e-9)
            expect(y).toBeGreaterThanOrEqual(-0.1)
            expect(y).toBeLessThanOrEqual(LENGTH + 0.1)
            expect(Math.hypot(vx, vy)).toBeLessThanOrEqual(MAX_PUCK_SPEED + 1e-6)
            expect(state.mallets[0].y).toBeLessThanOrEqual(HALF)
            expect(state.mallets[1].y).toBeGreaterThanOrEqual(HALF)
          }
        },
      ),
    )
  })
})
