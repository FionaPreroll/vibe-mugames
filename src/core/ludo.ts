/**
 * Ludo, as pure rules: 2 to 4 players, four pieces each, a die the host rolls. Whoever brings
 * all four pieces home first wins.
 *
 * - The board is a track of 40 squares round a cross, with a start square for each of the four
 *   corners, and four home squares in front of each corner's start, leading to the middle.
 * - On their turn, a player rolls the die, then moves one of their pieces that many squares on.
 *   A six brings a piece out of its corner onto its start square, and gives another roll.
 * - A piece that lands on another player's piece sends it back to its corner. Two pieces of
 *   the same player never share a square.
 * - After a round of the track, a piece goes into its home squares, by the exact number:
 *   a roll that would take it past the last one does not move it.
 * - A player with no piece on the track rolls up to three times for a six.
 * - If no piece can move, the turn passes on, after a six to the same player.
 *
 * Two players sit in opposite corners, three in three of them, four in all four.
 */

export const MIN_LUDO = 2
export const MAX_LUDO = 4
export const PIECES = 4
/** Squares of the track, round the whole board. */
export const TRACK = 40
/** Home squares of each player, after the track. */
export const HOME = 4
/** The step of a piece on its last home square: its way is done. */
export const LAST = TRACK + HOME - 1
/** The step of a piece still in its corner. */
export const OUT = -1
/** How often a player with no piece on the track rolls for a six. */
export const TRIES = 3
export const SIX = 6
/** The move that rolls the die; a move of 0 to 3 moves that piece. */
export const ROLL = PIECES

/** A move: roll the die, or move a piece (0 to 3) by the number rolled. */
export type LudoMove =
  | { readonly kind: 'roll' }
  | { readonly kind: 'piece'; readonly piece: number }

/** A piece moved last: whose, from which step to which, and whose piece it sent back, if any. */
export interface LudoMoved {
  readonly seat: number
  readonly piece: number
  readonly from: number
  readonly to: number
  /** The seat whose piece went back to its corner, or null. */
  readonly hit: number | null
}

/**
 * The whole game. Nothing is hidden, so every phone sees all of it. Each piece is a step on its
 * own way: OUT in its corner, 0 on its start square, up to 39 round the track, then 40 to 43 on
 * its home squares.
 */
export interface LudoState {
  /** Every seat's pieces, by the step each has reached. */
  readonly pieces: readonly (readonly number[])[]
  /** The seat whose turn it is. */
  readonly turn: number
  /** Whether that seat rolls next, or moves a piece by the number rolled. */
  readonly phase: 'roll' | 'move'
  /** The number rolled last, 1 to 6; 0 before the first roll. */
  readonly die: number
  /** The seat that rolled it; -1 before the first roll. */
  readonly rolledBy: number
  /** Rolls in this turn that moved nothing. */
  readonly tries: number
  /** Whether the last roll could move no piece. */
  readonly stuck: boolean
  /** The piece moved last, or null before the first move. */
  readonly moved: LudoMoved | null
  readonly winner: number | null
}

/** The corners the seats sit in: opposite each other for two players. */
export function corners(seats: number): number[] {
  return seats === 2 ? [0, 2] : Array.from({ length: seats }, (_, seat) => seat)
}

/** The square of the track a step of a seat's way is on, or null in the corner or at home. */
export function square(seats: number, seat: number, step: number): number | null {
  if (step < 0 || step >= TRACK) return null
  const corner = corners(seats)[seat] ?? 0
  return (corner * (TRACK / MAX_LUDO) + step) % TRACK
}

export function start(seats: number): LudoState {
  if (!Number.isInteger(seats) || seats < MIN_LUDO || seats > MAX_LUDO) {
    throw new RangeError(`Ludo is for ${MIN_LUDO} to ${MAX_LUDO} players`)
  }
  return {
    pieces: Array.from({ length: seats }, () => Array.from({ length: PIECES }, () => OUT)),
    turn: 0,
    phase: 'roll',
    die: 0,
    rolledBy: -1,
    tries: 0,
    stuck: false,
    moved: null,
    winner: null,
  }
}

/** A move as numbers, as the table and the protocol carry it: the piece, or 4 to roll. */
export function encode(move: LudoMove): number[] {
  return [move.kind === 'roll' ? ROLL : move.piece]
}

/** The move these numbers stand for, or undefined if they stand for none. */
export function decode(numbers: readonly number[]): LudoMove | undefined {
  const [first, ...rest] = numbers
  if (rest.length > 0 || !Number.isInteger(first)) return undefined
  if (first === ROLL) return { kind: 'roll' }
  return isPiece(first) ? { kind: 'piece', piece: first } : undefined
}

export function isPiece(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < PIECES
}

/** Whether a value is a step a piece can be on: in its corner, on the track, or at home. */
export function isStep(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= OUT && (value as number) <= LAST
}

/** The step a piece reaches with `die`, or null if it may not move by it. */
export function target(state: LudoState, seat: number, piece: number, die: number): number | null {
  const own = state.pieces[seat]
  const from = own?.[piece]
  if (own === undefined || from === undefined) return null
  if (from >= LAST) return null
  const to = from === OUT ? (die === SIX ? 0 : null) : from + die
  if (to === null || to > LAST) return null
  return own.some((step, other) => other !== piece && step === to) ? null : to
}

/** The pieces the seat to move may move by the number rolled; none before rolling. */
export function movable(state: LudoState): number[] {
  if (state.phase !== 'move' || state.winner !== null) return []
  return Array.from({ length: PIECES }, (_, piece) => piece).filter(
    (piece) => target(state, state.turn, piece, state.die) !== null,
  )
}

/** Whether `seat` may make this move now. */
export function legal(state: LudoState, seat: number, move: LudoMove): boolean {
  if (state.winner !== null || seat !== state.turn) return false
  if (move.kind === 'roll') return state.phase === 'roll'
  return movable(state).includes(move.piece)
}

/** Every move the seat whose turn it is may make now. */
export function moves(state: LudoState): LudoMove[] {
  if (state.winner !== null) return []
  if (state.phase === 'roll') return [{ kind: 'roll' }]
  return movable(state).map((piece) => ({ kind: 'piece', piece }))
}

/** Whether a seat has a piece out on the track, which spares it the three tries. */
function onTrack(pieces: readonly number[]): boolean {
  return pieces.some((step) => step >= 0 && step < TRACK)
}

/** The die after one roll: `random` gives numbers from 0 up to, not including, 1. */
export function rollDie(random: () => number): number {
  return Math.min(SIX, Math.floor(random() * SIX) + 1)
}

/**
 * The game after `seat`'s move, which must be legal. A roll takes the die from `random`; if no
 * piece can move by it, the turn goes on by itself.
 */
export function play(
  state: LudoState,
  seat: number,
  move: LudoMove,
  random: () => number,
): LudoState {
  const seats = state.pieces.length
  const next = (seat + 1) % seats
  if (move.kind === 'roll') {
    const die = rollDie(random)
    const rolled = { ...state, die, rolledBy: seat, tries: state.tries + 1 }
    if (movable({ ...rolled, phase: 'move' }).length > 0) {
      return { ...rolled, phase: 'move', stuck: false }
    }
    const own = state.pieces[seat] ?? []
    const again = die === SIX || (!onTrack(own) && rolled.tries < TRIES)
    return {
      ...rolled,
      phase: 'roll',
      stuck: true,
      turn: again ? seat : next,
      tries: again && die !== SIX ? rolled.tries : 0,
    }
  }
  const from = state.pieces[seat]?.[move.piece] ?? OUT
  const to = target(state, seat, move.piece, state.die) ?? from
  const at = square(seats, seat, to)
  let hit: number | null = null
  const pieces = state.pieces.map((own, other) =>
    own.map((step, piece) => {
      if (other === seat) return piece === move.piece ? to : step
      if (at !== null && square(seats, other, step) === at) {
        hit = other
        return OUT
      }
      return step
    }),
  )
  const home = pieces[seat]?.every((step) => step >= TRACK) ?? false
  const again = state.die === SIX && !home
  return {
    ...state,
    pieces,
    phase: 'roll',
    turn: again || home ? seat : next,
    tries: 0,
    stuck: false,
    moved: { seat, piece: move.piece, from, to, hit },
    winner: home ? seat : null,
  }
}

/** The seat that won, or null while the game goes on. */
export function outcome(state: LudoState): number | null {
  return state.winner
}

/**
 * Whether a game could have come about: pieces of one seat on different steps, and no two
 * seats on one square of the track. A phone checks this of what the host sends.
 */
export function isPossible(state: LudoState): boolean {
  const seats = state.pieces.length
  const taken = new Set<number>()
  for (const [seat, own] of state.pieces.entries()) {
    const placed = own.filter((step) => step !== OUT)
    if (new Set(placed).size !== placed.length) return false
    for (const step of placed) {
      const at = square(seats, seat, step)
      if (at === null) continue
      if (taken.has(at)) return false
      taken.add(at)
    }
  }
  return true
}
