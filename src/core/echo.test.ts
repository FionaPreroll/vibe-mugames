import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  advance,
  COLOURS,
  type EchoState,
  enter,
  LIT,
  leadTime,
  litAt,
  MAX_LENGTH,
  MAX_PLAYERS,
  PAUSE,
  packTaps,
  START_LENGTH,
  showTime,
  start,
  stepTime,
  TAP_TIME,
  unpackTaps,
  view,
} from './echo'

/** Randomness that picks the colours 0, 1, 2, 3, 0, … in turn. */
function cycle(): () => number {
  let next = 0
  return () => ((next++ % COLOURS) + 0.5) / COLOURS
}

/** The game run on until everyone may tap. */
function toRepeat(state: EchoState): EchoState {
  return advance(state, showTime(state.pattern.length), cycle())
}

describe('Colour Echo', () => {
  it('lights up a row of colours, one after another', () => {
    const state = start(2, cycle())
    expect(state.pattern).toEqual([0, 1])
    expect(state.phase).toBe('show')
    const lead = leadTime(START_LENGTH)
    const step = stepTime(START_LENGTH)
    expect(litAt(state.pattern, lead / 2)).toBeNull()
    expect(litAt(state.pattern, lead + 0.01)).toBe(0)
    expect(litAt(state.pattern, lead + step * LIT + 0.01)).toBeNull()
    expect(litAt(state.pattern, lead + step + 0.01)).toBe(1)
    expect(litAt(state.pattern, showTime(START_LENGTH) + 0.01)).toBeNull()
    expect(toRepeat(state).phase).toBe('repeat')
    expect(() => start(1, cycle())).toThrow(RangeError)
    expect(() => start(MAX_PLAYERS + 1, cycle())).toThrow(RangeError)
  })

  it('takes everyone’s taps at once, and a longer row for all who tapped it back', () => {
    let state = toRepeat(start(3, cycle()))
    state = enter(state, 0, 2, [0])
    state = enter(state, 0, 2, [0, 1])
    state = enter(state, 1, 2, [0, 1])
    expect(state.phase).toBe('repeat')
    // Taps again that the host has already, for another row or another seat's: nothing new.
    expect(enter(state, 0, 2, [0, 1])).toBe(state)
    expect(enter(state, 2, 3, [0])).toBe(state)
    expect(enter(state, 2, 2, [0, 1, 2])).toBe(state)
    expect(enter(state, 2, 2, [7])).toBe(state)
    state = enter(state, 2, 2, [0, 1])
    expect(state.phase).toBe('pause')
    state = advance(state, PAUSE, () => 0.9)
    expect(state).toMatchObject({ phase: 'show', pattern: [0, 1, 3], entries: [[], [], []] })
  })

  it('puts out whoever taps a wrong colour, and the last one in wins', () => {
    let state = toRepeat(start(3, cycle()))
    state = enter(state, 0, 2, [1])
    expect(state.out).toEqual([2, null, null])
    // Taps after a wrong one count for nothing.
    expect(enter(state, 0, 2, [1, 1])).toBe(state)
    state = enter(state, 1, 2, [0, 1])
    state = enter(state, 2, 2, [0, 0])
    expect(state.winner).toBe(1)
    expect(advance(state, 10, cycle())).toBe(state)
  })

  it('waits for the last one to tap the row back before they win', () => {
    let state = toRepeat(start(2, cycle()))
    state = enter(state, 0, 2, [3])
    expect(state.winner).toBeNull()
    state = enter(state, 1, 2, [0, 1])
    expect(state.winner).toBe(1)
  })

  it('puts out whoever waits too long for a tap', () => {
    let state = toRepeat(start(2, cycle()))
    state = advance(state, TAP_TIME - 1, cycle())
    state = enter(state, 0, 2, [0])
    state = advance(state, 1.5, cycle())
    expect(state.out).toEqual([null, 2])
    expect(state.late).toEqual([false, true])
    state = advance(state, TAP_TIME + 0.1, cycle())
    // Both out in the same row: Ada got further.
    expect(state.winner).toBe(0)
  })

  it('makes a draw of the last ones going out as far into the same row', () => {
    let state = toRepeat(start(2, cycle()))
    state = enter(enter(state, 0, 2, [0, 0]), 1, 2, [0, 2])
    expect(state.winner).toBe('draw')
  })

  it('makes a draw of everyone tapping back the longest row', () => {
    let state: EchoState = {
      ...start(2, cycle()),
      pattern: Array(MAX_LENGTH).fill(2),
      phase: 'repeat',
    }
    state = enter(state, 0, MAX_LENGTH, Array(MAX_LENGTH).fill(2))
    state = enter(state, 1, MAX_LENGTH, Array(MAX_LENGTH).fill(2))
    expect(state.winner).toBe('draw')
  })

  it('shows the row only while it lights up, and each player only their own taps', () => {
    let state = start(2, cycle())
    expect(view(state, 0).pattern).toEqual([0, 1])
    state = enter(toRepeat(state), 0, 2, [0])
    expect(view(state, 0)).toMatchObject({ pattern: [], length: 2, entries: [0], progress: [1, 0] })
    expect(view(state, 1).entries).toEqual([])
    expect(view(state, -1).entries).toEqual([])
    state = enter(enter(state, 0, 2, [0, 1]), 1, 2, [0, 1])
    expect(view(state, 1).pattern).toEqual([0, 1])
  })

  it('packs taps into the input and back, and nothing else', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: COLOURS - 1 }), { minLength: 1, maxLength: MAX_LENGTH }),
        (taps) => {
          const packed = packTaps(taps)
          expect(packed.length).toBeLessThanOrEqual(3)
          expect(unpackTaps(packed)).toEqual(taps)
        },
      ),
    )
    expect(unpackTaps([])).toBeNull()
    expect(unpackTaps([0])).toBeNull()
    expect(unpackTaps([2])).toBeNull()
    expect(unpackTaps([2, 16])).toBeNull()
    expect(unpackTaps([2, 1.5])).toBeNull()
    expect(unpackTaps([2, 1, 1])).toBeNull()
    expect(unpackTaps([MAX_LENGTH + 1, 0, 0, 0])).toBeNull()
  })
})
