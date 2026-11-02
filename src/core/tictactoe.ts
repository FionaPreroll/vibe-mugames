import { type Board, type BoardGame, EMPTY, findLine } from './board'

/** Three in a row on a board of three by three; a move is the cell, 0 to 8, row by row. */
export const ticTacToe: BoardGame = {
  id: 'tictactoe',
  columns: 3,
  rows: 3,
  seats: 2,
  start: () => Array(9).fill(EMPTY),
  legal: (board, move) => Number.isInteger(move) && board[move] === EMPTY,
  play(board, seat, move) {
    const next = [...board]
    next[move] = seat
    return next
  },
  outcome(board: Board) {
    return findLine(board, 3, 3) ?? (board.includes(EMPTY) ? null : 'draw')
  },
}
