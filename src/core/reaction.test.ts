import { describe, expect, it } from 'vitest'
import {
  advance,
  answer,
  EARLY,
  GO_LIMIT,
  isAnswer,
  MAX_PLAYERS,
  MAX_TIME,
  outcome,
  POINTS_TO_WIN,
  READY,
  RESULT,
  type ReactionState,
  start,
  view,
  WAIT_MAX,
  WAIT_MIN,
} from './reaction'

/** Randomness for the shortest wait. */
const soon = () => 0

/** The game run on until the signal shows. */
function toSignal(state: ReactionState): ReactionState {
  let next = state
  for (let i = 0; i < 100 && next.phase !== 'go'; i++) next = advance(next, 0.1, soon)
  return next
}

describe('Reaction', () => {
  it('waits a little, then a random while, before the signal shows', () => {
    let state = start(3)
    expect(state.phase).toBe('ready')
    state = advance(state, READY, () => 0.5)
    expect(state).toMatchObject({ phase: 'wait', signal: 1 })
    expect(state.timer).toBeCloseTo((WAIT_MIN + WAIT_MAX) / 2)
    state = advance(state, (WAIT_MIN + WAIT_MAX) / 2, soon)
    expect(state.phase).toBe('go')
    expect(() => start(1)).toThrow(RangeError)
    expect(() => start(MAX_PLAYERS + 1)).toThrow(RangeError)
  })

  it('gives the point to the fastest tap, once everyone has tapped', () => {
    let state = toSignal(start(3))
    state = answer(state, 0, 1, 420)
    state = answer(state, 1, 1, 260)
    expect(state.phase).toBe('go')
    // A second tap, a tap for another signal, and nonsense count for nothing.
    expect(answer(state, 0, 1, 100)).toBe(state)
    expect(answer(state, 2, 2, 100)).toBe(state)
    expect(answer(state, 2, 1, 1.5)).toBe(state)
    expect(answer(state, 7, 1, 100)).toBe(state)
    state = answer(state, 2, 1, 300)
    expect(state).toMatchObject({ phase: 'result', points: [0, 1, 0], scored: [1] })
    state = advance(state, RESULT, soon)
    expect(state).toMatchObject({ phase: 'wait', signal: 2, answers: [null, null, null] })
  })

  it('gives no point for a tap before the signal, and ends it once all jumped the gun', () => {
    let state = advance(start(2), READY, soon)
    // Only a tap too early counts before the signal.
    expect(answer(state, 0, 1, 300)).toBe(state)
    state = answer(state, 0, 1, EARLY)
    expect(state.phase).toBe('wait')
    state = answer(state, 1, 1, EARLY)
    expect(state).toMatchObject({ phase: 'result', points: [0, 0], scored: [] })
  })

  it('takes a tap too early that comes once the signal shows, and closes after a while', () => {
    let state = toSignal(start(2))
    state = answer(state, 0, 1, EARLY)
    state = advance(state, GO_LIMIT, soon)
    expect(state).toMatchObject({ phase: 'result', points: [0, 0], scored: [] })
    // A time equal to the fastest shares the point.
    state = toSignal(state)
    state = answer(answer(state, 0, 2, 250), 1, 2, 250)
    expect(state).toMatchObject({ points: [1, 1], scored: [0, 1] })
  })

  it('is won with POINTS_TO_WIN points, by one player alone', () => {
    let state = start(2)
    for (let signal = 1; signal <= POINTS_TO_WIN; signal++) {
      expect(outcome(state)).toBeNull()
      state = toSignal(state)
      state = answer(answer(state, 0, signal, 200), 1, signal, 200)
    }
    // Both have as many: they play on.
    expect(outcome(state)).toBeNull()
    state = toSignal(advance(state, RESULT, soon))
    state = answer(answer(state, 0, POINTS_TO_WIN + 1, 300), 1, POINTS_TO_WIN + 1, 200)
    expect(outcome(state)).toBe(1)
    expect(advance(state, 10, soon)).toBe(state)
  })

  it('knows an answer from numbers that are not one', () => {
    expect(isAnswer(1, EARLY)).toBe(true)
    expect(isAnswer(3, 0)).toBe(true)
    expect(isAnswer(3, MAX_TIME)).toBe(true)
    expect(isAnswer(0, 100)).toBe(false)
    expect(isAnswer(1, MAX_TIME + 1)).toBe(false)
    expect(isAnswer(1, -2)).toBe(false)
    expect(isAnswer(1.5, 100)).toBe(false)
  })

  it('shows nothing of when the signal comes', () => {
    const state = advance(start(2), READY, () => 0.7)
    expect(view(state)).not.toHaveProperty('timer')
    expect(view(state)).toMatchObject({ phase: 'wait', signal: 1, points: [0, 0] })
  })
})
