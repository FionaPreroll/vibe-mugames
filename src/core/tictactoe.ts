import { type BoardGame, EMPTY, findLine, plain } from './board'

/** Three in a row on a board of three by three; a move is the cell, 0 to 8, row by row. */
export const ticTacToe: BoardGame = {
  id: 'tictactoe',
  cells: 9,
  seats: 2,
  kinds: 1,
  steps: 1,
  start: () => plain(Array(9).fill(EMPTY), 0),
  moves: ({ board }) => board.flatMap((cell, i) => (cell === EMPTY ? [[i]] : [])),
  play({ board, turn }, [cell]) {
    const next = [...board]
    if (cell !== undefined) next[cell] = turn
    return plain(next, 1 - turn)
  },
  outcome({ board }) {
    return findLine(board, 3, 3) ?? (board.includes(EMPTY) ? null : 'draw')
  },
}
