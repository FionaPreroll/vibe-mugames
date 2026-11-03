/**
 * Mäxchen, the old dice game of bluffing, as pure rules: 2 to 8 players, two dice under a cup,
 * and three lives each. The last player with a life left wins.
 *
 * - The player to move rolls the two dice under the cup, looks at them alone, and says what they
 *   show: the truth or a bluff, but always more than the player before said.
 * - The next player either believes it, and rolls in turn, having to say more again, or doubts
 *   it and lifts the cup. If the dice show less than was said, the one who said it loses a life;
 *   if they show as much or more, the one who doubted does.
 * - Two dice are read with the higher one first: a 5 and a 3 are 53. Doubles beat every other
 *   throw, and 2-1, the Mäxchen, beats everything. From the lowest up: 31, 32, 41, … 65, then
 *   11, 22, … 66, then 21.
 * - Nobody can say more than Mäxchen. Who is told “Mäxchen” may give up one life without looking,
 *   or doubt it: if the cup holds the Mäxchen, doubting costs two lives.
 * - Whoever lost a life starts the next round, with nothing said yet; if they are out, the next
 *   player who is still in starts.
 *
 * Seat 0 starts. The host rolls the dice: no phone sees them but the roller's.
 */

/** Lives each player starts with. */
export const LIVES = 3
export const MIN_DICE_SEATS = 2
export const MAX_DICE_SEATS = 8

/** The Mäxchen, 2-1, the highest throw. */
export const MAEXCHEN = 21

/** Every throw, from the lowest to the highest: what players may say. */
export const THROWS: readonly number[] = [
  31,
  32,
  41,
  42,
  43,
  51,
  52,
  53,
  54,
  61,
  62,
  63,
  64,
  65,
  11,
  22,
  33,
  44,
  55,
  66,
  MAEXCHEN,
]

/** Two dice, each 1 to 6. */
export type Dice = readonly [number, number]

/** A move: rolling (believing what was said, if anything was), saying a throw, doubting, giving up. */
export type MaexMove =
  | { readonly kind: 'roll' }
  | { readonly kind: 'claim'; readonly value: number }
  | { readonly kind: 'doubt' }
  | { readonly kind: 'yield' }

/** What the player to move does now: roll (or doubt), or say what the cup holds. */
export type MaexPhase = 'roll' | 'claim'

/** How a round ended: who said what, who doubted it, what the cup held, and who paid for it. */
export interface Reveal {
  /** The seat who said what the cup holds. */
  readonly claimer: number
  /** The seat who doubted it, or gave up. */
  readonly doubter: number
  readonly claim: number
  /** What the cup held; null if the doubter gave up without lifting it. */
  readonly dice: Dice | null
  /** The seat who lost lives, and how many. */
  readonly loser: number
  readonly lost: number
}

/** The whole game, as only the host knows it. */
export interface MaexState {
  /** Lives left, by seat: 0 is out. */
  readonly lives: readonly number[]
  /** The seat to move. */
  readonly turn: number
  readonly phase: MaexPhase
  /** The dice under the cup, rolled last; null at the start of a round. */
  readonly dice: Dice | null
  /** The seat who rolled them, and alone has seen them. */
  readonly roller: number | null
  /** What the cup was said to hold last in this round, and by whom; null at its start. */
  readonly claim: number | null
  readonly claimer: number | null
  /** How the last round ended; null in the first. */
  readonly reveal: Reveal | null
  readonly winner: number | null
}

/** What one seat may see: everything but the dice under the cup, unless they rolled them. */
export interface MaexView {
  readonly lives: readonly number[]
  readonly turn: number
  readonly phase: MaexPhase
  /** The dice under the cup, for the seat who rolled them only. */
  readonly dice: Dice | null
  /** Whether the dice under the cup are this seat's own roll. */
  readonly mine: boolean
  readonly claim: number | null
  readonly claimer: number | null
  readonly reveal: Reveal | null
  readonly winner: number | null
}

const ROLL_CODE = 1
const DOUBT_CODE = 2
const YIELD_CODE = 3

/** A move as numbers, as the table and the protocol carry it: see `decode`. */
export function encode(move: MaexMove): number[] {
  switch (move.kind) {
    case 'roll':
      return [ROLL_CODE]
    case 'doubt':
      return [DOUBT_CODE]
    case 'yield':
      return [YIELD_CODE]
    case 'claim':
      return [move.value]
  }
}

/** The move these numbers stand for: 1 rolls, 2 doubts, 3 gives up, a throw (11 to 66) says it. */
export function decode(numbers: readonly number[]): MaexMove | undefined {
  if (numbers.length !== 1) return undefined
  const n = numbers[0]
  if (n === ROLL_CODE) return { kind: 'roll' }
  if (n === DOUBT_CODE) return { kind: 'doubt' }
  if (n === YIELD_CODE) return { kind: 'yield' }
  return isThrow(n) ? { kind: 'claim', value: n } : undefined
}

/** Whether a value is a throw, such as 53 or 21. */
export function isThrow(value: unknown): value is number {
  return typeof value === 'number' && THROWS.includes(value)
}

/** Whether a value is a die, 1 to 6. */
export function isDie(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 6
}

/** Two dice as a throw: the higher die first, so a 3 and a 5 are 53. */
export function throwOf(dice: Dice): number {
  const [a, b] = dice
  return Math.max(a, b) * 10 + Math.min(a, b)
}

/** Where a throw ranks, 0 for the lowest (31) up to 20 for the Mäxchen. */
export function rank(value: number): number {
  return THROWS.indexOf(value)
}

/** In how many of the 36 ways two dice can fall they show `value` or more. */
export function atLeast(value: number): number {
  let ways = 0
  for (let a = 1; a <= 6; a++) {
    for (let b = 1; b <= 6; b++) if (rank(throwOf([a, b])) >= rank(value)) ways++
  }
  return ways
}

/** A new game for `seats` players, each with every life. */
export function start(seats: number): MaexState {
  return {
    lives: Array.from({ length: seats }, () => LIVES),
    turn: 0,
    phase: 'roll',
    dice: null,
    roller: null,
    claim: null,
    claimer: null,
    reveal: null,
    winner: null,
  }
}

/** The seat after `seat` who is still in. */
export function nextIn(lives: readonly number[], seat: number): number {
  for (let step = 1; step <= lives.length; step++) {
    const next = (seat + step) % lives.length
    if ((lives[next] ?? 0) > 0) return next
  }
  return seat
}

/** Whether `seat` may make this move now. */
export function legal(state: MaexState, seat: number, move: MaexMove): boolean {
  return allowed(view(state, seat), seat, move)
}

/** The same as `legal`, from what the seat sees, so that a phone can offer only legal moves. */
export function allowed(view: MaexView, seat: number, move: MaexMove): boolean {
  if (view.winner !== null || seat !== view.turn) return false
  switch (move.kind) {
    case 'roll':
      return view.phase === 'roll' && view.claim !== MAEXCHEN
    case 'doubt':
      return view.phase === 'roll' && view.claim !== null
    case 'yield':
      return view.phase === 'roll' && view.claim === MAEXCHEN
    case 'claim':
      return (
        view.phase === 'claim' &&
        isThrow(move.value) &&
        (view.claim === null || rank(move.value) > rank(view.claim))
      )
  }
}

/** A die, from `random`'s numbers from 0 up to, not including, 1. */
function die(random: () => number): number {
  return Math.min(6, Math.floor(random() * 6) + 1)
}

/** The game after `seat`'s move, which must be legal. `random` rolls the dice. */
export function play(
  state: MaexState,
  seat: number,
  move: MaexMove,
  random: () => number,
): MaexState {
  switch (move.kind) {
    case 'roll':
      return { ...state, phase: 'claim', dice: [die(random), die(random)], roller: seat }
    case 'claim':
      return {
        ...state,
        phase: 'roll',
        claim: move.value,
        claimer: seat,
        turn: nextIn(state.lives, seat),
      }
    case 'doubt':
    case 'yield': {
      const claim = state.claim ?? MAEXCHEN
      const claimer = state.claimer ?? seat
      const dice = move.kind === 'doubt' ? state.dice : null
      const honest = move.kind === 'yield' || (dice !== null && rank(throwOf(dice)) >= rank(claim))
      const loser = honest ? seat : claimer
      const lost = move.kind === 'doubt' && honest && claim === MAEXCHEN ? 2 : 1
      const lives = state.lives.map((n, i) => (i === loser ? Math.max(0, n - lost) : n))
      const left = lives.filter((n) => n > 0).length
      const startsNext = (lives[loser] ?? 0) > 0 ? loser : nextIn(lives, loser)
      return {
        lives,
        turn: startsNext,
        phase: 'roll',
        dice: null,
        roller: null,
        claim: null,
        claimer: null,
        reveal: { claimer, doubter: seat, claim, dice, loser, lost },
        winner: left === 1 ? lives.findIndex((n) => n > 0) : null,
      }
    }
  }
}

/** Every move the seat to move may make now. */
export function moves(state: MaexState): MaexMove[] {
  const all: MaexMove[] = [
    { kind: 'roll' },
    { kind: 'doubt' },
    { kind: 'yield' },
    ...THROWS.map((value) => ({ kind: 'claim' as const, value })),
  ]
  return all.filter((move) => legal(state, state.turn, move))
}

/** How the game ended: the seat with lives left, or null while it goes on. */
export function outcome(state: MaexState): number | null {
  return state.winner
}

/** What `seat` may see of the game; a seat of -1, or any that does not play, only watches. */
export function view(state: MaexState, seat: number): MaexView {
  const mine = state.roller !== null && state.roller === seat
  return {
    lives: state.lives,
    turn: state.turn,
    phase: state.phase,
    dice: mine ? state.dice : null,
    mine,
    claim: state.claim,
    claimer: state.claimer,
    reveal: state.reveal,
    winner: state.winner,
  }
}
