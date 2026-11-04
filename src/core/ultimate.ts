import { type Board, type BoardGame, EMPTY, findLine, KIND, type Move, seatOf } from './board'

/**
 * Ultimate Tic Tac Toe: nine boards of Tic Tac Toe, laid out as one big board of three by three.
 * In turn, the players set a mark into a small board. The cell it takes there sends the other
 * player to the small board in the same place of the big one: a mark in the top right cell sends
 * them to the top right board. Three in a row in a small board win it; a full small board without
 * a line is nobody's. A board that is won or full takes no more marks, and whoever is sent there
 * may play in any board still open. Three small boards won in a row, across, down or diagonally,
 * win the game; once every board is closed without such a line, it is a draw.
 *
 * The board's 81 cells are the small boards one after the other, each row by row: cell
 * `9 * board + spot`, with the boards and the spots in them both numbered 0 to 8, row by row from
 * the top left. Each cell is empty or the seat whose mark it holds; the mark set last holds its
 * seat plus KIND, as that says where the next player is sent. A move is [cell].
 */

/** Cells of one small board, and small boards on the big one. */
export const SPOTS = 9

const CELLS = SPOTS * SPOTS

/** The cell of `spot` in the small board `small`. */
export function cellOf(small: number, spot: number): number {
  return small * SPOTS + spot
}

/** The small board a cell lies in. */
export function smallOf(cell: number): number {
  return Math.floor(cell / SPOTS)
}

/** The cells of one small board, as a board of Tic Tac Toe: each empty or a seat. */
function smallBoard(board: Board, small: number): number[] {
  return board.slice(small * SPOTS, (small + 1) * SPOTS).map(seatOf)
}

/** How a small board stands: won by a seat, with its line; full ('draw'); or open (null). */
export function smallOutcome(
  board: Board,
  small: number,
): { readonly winner: number; readonly line: readonly number[] } | 'draw' | null {
  const cells = smallBoard(board, small)
  const won = findLine(cells, 3, 3)
  if (won && won !== 'draw') {
    return { winner: won.winner, line: won.line.map((spot) => cellOf(small, spot)) }
  }
  return cells.includes(EMPTY) ? null : 'draw'
}

/** The big board: for each small board, the seat that won it, or EMPTY. */
export function bigBoard(board: Board): number[] {
  return Array.from({ length: SPOTS }, (_, small) => {
    const result = smallOutcome(board, small)
    return result && result !== 'draw' ? result.winner : EMPTY
  })
}

/** The cell of the mark set last, or null before the first move. */
export function lastMark(board: Board): number | null {
  const cell = board.findIndex((piece) => piece !== EMPTY && piece >= KIND)
  return cell < 0 ? null : cell
}

/**
 * The small boards the seat to move may play in: the one the last mark sends them to, or every
 * open one if that is closed, or at the start.
 */
export function openBoards(board: Board): number[] {
  const open = Array.from({ length: SPOTS }, (_, small) => small).filter(
    (small) => smallOutcome(board, small) === null,
  )
  const last = lastMark(board)
  const sent = last === null ? null : last % SPOTS
  return sent !== null && open.includes(sent) ? [sent] : open
}

/** The small board the last mark sends the seat to move to, if it is still open there. */
export function sentTo(board: Board): number | null {
  const last = lastMark(board)
  if (last === null) return null
  const sent = last % SPOTS
  return smallOutcome(board, sent) === null ? sent : null
}

export const ultimate: BoardGame = {
  id: 'ultimate',
  cells: CELLS,
  seats: 2,
  kinds: 2,
  steps: 1,
  start: () => ({ board: Array(CELLS).fill(EMPTY), turn: 0, hand: [], phase: 'move', quiet: 0 }),

  moves({ board }) {
    if (ultimate.outcome({ board, turn: 0, hand: [], phase: 'move', quiet: 0 }) !== null) return []
    const found: Move[] = []
    for (const small of openBoards(board)) {
      for (let spot = 0; spot < SPOTS; spot++) {
        const cell = cellOf(small, spot)
        if (board[cell] === EMPTY) found.push([cell])
      }
    }
    return found
  },

  play(position, [cell]) {
    if (cell === undefined || position.board[cell] !== EMPTY) return position
    const board = position.board.map(seatOf)
    board[cell] = position.turn + KIND
    return { board, turn: 1 - position.turn, hand: [], phase: 'move', quiet: 0 }
  },

  outcome({ board }) {
    const won = findLine(bigBoard(board), 3, 3)
    if (won && won !== 'draw') {
      const line = won.line.flatMap((small) => {
        const result = smallOutcome(board, small)
        return result && result !== 'draw' ? result.line : []
      })
      return { winner: won.winner, line }
    }
    const closed = Array.from({ length: SPOTS }, (_, small) => smallOutcome(board, small))
    return closed.every((result) => result !== null) ? 'draw' : null
  },
}
