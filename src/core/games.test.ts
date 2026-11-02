import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { type Board, type BoardGame, EMPTY, GAME_IDS, isLegal, plain } from './board'
import { fourInARow } from './fourInARow'
import { GAMES, hasHiddenCards } from './games'
import { ticTacToe } from './tictactoe'

/** Plays one-cell moves in turn, seat 0 first, and returns the board. */
function playAll(game: BoardGame, moves: number[]): Board {
  let position = game.start()
  for (const move of moves) {
    expect(isLegal(game, position, [move])).toBe(true)
    position = game.play(position, [move])
  }
  return position.board
}

const outcome = (game: BoardGame, board: Board) => game.outcome(plain(board, 0))

describe('Tic Tac Toe', () => {
  it('is won by three in a row, across, down or diagonally', () => {
    expect(outcome(ticTacToe, playAll(ticTacToe, [0, 3, 1, 4, 2]))).toEqual({
      winner: 0,
      line: [0, 1, 2],
    })
    expect(outcome(ticTacToe, playAll(ticTacToe, [0, 1, 3, 2, 6]))).toEqual({
      winner: 0,
      line: [0, 3, 6],
    })
    expect(outcome(ticTacToe, playAll(ticTacToe, [1, 2, 0, 4, 3, 6]))).toEqual({
      winner: 1,
      line: [6, 4, 2],
    })
  })

  it('is drawn when the board is full without a line', () => {
    const board = playAll(ticTacToe, [0, 1, 2, 4, 3, 5, 7, 6, 8])
    expect(outcome(ticTacToe, board)).toBe('draw')
  })

  it('takes only empty cells on the board', () => {
    const position = plain(playAll(ticTacToe, [4]), 1)
    expect(isLegal(ticTacToe, position, [4])).toBe(false)
    for (const move of [[-1], [9], [1.5], [Number.NaN], [], [0, 1]]) {
      expect(isLegal(ticTacToe, position, move)).toBe(false)
    }
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
    expect(outcome(fourInARow, playAll(fourInARow, [0, 0, 1, 1, 2, 2, 3]))).toEqual({
      winner: 0,
      line: [35, 36, 37, 38],
    })
    // A rising diagonal for seat 0: 0, 1, 2, 3 at heights 1, 2, 3, 4.
    const diagonal = playAll(fourInARow, [0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3])
    expect(outcome(fourInARow, diagonal)).toMatchObject({ winner: 0 })
  })

  it('takes no move into a full column or off the board', () => {
    const position = plain(playAll(fourInARow, [0, 0, 0, 0, 0, 0]), 0)
    expect(isLegal(fourInARow, position, [0])).toBe(false)
    for (const move of [[-1], [7], [2.5]]) expect(isLegal(fourInARow, position, move)).toBe(false)
  })

  it('is drawn when the board is full without a line', () => {
    // Columns in pairs, alternating row by row: no colour runs longer than two in any direction.
    const board = Array.from({ length: 42 }, (_, cell) => {
      const row = Math.floor(cell / 7)
      const column = cell % 7
      return (Math.floor(column / 2) + row) % 2
    })
    expect(outcome(fourInARow, board)).toBe('draw')
    // One empty cell at the top: not over yet.
    expect(outcome(fourInARow, [EMPTY, ...board.slice(1)])).toBeNull()
  })
})

describe('every game', () => {
  it('ends with a winner or a draw, whatever legal moves are played', () => {
    for (const game of Object.values(GAMES)) {
      fc.assert(
        fc.property(fc.array(fc.nat(10_000), { maxLength: 300 }), (picks) => {
          let position = game.start()
          for (const pick of picks) {
            if (game.outcome(position) !== null) break
            const moves = game.moves(position)
            const move = moves[pick % moves.length]
            // A game goes on only while the seat to move has a move.
            expect(move).toBeDefined()
            if (move === undefined) break
            expect(move.length).toBeLessThanOrEqual(game.steps)
            position = game.play(position, move)
            expect(position.board).toHaveLength(game.cells)
            expect(position.turn).toBeGreaterThanOrEqual(0)
            expect(position.turn).toBeLessThan(game.seats)
          }
          const outcome = game.outcome(position)
          if (outcome !== null && outcome !== 'draw') {
            for (const cell of outcome.line) expect(position.board[cell]).toBe(outcome.winner)
          }
          // A game with no move left is over.
          if (game.moves(position).length === 0) expect(outcome).not.toBeNull()
        }),
        { numRuns: 60 },
      )
    }
  })
})

describe('hidden cards', () => {
  it('are in Miau-Miau only: board games show everything to everyone', () => {
    expect(GAME_IDS.filter(hasHiddenCards)).toEqual(['miaumiau'])
  })
})
