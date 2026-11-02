import {
  type Board,
  type BoardGame,
  EMPTY,
  isCrowned,
  KIND,
  type Move,
  type Position,
  seatOf,
} from './board'

/**
 * Dame (draughts) on 8 by 8 squares, played on the dark ones, twelve pieces each. Pieces move
 * one square diagonally forward and take by jumping over an opponent's piece to the free square
 * behind it, forward or backward, again and again while they can. Taking is a must, and a jump
 * goes on to its end, but any of the ways to take may be chosen. A piece that ends its move on
 * the far row is crowned: a crowned piece (a "Dame") moves any distance diagonally, and takes
 * a piece at any distance, landing on any free square behind it. Pieces taken leave the board
 * once the move is over, and none is jumped twice. A player with no move left loses.
 *
 * Cells are numbered row by row, row 0 at the top: seat 0 starts at the bottom and moves up.
 * A move is the path of the piece: where it stands, and every square it lands on.
 */

export const DAME_SIZE = 8
const ROWS_OF_PIECES = 3
/** Moves in a row of crowned pieces only, without taking, that make a draw. */
export const DAME_QUIET = 50

const DIAGONALS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const

export function isDark(cell: number): boolean {
  return (Math.floor(cell / DAME_SIZE) + (cell % DAME_SIZE)) % 2 === 1
}

/** The cell a step of (dx, dy) away, or undefined off the board. */
function step(cell: number, dx: number, dy: number, distance = 1): number | undefined {
  const x = (cell % DAME_SIZE) + dx * distance
  const y = Math.floor(cell / DAME_SIZE) + dy * distance
  return x < 0 || x >= DAME_SIZE || y < 0 || y >= DAME_SIZE ? undefined : y * DAME_SIZE + x
}

/** The row a seat's pieces are crowned on. */
function farRow(seat: number): number {
  return seat === 0 ? 0 : DAME_SIZE - 1
}

/** Every way for the piece on `from` to take, each to its end. */
function jumps(board: Board, from: number): Move[] {
  const piece = board[from] ?? EMPTY
  const seat = seatOf(piece)
  const crowned = isCrowned(piece)
  const found: Move[] = []
  // The piece has left its square; pieces it took stay until the move is over.
  const lifted = board.map((cell, i) => (i === from ? EMPTY : cell))
  const extend = (path: number[], at: number, taken: number[]) => {
    let further = false
    for (const [dx, dy] of DIAGONALS) {
      let distance = 1
      let over = step(at, dx, dy)
      while (crowned && over !== undefined && lifted[over] === EMPTY) {
        over = step(at, dx, dy, ++distance)
      }
      if (over === undefined || taken.includes(over)) continue
      const cell = lifted[over] ?? EMPTY
      if (cell === EMPTY || seatOf(cell) === seat) continue
      for (let beyond = 1; ; beyond++) {
        const land = step(over, dx, dy, beyond)
        if (land === undefined || lifted[land] !== EMPTY) break
        further = true
        extend([...path, land], land, [...taken, over])
        if (!crowned) break
      }
    }
    if (!further && path.length > 1) found.push(path)
  }
  extend([from], from, [])
  return found
}

/** The moves of the piece on `from` that take nothing. */
function steps(board: Board, from: number): Move[] {
  const piece = board[from] ?? EMPTY
  const crowned = isCrowned(piece)
  const forward = seatOf(piece) === 0 ? -1 : 1
  const found: Move[] = []
  for (const [dx, dy] of DIAGONALS) {
    if (!crowned && dy !== forward) continue
    for (let distance = 1; ; distance++) {
      const to = step(from, dx, dy, distance)
      if (to === undefined || board[to] !== EMPTY) break
      found.push([from, to])
      if (!crowned) break
    }
  }
  return found
}

function piecesOf(board: Board, seat: number): number[] {
  return board.flatMap((cell, i) => (seatOf(cell) === seat ? [i] : []))
}

/** Every move that takes, for the seat to move: if there is one, the seat must take. */
export function takingMoves(position: Position): Move[] {
  return piecesOf(position.board, position.turn).flatMap((from) => jumps(position.board, from))
}

export const dame: BoardGame = {
  id: 'dame',
  cells: DAME_SIZE * DAME_SIZE,
  seats: 2,
  kinds: 2,
  // Twelve pieces to take at most, and the square it starts on.
  steps: 13,
  start() {
    const board = Array.from({ length: DAME_SIZE * DAME_SIZE }, (_, cell) => {
      const row = Math.floor(cell / DAME_SIZE)
      if (!isDark(cell)) return EMPTY
      if (row < ROWS_OF_PIECES) return 1
      if (row >= DAME_SIZE - ROWS_OF_PIECES) return 0
      return EMPTY
    })
    return { board, turn: 0, hand: [], phase: 'move', quiet: 0 }
  },

  moves(position) {
    const taking = takingMoves(position)
    if (taking.length > 0) return taking
    return piecesOf(position.board, position.turn).flatMap((from) => steps(position.board, from))
  },

  play(position, move) {
    const { turn } = position
    const board = [...position.board]
    const from = move[0]
    const to = move[move.length - 1]
    if (from === undefined || to === undefined) return position
    const piece = board[from] ?? turn
    board[from] = EMPTY
    let took = false
    for (let leg = 1; leg < move.length; leg++) {
      const a = move[leg - 1] ?? from
      const b = move[leg] ?? to
      const dx = Math.sign((b % DAME_SIZE) - (a % DAME_SIZE))
      const dy = Math.sign(Math.floor(b / DAME_SIZE) - Math.floor(a / DAME_SIZE))
      for (let at = step(a, dx, dy); at !== undefined && at !== b; at = step(at, dx, dy)) {
        if (board[at] !== EMPTY) {
          board[at] = EMPTY
          took = true
        }
      }
    }
    const crown = !isCrowned(piece) && Math.floor(to / DAME_SIZE) === farRow(turn)
    board[to] = crown ? piece + KIND : piece
    const quiet = took || !isCrowned(piece) ? 0 : position.quiet + 1
    return { board, turn: 1 - turn, hand: [], phase: 'move', quiet }
  },

  outcome(position) {
    if (dame.moves(position).length === 0) return { winner: 1 - position.turn, line: [] }
    return position.quiet >= DAME_QUIET ? 'draw' : null
  },
}
