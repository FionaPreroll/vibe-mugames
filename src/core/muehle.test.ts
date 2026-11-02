import { describe, expect, it } from 'vitest'
import { EMPTY, isLegal, type Move, type Position } from './board'
import { flying, inMill, MILLS, MUEHLE_NEIGHBOURS, MUEHLE_QUIET, muehle } from './muehle'

/** Plays the moves in turn and returns the position. */
function playAll(moves: Move[], from: Position = muehle.start()): Position {
  let position = from
  for (const move of moves) {
    expect(isLegal(muehle, position, move), `move ${move}`).toBe(true)
    position = muehle.play(position, move)
  }
  return position
}

/** A position after placing: seat 0 on `mine`, seat 1 on `theirs`, nothing in hand. */
function placed(mine: number[], theirs: number[], turn = 0): Position {
  const board = Array(24).fill(EMPTY)
  for (const p of mine) board[p] = 0
  for (const p of theirs) board[p] = 1
  return { board, turn, hand: [0, 0], phase: 'move', quiet: 0 }
}

describe('Mühle', () => {
  it('has 24 points joined by lines, and 16 mills', () => {
    expect(MILLS).toHaveLength(16)
    // Corners have two neighbours, the middles of the middle square four.
    expect(MUEHLE_NEIGHBOURS[0]).toEqual([1, 7])
    expect([...(MUEHLE_NEIGHBOURS[9] ?? [])].sort((a, b) => a - b)).toEqual([1, 8, 10, 17])
    const links = MUEHLE_NEIGHBOURS.flat().length
    expect(links).toBe(2 * 32)
    for (const [point, next] of MUEHLE_NEIGHBOURS.entries()) {
      for (const other of next) expect(MUEHLE_NEIGHBOURS[other]).toContain(point)
    }
  })

  it('places nine pieces each, one a turn, on free points', () => {
    let position = muehle.start()
    expect(muehle.moves(position)).toHaveLength(24)
    position = playAll([[0], [5]])
    expect(position.hand).toEqual([8, 8])
    expect(isLegal(muehle, position, [5])).toBe(false)
    // While pieces are in hand, none moves.
    expect(isLegal(muehle, position, [0, 1])).toBe(false)
  })

  it('takes a piece after a mill, one outside a mill if there is one', () => {
    const position = playAll([[0], [8], [1], [9], [2]])
    expect(inMill(position.board, 1)).toBe(true)
    expect(position).toMatchObject({ turn: 0, phase: 'remove' })
    expect(muehle.outcome(position)).toBeNull()
    expect(muehle.moves(position)).toEqual([[8], [9]])
    const after = muehle.play(position, [9])
    expect(after).toMatchObject({ turn: 1, phase: 'move', hand: [6, 7] })
    expect(after.board[9]).toBe(EMPTY)

    // All of seat 1's pieces in a mill: any of them may go.
    const all = { ...placed([4, 5, 6], [0, 1, 2]), phase: 'remove' as const }
    expect(muehle.moves(all)).toEqual([[0], [1], [2]])
  })

  it('keeps pieces in a mill while others are free', () => {
    const position = { ...placed([4, 9, 14], [0, 1, 2, 20]), phase: 'remove' as const }
    expect(muehle.moves(position)).toEqual([[20]])
  })

  it('moves pieces along a line to a free neighbour once all are placed', () => {
    const position = placed([0, 9, 21, 23], [1, 2, 3, 16])
    const moves = muehle.moves(position)
    expect(moves).toContainEqual([0, 7])
    expect(moves).not.toContainEqual([0, 1])
    expect(moves).not.toContainEqual([0, 6])
    expect(moves).toContainEqual([9, 8])
    expect(moves).toContainEqual([9, 17])
    expect(muehle.play(position, [0, 7]).quiet).toBe(1)
  })

  it('lets three pieces jump to any free point', () => {
    const position = placed([0, 12, 21], [1, 2, 3, 16])
    expect(flying(position)).toBe(true)
    expect(muehle.moves(position)).toContainEqual([0, 18])
    expect(flying({ ...position, turn: 1 })).toBe(false)
  })

  it('is lost with two pieces left, or none that can move', () => {
    expect(muehle.outcome(placed([0, 9], [5, 12, 13], 0))).toEqual({ winner: 1, line: [] })
    // Seat 0 at 0 and 1, boxed in by seat 1.
    const boxed = placed([0, 1, 2], [7, 9, 3], 0)
    expect(muehle.outcome(boxed)).toBeNull()
    const stuck = placed([0, 1, 2, 4], [7, 9, 3, 5, 10], 0)
    expect(muehle.moves(stuck)).toEqual([])
    expect(muehle.outcome(stuck)).toEqual({ winner: 1, line: [] })
  })

  it('ends a mill-taking game: the last piece taken loses', () => {
    // Seat 0 closes a mill by moving 7 to 0; seat 1 has three pieces left.
    const position = placed([7, 1, 2, 12], [5, 13, 20], 0)
    const mill = playAll([[7, 0]], position)
    expect(mill.phase).toBe('remove')
    const after = muehle.play(mill, [5])
    expect(muehle.outcome(after)).toEqual({ winner: 0, line: [] })
  })

  it('is a draw after many moves without a mill', () => {
    const position = placed([0, 9, 21, 23], [1, 2, 3, 16])
    expect(muehle.outcome({ ...position, quiet: MUEHLE_QUIET - 1 })).toBeNull()
    expect(muehle.outcome({ ...position, quiet: MUEHLE_QUIET })).toBe('draw')
  })

  it('skips the taking when the other player has nothing on the board', () => {
    const board = Array(24).fill(EMPTY)
    board[0] = 0
    board[1] = 0
    const position: Position = { board, turn: 0, hand: [5, 4], phase: 'move', quiet: 0 }
    expect(muehle.play(position, [2])).toMatchObject({ turn: 1, phase: 'move' })
  })
})
