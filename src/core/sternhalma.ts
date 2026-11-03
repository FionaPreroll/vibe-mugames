import { type Board, type BoardGame, EMPTY, type Move, type Position, seatOf } from './board'

/**
 * Sternhalma (star halma) for two to six players, on a star of 121 holes: a hexagon with a
 * triangle of ten holes on each of its six sides. Each player starts with ten pieces in a
 * triangle, and brings them all across into the triangle opposite. In turn, a player moves one
 * piece: a step to a free neighbouring hole, or jumps, each over one neighbouring piece (anyone's)
 * to the free hole straight behind it, as many jumps in a row as they like. Nothing is taken.
 * The first to fill the opposite triangle with their pieces wins. A piece of another player that
 * never left its own triangle cannot spoil it: if the triangle is full, and every other piece in
 * it stands in its own starting triangle, its player wins. A player who cannot move passes; if
 * nobody can, or for a long time no piece gets into its triangle, the game is a draw.
 *
 * The holes lie on rows 0 to 16, top to bottom, and are numbered row by row, left to right.
 * Within a row, a hole's `x` counts in half steps, so that neighbours in the rows above and
 * below are one off: x runs from 0 to 24 on the widest rows. A move is the path of the piece:
 * the hole where it stands, then each hole it lands on. The triangles are numbered clockwise
 * from the bottom: 0 bottom, 1 bottom left, 2 top left, 3 top, 4 top right, 5 bottom right.
 * Seat 0 starts at the bottom.
 */

export const STERN_MIN = 2
export const STERN_MAX = 6
/** Pieces per player, the holes of a triangle. */
export const STERN_PIECES = 10
/** Rounds in a row in which no piece gets into its triangle, that make a draw. */
export const STERN_QUIET_ROUNDS = 30

/** The middle of the star, in the half steps of `x`. */
const MID_X = 12

/** Whether (x, y) is a hole of the star: in the triangle pointing up, or the one pointing down. */
function isHole(x: number, y: number): boolean {
  if ((x + y) % 2 !== 0 || y < 0 || y > 16) return false
  const off = Math.abs(x - MID_X)
  return (y <= 12 && off <= y) || (y >= 4 && off <= 16 - y)
}

/** Every hole as [x, y], in the order of their numbers. */
export const STERN_HOLES: readonly (readonly [number, number])[] = (() => {
  const holes: [number, number][] = []
  for (let y = 0; y <= 16; y++) {
    for (let x = 0; x <= 2 * MID_X; x++) if (isHole(x, y)) holes.push([x, y])
  }
  return holes
})()

const NUMBER = new Map(STERN_HOLES.map(([x, y], hole) => [`${x},${y}`, hole]))

/** The hole at (x, y), or undefined off the star. */
function holeAt(x: number, y: number): number | undefined {
  return NUMBER.get(`${x},${y}`)
}

/** The six directions to a neighbouring hole. */
const DIRECTIONS = [
  [2, 0],
  [-2, 0],
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
] as const

/** The triangle a hole is in, 0 to 5, or -1 in the hexagon in the middle. */
function triangleAt(x: number, y: number): number {
  const off = Math.abs(x - MID_X)
  if (y <= 3) return 3
  if (y >= 13) return 0
  if (y <= 7 && off > y) return x < MID_X ? 2 : 4
  if (y >= 9 && off > 16 - y) return x < MID_X ? 1 : 5
  return -1
}

/** The triangle each hole is in, 0 to 5, or -1 in the middle. */
export const STERN_TRIANGLE: readonly number[] = STERN_HOLES.map(([x, y]) => triangleAt(x, y))

/** The holes of each triangle. */
const TRIANGLES: readonly (readonly number[])[] = [0, 1, 2, 3, 4, 5].map((triangle) =>
  STERN_HOLES.flatMap((_, hole) => (STERN_TRIANGLE[hole] === triangle ? [hole] : [])),
)

/** The starting triangle of each seat, by the number of players: always across from another. */
const HOMES: Readonly<Record<number, readonly number[]>> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
}

/** How many play, by the pieces on the board: nothing is ever taken, so every seat has some. */
export function sternSeats(board: Board): number {
  let most = -1
  for (const cell of board) most = Math.max(most, seatOf(cell))
  return Math.min(STERN_MAX, Math.max(STERN_MIN, most + 1))
}

/** The triangle where `seat` starts, among `seats` players. */
export function home(seat: number, seats: number): number {
  return HOMES[seats]?.[seat] ?? 0
}

/** The triangle `seat` brings its pieces to: the one opposite its start. */
export function target(seat: number, seats: number): number {
  return (home(seat, seats) + 3) % 6
}

/** The holes of a triangle. */
export function triangle(index: number): readonly number[] {
  return TRIANGLES[index] ?? []
}

/** Every hole the piece on `from` can reach, each with one way there: [from, …, to]. */
function reach(board: Board, from: number): Move[] {
  const found: Move[] = []
  const [fx, fy] = STERN_HOLES[from] ?? [0, 0]
  for (const [dx, dy] of DIRECTIONS) {
    const to = holeAt(fx + dx, fy + dy)
    if (to !== undefined && board[to] === EMPTY) found.push([from, to])
  }
  // Jumps, breadth first: the shortest way to each hole, which is never the one it left.
  const paths = new Map<number, number[]>([[from, [from]]])
  const queue = [from]
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    const path = paths.get(next) ?? [from]
    const [x, y] = STERN_HOLES[next] ?? [0, 0]
    for (const [dx, dy] of DIRECTIONS) {
      const over = holeAt(x + dx, y + dy)
      const land = holeAt(x + 2 * dx, y + 2 * dy)
      if (over === undefined || land === undefined || paths.has(land)) continue
      if (over === from || board[over] === EMPTY || board[land] !== EMPTY) continue
      const longer = [...path, land]
      paths.set(land, longer)
      queue.push(land)
      found.push(longer)
    }
  }
  return found
}

function movesOf(board: Board, seat: number): Move[] {
  return board.flatMap((cell, hole) => (cell === seat ? reach(board, hole) : []))
}

/** Whether `seat` has filled its triangle, with its own pieces or ones that never left home. */
function filled(board: Board, seat: number, seats: number): boolean {
  let own = 0
  for (const hole of triangle(target(seat, seats))) {
    const cell = board[hole] ?? EMPTY
    if (cell === EMPTY) return false
    if (cell === seat) own++
    else if (STERN_TRIANGLE[hole] !== home(cell, seats)) return false
  }
  return own > 0
}

export const sternhalma: BoardGame = {
  id: 'sternhalma',
  cells: STERN_HOLES.length,
  seats: STERN_MAX,
  minSeats: STERN_MIN,
  kinds: 1,
  // A path of jumps lands on each hole once at most.
  steps: STERN_HOLES.length,
  start(seats = STERN_MAX) {
    const players = Math.min(STERN_MAX, Math.max(STERN_MIN, seats))
    const board: number[] = Array(STERN_HOLES.length).fill(EMPTY)
    for (let seat = 0; seat < players; seat++) {
      for (const hole of triangle(home(seat, players))) board[hole] = seat
    }
    return { board, turn: 0, hand: [], phase: 'move', quiet: 0 }
  },

  moves(position) {
    return movesOf(position.board, position.turn)
  },

  play(position, move) {
    const from = move[0]
    const to = move[move.length - 1]
    const seat = position.turn
    if (from === undefined || to === undefined || position.board[from] !== seat) return position
    const seats = sternSeats(position.board)
    const board = [...position.board]
    board[from] = EMPTY
    board[to] = seat
    const goal = target(seat, seats)
    const arrived = STERN_TRIANGLE[to] === goal && STERN_TRIANGLE[from] !== goal
    // The next player who can move: one who cannot passes.
    let turn = (seat + 1) % seats
    for (let tries = 1; tries < seats && movesOf(board, turn).length === 0; tries++) {
      turn = (turn + 1) % seats
    }
    return { board, turn, hand: [], phase: 'move', quiet: arrived ? 0 : position.quiet + 1 }
  },

  outcome(position) {
    const { board, turn } = position
    const seats = sternSeats(board)
    // The player who moved last first: only their move can have filled a triangle.
    for (let back = 1; back <= seats; back++) {
      const seat = (turn - back + seats) % seats
      if (filled(board, seat, seats)) {
        const line = triangle(target(seat, seats)).filter((hole) => board[hole] === seat)
        return { winner: seat, line }
      }
    }
    if (movesOf(board, turn).length === 0) return 'draw'
    return position.quiet >= STERN_QUIET_ROUNDS * seats ? 'draw' : null
  },
}

/** Whether a piece of the seat to move stands in the triangle it is bound for. */
export function sternArrived(position: Position): number {
  const seats = sternSeats(position.board)
  return triangle(target(position.turn, seats)).filter(
    (hole) => position.board[hole] === position.turn,
  ).length
}
