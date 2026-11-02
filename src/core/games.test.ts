import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { type Board, EMPTY } from './board'
import { fourInARow } from './fourInARow'
import { GAMES } from './games'
import { ticTacToe } from './tictactoe'

/** Plays moves in turn, seat 0 first, and returns the board. */
function playAll(game: typeof ticTacToe, moves: number[]): Board {
  let board = game.start()
  moves.forEach((move, i) => {
    expect(game.legal(board, move)).toBe(true)
    board = game.play(board, i % 2, move)
  })
  return board
}

describe('Tic Tac Toe', () => {
  it('is won by three in a row, across, down or diagonally', () => {
    expect(ticTacToe.outcome(playAll(ticTacToe, [0, 3, 1, 4, 2]))).toEqual({
      winner: 0,
      line: [0, 1, 2],
    })
    expect(ticTacToe.outcome(playAll(ticTacToe, [0, 1, 3, 2, 6]))).toEqual({
      winner: 0,
      line: [0, 3, 6],
    })
    expect(ticTacToe.outcome(playAll(ticTacToe, [1, 2, 0, 4, 3, 6]))).toEqual({
      winner: 1,
      line: [6, 4, 2],
    })
  })

  it('is drawn when the board is full without a line', () => {
    const board = playAll(ticTacToe, [0, 1, 2, 4, 3, 5, 7, 6, 8])
    expect(ticTacToe.outcome(board)).toBe('draw')
  })

  it('takes only empty cells on the board', () => {
    const board = playAll(ticTacToe, [4])
    expect(ticTacToe.legal(board, 4)).toBe(false)
    for (const move of [-1, 9, 1.5, Number.NaN]) expect(ticTacToe.legal(board, move)).toBe(false)
  })
})

describe('Four in a row', () => {
  it('drops a piece to the lowest empty cell of its column', () => {
    const board = playAll(fourInARow, [3, 3])
    expect(board[5 * 7 + 3]).toBe(0)
    expect(board[4 * 7 + 3]).toBe(1)
    expect(board.filter((cell) => cell !== EMPTY)).toHaveLength(2)
  })

  it('is won by four in a row, also diagonally', () => {
    // Seat 0 fills the bottom row from the left; seat 1 stacks on top.
    expect(fourInARow.outcome(playAll(fourInARow, [0, 0, 1, 1, 2, 2, 3]))).toEqual({
      winner: 0,
      line: [35, 36, 37, 38],
    })
    // A rising diagonal for seat 0: 0, 1, 2, 3 at heights 1, 2, 3, 4.
    const diagonal = playAll(fourInARow, [0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3])
    expect(fourInARow.outcome(diagonal)).toMatchObject({ winner: 0 })
  })

  it('takes no move into a full column or off the board', () => {
    const board = playAll(fourInARow, [0, 0, 0, 0, 0, 0])
    expect(fourInARow.legal(board, 0)).toBe(false)
    for (const move of [-1, 7, 2.5]) expect(fourInARow.legal(board, move)).toBe(false)
  })

  it('is drawn when the board is full without a line', () => {
    // Columns in pairs, alternating row by row: no colour runs longer than two in any direction.
    const board = Array.from({ length: 42 }, (_, cell) => {
      const row = Math.floor(cell / 7)
      const column = cell % 7
      return (Math.floor(column / 2) + row) % 2
    })
    expect(fourInARow.outcome(board)).toBe('draw')
    // One empty cell at the top: not over yet.
    expect(fourInARow.outcome([EMPTY, ...board.slice(1)])).toBeNull()
  })
})

describe('every game', () => {
  it('ends with a winner or a draw, whatever legal moves are played', () => {
    for (const game of Object.values(GAMES)) {
      fc.assert(
        fc.property(fc.array(fc.nat(game.columns * game.rows), { maxLength: 60 }), (picks) => {
          let board = game.start()
          let seat = 0
          for (const pick of picks) {
            if (game.outcome(board) !== null) break
            const legal = Array.from({ length: game.columns * game.rows }, (_, i) => i).filter(
              (move) => game.legal(board, move),
            )
            const move = legal[pick % legal.length]
            if (move === undefined) break
            board = game.play(board, seat, move)
            seat = 1 - seat
          }
          const outcome = game.outcome(board)
          if (outcome !== null && outcome !== 'draw') {
            for (const cell of outcome.line) expect(board[cell]).toBe(outcome.winner)
          }
          // A full board always has an outcome.
          if (!board.includes(EMPTY)) expect(outcome).not.toBeNull()
        }),
      )
    }
  })
})
