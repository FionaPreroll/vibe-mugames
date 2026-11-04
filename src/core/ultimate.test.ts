import { describe, expect, it } from 'vitest'
import { EMPTY, isLegal, KIND, type Position } from './board'
import {
  bigBoard,
  cellOf,
  lastMark,
  openBoards,
  SPOTS,
  sentTo,
  smallOutcome,
  ultimate,
} from './ultimate'

/** Plays the cells in turn, seat 0 first, checking each is legal. */
function playAll(cells: number[], from = ultimate.start()): Position {
  let position = from
  for (const cell of cells) {
    expect(isLegal(ultimate, position, [cell])).toBe(true)
    position = ultimate.play(position, [cell])
  }
  return position
}

/** A position with these marks set, seat by seat, and nothing set last. */
function withMarks(marks: Record<number, number>, turn = 0): Position {
  const board = Array(SPOTS * SPOTS).fill(EMPTY)
  for (const [cell, seat] of Object.entries(marks)) board[Number(cell)] = seat
  return { board, turn, hand: [], phase: 'move', quiet: 0 }
}

describe('Ultimate Tic Tac Toe', () => {
  it('starts with 81 empty cells, any of them open', () => {
    const start = ultimate.start()
    expect(start.board).toHaveLength(81)
    expect(ultimate.moves(start)).toHaveLength(81)
    expect(openBoards(start.board)).toHaveLength(9)
    expect(sentTo(start.board)).toBeNull()
  })

  it('sends the next player to the small board of the cell just taken', () => {
    // Seat 0 takes the top right spot of the middle board: seat 1 must play top right.
    const position = playAll([cellOf(4, 2)])
    expect(position.turn).toBe(1)
    expect(sentTo(position.board)).toBe(2)
    const moves = ultimate.moves(position)
    expect(moves).toHaveLength(9)
    expect(moves.every(([cell]) => Math.floor((cell ?? 0) / SPOTS) === 2)).toBe(true)
    expect(isLegal(ultimate, position, [cellOf(4, 0)])).toBe(false)
  })

  it('marks only the newest mark as set last', () => {
    const position = playAll([cellOf(4, 2), cellOf(2, 4)])
    expect(lastMark(position.board)).toBe(cellOf(2, 4))
    expect(position.board[cellOf(4, 2)]).toBe(0)
    expect(position.board[cellOf(2, 4)]).toBe(1 + KIND)
    expect(position.board.filter((cell) => cell >= KIND)).toHaveLength(1)
  })

  it('wins a small board with three in a row, and then lets nobody play there', () => {
    // Seat 1 takes the middle row of board 0, playing where it is sent.
    const position = playAll([
      cellOf(0, 0),
      cellOf(0, 3),
      cellOf(3, 0),
      cellOf(0, 4),
      cellOf(4, 0),
      cellOf(0, 5),
      cellOf(5, 0),
    ])
    expect(smallOutcome(position.board, 0)).toEqual({
      winner: 1,
      line: [cellOf(0, 3), cellOf(0, 4), cellOf(0, 5)],
    })
    expect(bigBoard(position.board)[0]).toBe(1)
    // Sent to board 0, which is closed: seat 1 may play in any other.
    expect(sentTo(position.board)).toBeNull()
    expect(openBoards(position.board)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(isLegal(ultimate, position, [cellOf(0, 1)])).toBe(false)
  })

  it('lets a player sent to a closed board play in any open one', () => {
    // Board 0 is won by seat 0; seat 1's last mark sends seat 0 there.
    const position = withMarks({
      [cellOf(0, 0)]: 0,
      [cellOf(0, 1)]: 0,
      [cellOf(0, 2)]: 0,
      [cellOf(5, 0)]: 1 + KIND,
    })
    expect(sentTo(position.board)).toBeNull()
    const boards = new Set(ultimate.moves(position).map(([cell]) => Math.floor((cell ?? 0) / 9)))
    expect([...boards].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('counts a full small board without a line as nobody’s', () => {
    const full = [0, 1, 0, 0, 1, 1, 1, 0, 0]
    const marks: Record<number, number> = {}
    full.forEach((seat, spot) => {
      marks[cellOf(3, spot)] = seat
    })
    const position = withMarks(marks)
    expect(smallOutcome(position.board, 3)).toBe('draw')
    expect(bigBoard(position.board)[3]).toBe(EMPTY)
    expect(openBoards(position.board)).not.toContain(3)
  })

  it('is won by three small boards in a row, with their lines', () => {
    const marks: Record<number, number> = {}
    for (const small of [0, 4, 8]) {
      for (const spot of [0, 1, 2]) marks[cellOf(small, spot)] = 1
    }
    const position = withMarks(marks)
    const outcome = ultimate.outcome(position)
    expect(outcome).toMatchObject({ winner: 1 })
    expect(outcome !== 'draw' && outcome?.line).toHaveLength(9)
    expect(ultimate.moves(position)).toEqual([])
  })

  it('is drawn once every small board is closed without three in a row', () => {
    // Boards won in the pattern of a drawn game of Tic Tac Toe.
    const winners = [0, 1, 0, 0, 1, 1, 1, 0, 0]
    const marks: Record<number, number> = {}
    winners.forEach((seat, small) => {
      for (const spot of [0, 1, 2]) marks[cellOf(small, spot)] = seat
      // The rest of each board is filled without another line.
      for (const spot of [3, 4, 5, 6, 7, 8]) marks[cellOf(small, spot)] = (spot + 1) % 2
    })
    const position = withMarks(marks)
    expect(ultimate.outcome(position)).toBe('draw')
    expect(ultimate.outcome(withMarks({}))).toBeNull()
  })

  it('takes no mark on a taken cell or off the board', () => {
    const position = playAll([cellOf(4, 4)])
    for (const move of [[cellOf(4, 4)], [-1], [81], [1.5], [], [0, 1]]) {
      expect(isLegal(ultimate, position, move)).toBe(false)
    }
    expect(ultimate.play(position, [cellOf(4, 4)])).toBe(position)
  })
})
