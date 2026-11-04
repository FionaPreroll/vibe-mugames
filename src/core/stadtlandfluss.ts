import { decodeText, initial, normalize } from './text'

/**
 * Stadt, Land, Fluss (City, Country, River), the game of words, as pure rules: 2 to 8 players.
 *
 * - Each round has a letter, drawn by chance, a new one every round. Everyone writes, for each
 *   category, a word that starts with it: a city, a country, a river, a first name, an animal
 *   and a job.
 * - Whoever has a word in every category may call Stop: the others have ten seconds left. After
 *   three minutes, the round ends anyway.
 * - Then everyone sees every answer, and may object to the others' answers. An answer that more
 *   than half of the others object to counts nothing; neither does one that does not start with
 *   the letter.
 * - An answer counts 20 if nobody else has one in its category, 10 if nobody else has the same,
 *   5 if someone has. Once everyone is ready, the next round begins.
 * - After five rounds, whoever has the most points wins; with the same, nobody does.
 *
 * On one device, players write one after the other, each as long as they like, and tap Done;
 * every objection then strikes an answer, as the players there decide together.
 */

export const MIN_WRITERS = 2
export const MAX_WRITERS = 8

export const CATEGORIES = ['city', 'country', 'river', 'name', 'animal', 'job'] as const
export type Category = (typeof CATEGORIES)[number]

/** The letters a round may have: every one but C, Q, X and Y, which too few words start with. */
export const LETTERS = 'ABDEFGHIJKLMNOPRSTUVWZ'
export const ROUNDS = 5
/** The longest answer, in characters. */
export const MAX_ANSWER = 24
/** How long a round lasts at most, and how long the others have once someone calls Stop. */
export const WRITE_SECONDS = 180
export const STOP_SECONDS = 10

/** What an answer counts: alone in its category, the only one of its word, or shared. */
export const ALONE = 20
export const UNIQUE = 10
export const SHARED = 5

export type WritePhase = 'write' | 'check'

/** Moves, as their first number: writing an answer, Stop (or Done), objecting, ready. */
export const WRITE = 1
export const STOP = 2
export const OBJECT = 3
export const READY = 4

export type WordsMove =
  | { readonly kind: 'write'; readonly category: number; readonly text: string }
  | { readonly kind: 'stop' }
  | { readonly kind: 'object'; readonly seat: number; readonly category: number }
  | { readonly kind: 'ready' }

/** The whole game, as the host knows it. */
export interface WordsState {
  /** Played on one device: one after the other, and objections strike at once. */
  readonly together: boolean
  /** The letters of the rounds so far: the last is this round's. */
  readonly letters: readonly string[]
  readonly phase: WritePhase
  /** Each seat's answers, a word or '' for each category. */
  readonly answers: readonly (readonly string[])[]
  /** On one device, who has written this round; elsewhere unused. */
  readonly done: readonly boolean[]
  /** Who called Stop this round, or null. */
  readonly stopper: number | null
  /** Seconds left to write; on one device, writing takes as long as it takes. */
  readonly left: number
  /** For each seat and category, the seats who object to that answer. */
  readonly objections: readonly (readonly (readonly number[])[])[]
  /** Who is ready for the next round, while answers are checked. */
  readonly ready: readonly boolean[]
  /** Each seat's points from the rounds before this one. */
  readonly totals: readonly number[]
  /** The winner once the last round is checked; 'draw' if the most points are shared. */
  readonly winner: number | 'draw' | null
}

/** What one seat may see: their own answers while writing, everyone's once they are checked. */
export interface WordsView {
  readonly together: boolean
  readonly letters: readonly string[]
  readonly phase: WritePhase
  /** Each seat's answers, null while they are hidden from this seat. */
  readonly answers: readonly (readonly string[] | null)[]
  /** How many answers each seat has that start with the letter, while writing. */
  readonly filled: readonly number[]
  readonly done: readonly boolean[]
  readonly stopper: number | null
  /** Whole seconds left to write: 0 on one device. */
  readonly left: number
  readonly objections: readonly (readonly (readonly number[])[])[]
  readonly ready: readonly boolean[]
  readonly totals: readonly number[]
  readonly winner: number | 'draw' | null
}

/** A letter not drawn before, by `random`. */
function draw(letters: readonly string[], random: () => number): string {
  const open = [...LETTERS].filter((letter) => !letters.includes(letter))
  return open[Math.min(open.length - 1, Math.floor(random() * open.length))] ?? 'A'
}

/** A round with a new letter, every answer empty. */
function round(state: WordsState, random: () => number): WordsState {
  const seats = state.totals.length
  return {
    ...state,
    letters: [...state.letters, draw(state.letters, random)],
    phase: 'write',
    answers: Array.from({ length: seats }, () => CATEGORIES.map(() => '')),
    done: Array.from({ length: seats }, () => false),
    stopper: null,
    left: state.together ? 0 : WRITE_SECONDS,
    objections: Array.from({ length: seats }, () => CATEGORIES.map(() => [])),
    ready: Array.from({ length: seats }, () => false),
  }
}

/** A new game for `seats` players, its first letter drawn by `random`. */
export function start(seats: number, random: () => number, together = false): WordsState {
  return round(
    {
      together,
      letters: [],
      phase: 'write',
      answers: [],
      done: [],
      stopper: null,
      left: 0,
      objections: [],
      ready: [],
      totals: Array.from({ length: seats }, () => 0),
      winner: null,
    },
    random,
  )
}

/** This round's letter. */
export function letterOf(state: { letters: readonly string[] }): string {
  return state.letters.at(-1) ?? 'A'
}

/** Whether an answer counts at all: a word that starts with the letter. */
export function fits(answer: string, letter: string): boolean {
  return initial(answer) === letter
}

/** On one device, the seat writing now; -1 once all have, and elsewhere. */
export function writer(state: { together: boolean; phase: WritePhase; done: readonly boolean[] }) {
  return state.together && state.phase === 'write' ? state.done.indexOf(false) : -1
}

/** Whether an answer is struck: by every objection on one device, else by most of the others. */
export function struck(
  state: { together: boolean; objections: WordsState['objections'] },
  seat: number,
  category: number,
): boolean {
  const against = state.objections[seat]?.[category]?.length ?? 0
  return state.together ? against > 0 : against * 2 > state.objections.length - 1
}

/**
 * What every answer of this round counts, by seat and category: nothing if it does not start
 * with the letter or is struck, 20 if alone, 10 if its word is, 5 if someone has the same.
 */
export function points(state: {
  together: boolean
  letters: readonly string[]
  answers: readonly (readonly string[] | null)[]
  objections: WordsState['objections']
}): number[][] {
  const letter = letterOf(state)
  const counts = (seat: number, category: number) => {
    const answer = state.answers[seat]?.[category] ?? ''
    return fits(answer, letter) && !struck(state, seat, category)
  }
  return state.answers.map((answers, seat) =>
    CATEGORIES.map((_, category) => {
      if (!counts(seat, category)) return 0
      const word = normalize(answers?.[category] ?? '')
      const others = state.answers.flatMap((other, i) =>
        i !== seat && counts(i, category) ? [normalize(other?.[category] ?? '')] : [],
      )
      if (others.length === 0) return ALONE
      return others.includes(word) ? SHARED : UNIQUE
    }),
  )
}

export function encode(move: WordsMove): number[] {
  if (move.kind === 'write') {
    return [WRITE, move.category, ...[...move.text].map((char) => char.codePointAt(0) ?? 32)]
  }
  if (move.kind === 'object') return [OBJECT, move.seat, move.category]
  return [move.kind === 'stop' ? STOP : READY]
}

export function decode(numbers: readonly number[]): WordsMove | null {
  const [kind, a, b, ...rest] = numbers
  if (kind === WRITE && a !== undefined && Number.isInteger(a) && a >= 0 && a < CATEGORIES.length) {
    const text = decodeText(numbers.slice(2), MAX_ANSWER)
    return text === null ? null : { kind: 'write', category: a, text }
  }
  if (kind === OBJECT && a !== undefined && b !== undefined && rest.length === 0) {
    if (!Number.isInteger(a) || !Number.isInteger(b) || b < 0 || b >= CATEGORIES.length) {
      return null
    }
    return { kind: 'object', seat: a, category: b }
  }
  if (numbers.length !== 1) return null
  return kind === STOP ? { kind: 'stop' } : kind === READY ? { kind: 'ready' } : null
}

/** Whether `seat` may make this move now. */
export function legal(state: WordsState, seat: number, move: WordsMove): boolean {
  if (state.winner !== null || seat < 0 || seat >= state.answers.length) return false
  const letter = letterOf(state)
  if (move.kind === 'write' || move.kind === 'stop') {
    if (state.phase !== 'write') return false
    if (state.together) return writer(state) === seat
    if (state.stopper === seat) return false
    if (move.kind === 'write') return true
    return state.stopper === null && (state.answers[seat] ?? []).every((a) => fits(a, letter))
  }
  if (state.phase !== 'check') return false
  if (move.kind === 'ready') return state.together || !state.ready[seat]
  const target = state.answers[move.seat]?.[move.category]
  if (target === undefined || !fits(target, letter)) return false
  return state.together || (move.seat !== seat && !state.ready[seat])
}

/** The game after a legal move by `seat`; `random` draws the next round's letter. */
export function play(
  state: WordsState,
  seat: number,
  move: WordsMove,
  random: () => number,
): WordsState {
  if (move.kind === 'write') {
    const answers = state.answers.map((own, i) =>
      i === seat ? own.map((answer, c) => (c === move.category ? move.text : answer)) : own,
    )
    return { ...state, answers }
  }
  if (move.kind === 'stop') {
    if (!state.together) {
      return { ...state, stopper: seat, left: Math.min(state.left, STOP_SECONDS) }
    }
    const done = state.done.map((d, i) => d || i === seat)
    const next = { ...state, done }
    return done.every(Boolean) ? { ...next, phase: 'check' } : next
  }
  if (move.kind === 'object') {
    const objections = state.objections.map((own, i) =>
      i !== move.seat
        ? own
        : own.map((against, c) => {
            if (c !== move.category) return against
            if (state.together) return against.length > 0 ? [] : [seat]
            return against.includes(seat) ? against.filter((s) => s !== seat) : [...against, seat]
          }),
    )
    return { ...state, objections }
  }
  const ready = state.ready.map((r, i) => r || i === seat || state.together)
  if (!ready.every(Boolean)) return { ...state, ready }
  // Everyone is ready: the round counts, and the next begins, or the game ends.
  const scored = points(state)
  const totals = state.totals.map(
    (total, i) => total + (scored[i] ?? []).reduce((a, b) => a + b, 0),
  )
  if (state.letters.length >= ROUNDS) {
    const best = Math.max(...totals)
    const top = totals.flatMap((total, i) => (total === best ? [i] : []))
    return { ...state, ready, totals, winner: top.length === 1 ? (top[0] ?? 0) : 'draw' }
  }
  return round({ ...state, totals }, random)
}

/** The game after `seconds` more: writing ends once its time is up. */
export function advance(state: WordsState, seconds: number): WordsState {
  if (state.together || state.phase !== 'write' || state.winner !== null) return state
  const left = Math.max(0, state.left - seconds)
  return left > 0 ? { ...state, left } : { ...state, left: 0, phase: 'check' }
}

/** What `seat` may see; a seat of -1, or any that does not play, only watches. */
export function view(state: WordsState, seat: number): WordsView {
  const letter = letterOf(state)
  const open = state.phase === 'check'
  return {
    together: state.together,
    letters: state.letters,
    phase: state.phase,
    answers: state.answers.map((own, i) => (open || i === seat ? own : null)),
    filled: state.answers.map((own) => own.filter((answer) => fits(answer, letter)).length),
    done: state.done,
    stopper: state.stopper,
    left: Math.ceil(state.left),
    objections: state.objections,
    ready: state.ready,
    totals: state.totals,
    winner: state.winner,
  }
}

/** The seats to act now: on one device the writer; elsewhere, those not ready while checking. */
export function waitingFor(view: WordsView): number[] {
  if (view.winner !== null) return []
  if (view.phase === 'write') {
    const now = writer(view)
    return now >= 0 ? [now] : []
  }
  return view.together ? [] : view.ready.flatMap((r, i) => (r ? [] : [i]))
}
