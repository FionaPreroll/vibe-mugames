import { describe, expect, it } from 'vitest'
import { EMPTY, isLegal, plain } from './board'
import { counts, flips, passed, reversi } from './reversi'

/** The cell of a square by its name, a1 at the bottom left. */
function sq(name: string): number {
  return (8 - Number(name.slice(1))) * 8 + (name.charCodeAt(0) - 97)
}

/** A board with pieces by square name: 'x' seat 0, 'o' seat 1. */
function board(pieces: Record<string, 'x' | 'o'>): number[] {
  const cells: number[] = Array(64).fill(EMPTY)
  for (const [name, piece] of Object.entries(pieces)) cells[sq(name)] = piece === 'x' ? 0 : 1
  return cells
}

describe('Reversi', () => {
  it('starts with two pieces each crosswise in the middle, and four moves to open', () => {
    const start = reversi.start()
    expect(counts(start.board)).toEqual([2, 2])
    expect(start.board[sq('d4')]).toBe(0)
    expect(start.board[sq('e5')]).toBe(0)
    expect(start.board[sq('d5')]).toBe(1)
    expect(start.board[sq('e4')]).toBe(1)
    expect(
      reversi
        .moves(start)
        .map(([cell]) => cell)
        .sort((a, b) => (a ?? 0) - (b ?? 0)),
    ).toEqual([sq('d6'), sq('c5'), sq('f4'), sq('e3')].sort((a, b) => a - b))
  })

  it('turns every line of the other’s pieces enclosed, in all directions at once', () => {
    // Seat 0 on d4 encloses o's on d5 (up to d6), e5 (diagonally to f6) and e4 (across to f4).
    const cells = board({ d5: 'o', d6: 'x', e5: 'o', f6: 'x', e4: 'o', f4: 'x', c4: 'o' })
    const p = plain(cells, 0)
    expect(flips(cells, 0, sq('d4')).sort()).toEqual([sq('d5'), sq('e5'), sq('e4')].sort())
    const after = reversi.play(p, [sq('d4')])
    expect(after.board[sq('d4')]).toBe(0)
    for (const name of ['d5', 'e5', 'e4']) expect(after.board[sq(name)]).toBe(0)
    // Not enclosed: c4 has no piece of seat 0 behind it.
    expect(after.board[sq('c4')]).toBe(1)
  })

  it('takes only moves that enclose something', () => {
    const start = reversi.start()
    expect(isLegal(reversi, start, [sq('a1')])).toBe(false)
    expect(isLegal(reversi, start, [sq('d4')])).toBe(false)
    expect(isLegal(reversi, start, [sq('e3')])).toBe(true)
    expect(reversi.play(start, [sq('a1')])).toBe(start)
  })

  it('passes the turn back when the other player cannot move', () => {
    // After x on c1 turns b1, o has nothing left to enclose: x plays again.
    const cells = board({ a1: 'x', b1: 'o', h8: 'x', g8: 'o', f8: 'o' })
    const p = plain(cells, 0)
    const after = reversi.play(p, [sq('c1')])
    expect(after.turn).toBe(0)
    expect(passed(after, [sq('c1')])).toBe(true)
    expect(passed(reversi.play(reversi.start(), [sq('e3')]), [sq('e3')])).toBe(false)
    expect(passed(reversi.start(), null)).toBe(false)
  })

  it('ends when neither can move, won by more pieces, or drawn by as many', () => {
    expect(reversi.outcome(plain(board({ a1: 'x', b1: 'x', h8: 'o' }), 1))).toEqual({
      winner: 0,
      line: [],
    })
    expect(reversi.outcome(plain(board({ a1: 'x', h8: 'o' }), 0))).toBe('draw')
    expect(reversi.outcome(reversi.start())).toBeNull()
  })
})
