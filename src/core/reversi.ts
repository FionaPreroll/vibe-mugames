import { type Board, type BoardGame, EMPTY, type Move, type Position } from './board'

/**
 * Reversi on 8 by 8 squares, starting with two pieces each crosswise in the middle. A player
 * places a piece so that it encloses one or more lines of the other's pieces, across, down or
 * diagonally, between it and another of their own: every piece enclosed turns to their colour.
 * A player who cannot enclose anything passes, and the other plays again; once neither can,
 * the game is over, and whoever has more pieces on the board wins.
 *
 * Cells are numbered row by row, row 0 at the top. A move is [cell], where the piece goes.
 */

export const REVERSI_SIZE = 8

const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const

/** The pieces a piece of `seat` on `cell` would turn: none if the move is not allowed. */
export function flips(board: Board, seat: number, cell: number): number[] {
  if (board[cell] !== EMPTY) return []
  const turned: number[] = []
  const x0 = cell % REVERSI_SIZE
  const y0 = Math.floor(cell / REVERSI_SIZE)
  for (const [dx, dy] of DIRECTIONS) {
    const line: number[] = []
    for (let x = x0 + dx, y = y0 + dy; ; x += dx, y += dy) {
      if (x < 0 || x >= REVERSI_SIZE || y < 0 || y >= REVERSI_SIZE) break
      const at = y * REVERSI_SIZE + x
      const piece = board[at]
      if (piece === EMPTY) break
      if (piece === seat) {
        turned.push(...line)
        break
      }
      line.push(at)
    }
  }
  return turned
}

/** Every cell where `seat` may place a piece now. */
function places(board: Board, seat: number): number[] {
  return board.flatMap((_, cell) => (flips(board, seat, cell).length > 0 ? [cell] : []))
}

/** Pieces on the board, by seat. */
export function counts(board: Board): [number, number] {
  return [board.filter((cell) => cell === 0).length, board.filter((cell) => cell === 1).length]
}

export const reversi: BoardGame = {
  id: 'reversi',
  cells: REVERSI_SIZE * REVERSI_SIZE,
  seats: 2,
  kinds: 1,
  steps: 1,
  start() {
    const board: number[] = Array(REVERSI_SIZE * REVERSI_SIZE).fill(EMPTY)
    const mid = REVERSI_SIZE / 2
    const at = (x: number, y: number) => y * REVERSI_SIZE + x
    board[at(mid - 1, mid - 1)] = 1
    board[at(mid, mid)] = 1
    board[at(mid, mid - 1)] = 0
    board[at(mid - 1, mid)] = 0
    return { board, turn: 0, hand: [], phase: 'move', quiet: 0 }
  },

  moves(position) {
    return places(position.board, position.turn).map((cell): Move => [cell])
  },

  play(position, move) {
    const [cell] = move
    const seat = position.turn
    if (cell === undefined) return position
    const turned = flips(position.board, seat, cell)
    if (turned.length === 0) return position
    const board = [...position.board]
    board[cell] = seat
    for (const at of turned) board[at] = seat
    // The other player passes if they cannot place a piece anywhere.
    const other = 1 - seat
    const turn = places(board, other).length > 0 ? other : seat
    return { board, turn, hand: [], phase: 'move', quiet: 0 }
  },

  outcome(position: Position) {
    if (reversi.moves(position).length > 0) return null
    const [a, b] = counts(position.board)
    if (a === b) return 'draw'
    return { winner: a > b ? 0 : 1, line: [] }
  },
}

/**
 * Whether the other player had to pass before this position: the piece placed last is of the
 * seat whose turn it is again. False before the first move.
 */
export function passed(position: Position, last: Move | null): boolean {
  const cell = last?.[0]
  return cell !== undefined && position.board[cell] === position.turn
}
