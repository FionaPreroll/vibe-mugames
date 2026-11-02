import { type BoardGame, EMPTY, findLine, plain } from './board'

export const FOUR_COLUMNS = 7
export const FOUR_ROWS = 6

/**
 * Four in a row, on an upright board of seven columns and six rows: a move is the column, 0 to 6,
 * and the piece falls to the lowest empty cell. Row 0 is the top.
 */
export const fourInARow: BoardGame = {
  id: 'fourinarow',
  cells: FOUR_COLUMNS * FOUR_ROWS,
  seats: 2,
  kinds: 1,
  steps: 1,
  start: () => plain(Array(FOUR_COLUMNS * FOUR_ROWS).fill(EMPTY), 0),
  moves: ({ board }) =>
    board.slice(0, FOUR_COLUMNS).flatMap((cell, column) => (cell === EMPTY ? [[column]] : [])),
  play({ board, turn }, [column]) {
    const next = [...board]
    for (let row = FOUR_ROWS - 1; row >= 0 && column !== undefined; row--) {
      if (next[row * FOUR_COLUMNS + column] === EMPTY) {
        next[row * FOUR_COLUMNS + column] = turn
        break
      }
    }
    return plain(next, 1 - turn)
  },
  outcome({ board }) {
    return (
      findLine(board, FOUR_COLUMNS, 4) ??
      (board.slice(0, FOUR_COLUMNS).includes(EMPTY) ? null : 'draw')
    )
  },
}
