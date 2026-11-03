import { type Board, type BoardGame, EMPTY, type Move } from './board'

/**
 * Käsekästchen (dots and boxes) on 6 by 6 dots, which make 5 by 5 boxes. In turn, the players
 * draw a line between two neighbouring dots, across or down. Whoever draws the fourth side of a
 * box claims it and draws again; a line that closes no box passes the turn. Once every line is
 * drawn, whoever holds more boxes wins: with 25 boxes, there is no draw.
 *
 * The board's cells are the lines, then the boxes, each empty or the seat that drew or holds it:
 * first the lines across, row by row (6 rows of 5), then the lines down (5 rows of 6), then the
 * boxes, row by row (5 rows of 5), row 0 at the top. A move is [line].
 */

/** Boxes in a row, and rows of boxes. */
export const BOXES = 5
/** Lines across, which come first among the cells. */
export const ACROSS = (BOXES + 1) * BOXES
/** All lines: across, then down. */
export const LINES = 2 * ACROSS
const CELLS = LINES + BOXES * BOXES

/** The line across above the box in row `y` and column `x` (y up to BOXES, for the bottom). */
export function across(x: number, y: number): number {
  return y * BOXES + x
}

/** The line down left of the box in row `y` and column `x` (x up to BOXES, for the right). */
export function down(x: number, y: number): number {
  return ACROSS + y * (BOXES + 1) + x
}

/** The cell of the box in row `y` and column `x`. */
export function box(x: number, y: number): number {
  return LINES + y * BOXES + x
}

/** The four lines around a box, given by its cell. */
export function sides(boxCell: number): [number, number, number, number] {
  const index = boxCell - LINES
  const x = index % BOXES
  const y = Math.floor(index / BOXES)
  return [across(x, y), across(x, y + 1), down(x, y), down(x + 1, y)]
}

/** The boxes on either side of a line: one at the edge, two inside. */
export function boxesBeside(line: number): number[] {
  if (line < ACROSS) {
    const x = line % BOXES
    const y = Math.floor(line / BOXES)
    return [y - 1, y].filter((row) => row >= 0 && row < BOXES).map((row) => box(x, row))
  }
  const index = line - ACROSS
  const x = index % (BOXES + 1)
  const y = Math.floor(index / (BOXES + 1))
  return [x - 1, x].filter((column) => column >= 0 && column < BOXES).map((col) => box(col, y))
}

/** Boxes held, by seat. */
export function boxCounts(board: Board): [number, number] {
  const boxes = board.slice(LINES)
  return [boxes.filter((cell) => cell === 0).length, boxes.filter((cell) => cell === 1).length]
}

/** Whether this move closed a box, so its player draws again. */
export function closedBox(board: Board, last: Move | null): boolean {
  const line = last?.[0]
  if (line === undefined || line >= LINES) return false
  return boxesBeside(line).some((cell) => sides(cell).every((side) => board[side] !== EMPTY))
}

export const kaesekaestchen: BoardGame = {
  id: 'kaesekaestchen',
  cells: CELLS,
  seats: 2,
  kinds: 1,
  steps: 1,
  start() {
    return { board: Array(CELLS).fill(EMPTY), turn: 0, hand: [], phase: 'move', quiet: 0 }
  },

  moves(position) {
    const found: Move[] = []
    for (let line = 0; line < LINES; line++) {
      if (position.board[line] === EMPTY) found.push([line])
    }
    return found
  },

  play(position, move) {
    const [line] = move
    const seat = position.turn
    if (line === undefined || line >= LINES || position.board[line] !== EMPTY) return position
    const board = [...position.board]
    board[line] = seat
    let closed = false
    for (const cell of boxesBeside(line)) {
      if (sides(cell).every((side) => board[side] !== EMPTY)) {
        board[cell] = seat
        closed = true
      }
    }
    return { board, turn: closed ? seat : 1 - seat, hand: [], phase: 'move', quiet: 0 }
  },

  outcome(position) {
    if (position.board.slice(0, LINES).includes(EMPTY)) return null
    const [a, b] = boxCounts(position.board)
    if (a === b) return 'draw'
    return { winner: a > b ? 0 : 1, line: [] }
  },
}
