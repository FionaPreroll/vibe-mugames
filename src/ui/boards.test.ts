import { describe, expect, it } from 'vitest'
import { tap } from './boards'

describe('picking a move cell by cell', () => {
  // Dame-like: c3 to d4, or the jump a1 over b2 to c3 and on to e5.
  const moves = [
    [42, 35],
    [56, 42, 28],
    [56, 42, 24],
  ]

  it('picks a piece, then where it goes, and sends the move once it is whole', () => {
    expect(tap(moves, [], 42)).toEqual({ path: [42], send: null })
    expect(tap(moves, [42], 35)).toEqual({ path: [], send: [42, 35] })
  })

  it('goes on picking through a jump of several squares', () => {
    expect(tap(moves, [56], 42)).toEqual({ path: [56, 42], send: null })
    expect(tap(moves, [56, 42], 24)).toEqual({ path: [], send: [56, 42, 24] })
  })

  it('lets go of the piece tapped again, or takes another one instead', () => {
    expect(tap(moves, [42], 42)).toEqual({ path: [], send: null })
    expect(tap(moves, [56, 42], 56)).toEqual({ path: [], send: null })
    expect(tap(moves, [42], 56)).toEqual({ path: [56], send: null })
  })

  it('ignores cells that lead to no move', () => {
    expect(tap(moves, [], 7)).toEqual({ path: [], send: null })
    expect(tap(moves, [56, 42], 35)).toEqual({ path: [56, 42], send: null })
  })

  it('sends a move of one cell at once', () => {
    expect(tap([[3], [4]], [], 4)).toEqual({ path: [], send: [4] })
  })

  it('sends a piece straight where it is tapped, by the one way there, when picking by the end', () => {
    // Sternhalma-like: a step, and a jump of two to 30.
    const star = [
      [10, 11],
      [10, 20],
      [10, 20, 30],
    ]
    expect(tap(star, [10], 30, true)).toEqual({ path: [], send: [10, 20, 30] })
    expect(tap(star, [10], 20, true)).toEqual({ path: [], send: [10, 20] })
    expect(tap(star, [10], 10, true)).toEqual({ path: [], send: null })
    expect(tap(star, [10], 40, true)).toEqual({ path: [10], send: null })
  })
})
