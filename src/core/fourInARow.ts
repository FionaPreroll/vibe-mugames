import { type Board, type BoardGame, EMPTY, findLine } from './board'

const COLUMNS = 7
const ROWS = 6

/**
 * Four in a row, on an upright board of seven columns and six rows: a move is the column, 0 to 6,
 * and the piece falls to the lowest empty cell. Row 0 is the top.
 */
export const fourInARow: BoardGame = {
  id: 'fourinarow',
  columns: COLUMNS,
  rows: ROWS,
  seats: 2,
  start: () => Array(COLUMNS * ROWS).fill(EMPTY),
  legal: (board, move) =>
    Number.isInteger(move) && move >= 0 && move < COLUMNS && board[move] === EMPTY,
  play(board, seat, move) {
    const next = [...board]
    for (let row = ROWS - 1; row >= 0; row--) {
      if (next[row * COLUMNS + move] === EMPTY) {
        next[row * COLUMNS + move] = seat
        break
      }
    }
    return next
  },
  outcome(board: Board) {
    return findLine(board, COLUMNS, 4) ?? (board.slice(0, COLUMNS).includes(EMPTY) ? null : 'draw')
  },
}
