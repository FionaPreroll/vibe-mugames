import { type Board, type BoardGame, EMPTY, type Move, type Position } from './board'

/**
 * Mühle (Nine Men's Morris): 24 points on three squares joined at their middles. Each player
 * first places nine pieces, one a turn, then moves them along the lines to a free neighbour;
 * with only three left, a player's pieces jump to any free point. Three in a row on a line close
 * a mill, and the same player then takes one of the other's pieces: one outside a mill, unless
 * all of them are in mills. A player with fewer than three pieces, or none that can move, loses.
 *
 * Points are numbered ring by ring, outside in, each ring clockwise from its top left corner.
 * A move is [point] to place a piece or take one, and [from, to] to move one.
 */

const POINTS = 24
const PIECES = 9
/** Moves in a row without a mill, once all pieces are placed, that make a draw. */
export const MUEHLE_QUIET = 50

/** Where each point is drawn, as [column, row] on a grid of 7 by 7, row 0 at the top. */
export const MUEHLE_SPOTS: readonly (readonly [number, number])[] = [0, 1, 2].flatMap((ring) => {
  const step = 3 - ring
  return (
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
      [2, 2],
      [1, 2],
      [0, 2],
      [0, 1],
    ] as const
  ).map(([x, y]) => [ring + x * step, ring + y * step] as const)
})

/** The points each point is joined to by a line. */
export const MUEHLE_NEIGHBOURS: readonly (readonly number[])[] = Array.from(
  { length: POINTS },
  (_, point) => {
    const ring = Math.floor(point / 8)
    const corner = point % 8
    const next = [ring * 8 + ((corner + 1) % 8), ring * 8 + ((corner + 7) % 8)]
    if (corner % 2 === 1) {
      if (ring > 0) next.push(point - 8)
      if (ring < 2) next.push(point + 8)
    }
    return next
  },
)

/** The sixteen lines of three that make a mill. */
export const MILLS: readonly (readonly number[])[] = [
  ...[0, 1, 2].flatMap((ring) =>
    [0, 2, 4, 6].map((corner) => [
      ring * 8 + corner,
      ring * 8 + corner + 1,
      ring * 8 + ((corner + 2) % 8),
    ]),
  ),
  ...[1, 3, 5, 7].map((middle) => [middle, middle + 8, middle + 16]),
]

/** Whether the piece on a point is part of a mill. */
export function inMill(board: Board, point: number): boolean {
  const seat = board[point]
  if (seat === undefined || seat === EMPTY) return false
  return MILLS.some((mill) => mill.includes(point) && mill.every((p) => board[p] === seat))
}

function pointsOf(board: Board, seat: number): number[] {
  return board.flatMap((cell, point) => (cell === seat ? [point] : []))
}

/** Whether the seat to move may jump, having only three pieces left and none to place. */
export function flying(position: Position): boolean {
  const { board, turn, hand } = position
  return (hand[turn] ?? 0) === 0 && pointsOf(board, turn).length === 3
}

export const muehle: BoardGame = {
  id: 'muehle',
  cells: POINTS,
  seats: 2,
  kinds: 1,
  steps: 2,
  start: () => ({
    board: Array(POINTS).fill(EMPTY),
    turn: 0,
    hand: [PIECES, PIECES],
    phase: 'move',
    quiet: 0,
  }),

  moves(position) {
    const { board, turn, hand, phase } = position
    if (phase === 'remove') {
      const theirs = pointsOf(board, 1 - turn)
      const free = theirs.filter((point) => !inMill(board, point))
      return (free.length > 0 ? free : theirs).map((point) => [point])
    }
    const empty = pointsOf(board, EMPTY)
    if ((hand[turn] ?? 0) > 0) return empty.map((point) => [point])
    const jumps = flying(position)
    return pointsOf(board, turn).flatMap((from) =>
      (jumps ? empty : (MUEHLE_NEIGHBOURS[from] ?? []).filter((to) => board[to] === EMPTY)).map(
        (to): Move => [from, to],
      ),
    )
  },

  play(position, move) {
    const { turn, phase } = position
    const board = [...position.board]
    const hand = [...position.hand]
    if (phase === 'remove') {
      const [point] = move
      if (point !== undefined) board[point] = EMPTY
      return { board, turn: 1 - turn, hand, phase: 'move', quiet: 0 }
    }
    let to: number | undefined
    let quiet = position.quiet
    if (move.length === 1) {
      to = move[0]
      hand[turn] = (hand[turn] ?? 1) - 1
    } else {
      const [from, target] = move
      if (from !== undefined) board[from] = EMPTY
      to = target
      quiet++
    }
    if (to !== undefined) board[to] = turn
    // A mill takes a piece, if the other player has one on the board.
    if (to !== undefined && inMill(board, to) && pointsOf(board, 1 - turn).length > 0) {
      return { board, turn, hand, phase: 'remove', quiet }
    }
    return { board, turn: 1 - turn, hand, phase: 'move', quiet }
  },

  outcome(position) {
    const { board, turn, hand, phase, quiet } = position
    if (phase === 'remove') return null
    const lost =
      ((hand[turn] ?? 0) === 0 && pointsOf(board, turn).length < 3) ||
      muehle.moves(position).length === 0
    if (lost) return { winner: 1 - turn, line: [] }
    return quiet >= MUEHLE_QUIET ? 'draw' : null
  },
}
