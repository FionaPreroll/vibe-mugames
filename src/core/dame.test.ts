import { describe, expect, it } from 'vitest'
import { EMPTY, isLegal, KIND, type Position } from './board'
import { DAME_QUIET, dame, isDark, takingMoves } from './dame'

/** The cell of a square by its name, a1 at seat 0's bottom left. */
function sq(name: string): number {
  const x = name.charCodeAt(0) - 97
  const y = 8 - Number(name.slice(1))
  return y * 8 + x
}

/** A board with the pieces given by square name: 'w' seat 0, 'b' seat 1, capitals crowned. */
function position(pieces: Record<string, string>, turn = 0, quiet = 0): Position {
  const board = Array(64).fill(EMPTY)
  for (const [name, piece] of Object.entries(pieces)) {
    const seat = piece.toLowerCase() === 'w' ? 0 : 1
    board[sq(name)] = piece === piece.toUpperCase() ? seat + KIND : seat
  }
  return { board, turn, hand: [], phase: 'move', quiet }
}

const path = (...names: string[]) => names.map(sq)

describe('Dame', () => {
  it('starts with twelve pieces each on the dark squares', () => {
    const start = dame.start()
    expect(start.board.filter((c) => c === 0)).toHaveLength(12)
    expect(start.board.filter((c) => c === 1)).toHaveLength(12)
    expect(isDark(sq('a1'))).toBe(true)
    expect(start.board[sq('a1')]).toBe(0)
    expect(start.board[sq('h8')]).toBe(1)
    // Seat 0 opens with seven moves, all forward.
    expect(dame.moves(start)).toHaveLength(7)
  })

  it('moves pieces one square diagonally forward', () => {
    const p = position({ c3: 'w', f6: 'b' })
    expect(dame.moves(p)).toEqual(expect.arrayContaining([path('c3', 'b4'), path('c3', 'd4')]))
    expect(dame.moves(p)).toHaveLength(2)
    expect(dame.moves({ ...p, turn: 1 })).toHaveLength(2)
    expect(isLegal(dame, { ...p, turn: 1 }, path('f6', 'e5'))).toBe(true)
    expect(isLegal(dame, { ...p, turn: 1 }, path('f6', 'e7'))).toBe(false)
  })

  it('makes taking a must, forward and backward', () => {
    const p = position({ c3: 'w', g3: 'w', d4: 'b' })
    expect(dame.moves(p)).toEqual([path('c3', 'e5')])
    const back = position({ e5: 'w', d4: 'b', a1: 'w' })
    expect(dame.moves(back)).toEqual([path('e5', 'c3')])
    const after = dame.play(p, path('c3', 'e5'))
    expect(after.board[sq('d4')]).toBe(EMPTY)
    expect(after.board[sq('e5')]).toBe(0)
    expect(after.turn).toBe(1)
  })

  it('jumps on while it can, and lets the player choose the way', () => {
    const p = position({ a1: 'w', b2: 'b', d4: 'b', f6: 'b', h8: 'b' })
    const moves = dame.moves(p)
    expect(moves).toEqual([path('a1', 'c3', 'e5', 'g7')])
    // A fork: from c3 over b4 to a5, or over d4 to e5.
    const fork = position({ a1: 'w', b2: 'b', b4: 'b', d4: 'b' })
    expect(dame.moves(fork)).toEqual(
      expect.arrayContaining([path('a1', 'c3', 'a5'), path('a1', 'c3', 'e5')]),
    )
    // A half-done jump is no move.
    expect(isLegal(dame, p, path('a1', 'c3'))).toBe(false)
    const after = dame.play(p, path('a1', 'c3', 'e5', 'g7'))
    for (const name of ['b2', 'd4', 'f6']) expect(after.board[sq(name)]).toBe(EMPTY)
  })

  it('crowns a piece that ends its move on the far row', () => {
    const p = position({ b7: 'w', h2: 'b' })
    const after = dame.play(p, path('b7', 'a8'))
    expect(after.board[sq('a8')]).toBe(KIND)
    // A piece passing the far row in the middle of a jump stays a piece.
    const through = position({ e5: 'w', d6: 'b', d8: 'b', b8: 'b' })
    const move = path('e5', 'c7')
    expect(dame.moves(through)).toEqual([move])
    expect(dame.play(through, move).board[sq('c7')]).toBe(0)
  })

  it('lets crowned pieces fly and take from afar', () => {
    const p = position({ a1: 'W', h8: 'b', h6: 'b' })
    expect(dame.moves(p)).toHaveLength(6)
    const far = position({ a1: 'W', e5: 'b', h6: 'b' })
    // Over e5, landing on any free square behind it; nothing more to take from there.
    expect(dame.moves(far)).toEqual([path('a1', 'f6'), path('a1', 'g7'), path('a1', 'h8')])
    expect(takingMoves(far)).toEqual(dame.moves(far))
    // A crowned piece takes on from where it lands, round the corner; or stops where it can't.
    const corner = position({ a1: 'W', c3: 'b', f4: 'b' })
    expect(dame.moves(corner)).toEqual(
      expect.arrayContaining([path('a1', 'e5', 'g3'), path('a1', 'e5', 'h2'), path('a1', 'd4')]),
    )
    expect(dame.moves(corner)).not.toContainEqual(path('a1', 'e5'))
  })

  it('jumps no piece twice, and the pieces taken block the way until the move is over', () => {
    // A crowned piece circling round: it may not jump c3 a second time.
    const p = position({ d2: 'W', c3: 'b', e3: 'b', c5: 'b', e5: 'b', a8: 'b' })
    for (const move of dame.moves(p)) {
      const jumped = new Set<number>()
      const after = dame.play(p, move)
      for (const cell of [sq('c3'), sq('e3'), sq('c5'), sq('e5')]) {
        if (after.board[cell] === EMPTY) jumped.add(cell)
      }
      expect(jumped.size).toBe(move.length - 1)
    }
  })

  it('is lost by the player who cannot move', () => {
    expect(dame.outcome(position({ c3: 'w' }, 1))).toEqual({ winner: 0, line: [] })
    // Blocked: seat 1 on a8 cannot step or jump.
    const blocked = position({ a8: 'b', b7: 'w', c6: 'w' }, 1)
    expect(dame.moves(blocked)).toEqual([])
    expect(dame.outcome(blocked)).toEqual({ winner: 0, line: [] })
  })

  it('is a draw after many moves of crowned pieces without taking', () => {
    const p = position({ a1: 'W', h8: 'B' }, 0, DAME_QUIET - 1)
    expect(dame.outcome(p)).toBeNull()
    const after = dame.play(p, path('a1', 'b2'))
    expect(after.quiet).toBe(DAME_QUIET)
    expect(dame.outcome(after)).toBe('draw')
    // A piece that is not crowned moving starts the count again.
    expect(dame.play(position({ c3: 'w', h8: 'B' }, 0, 10), path('c3', 'd4')).quiet).toBe(0)
  })
})
