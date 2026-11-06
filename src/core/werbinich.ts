import { decodeText, encodeText, normalize } from './text'
import { TERMS, type TermKind } from './whoTerms'

/**
 * Wer bin ich?, the guessing game, as pure rules: 2 to 8 players.
 *
 * - Everyone is dealt a term, an animal, a job, a figure of a fairy tale or a thing, which all
 *   the others see, but not they themselves; they know only what kind of thing it is.
 * - In turn, a player asks a question that can be answered with yes or no, and the others
 *   answer: yes, no, or not sure. The most answers decide. After a yes or a not sure, the same
 *   player asks again; after a no, the next player's turn comes.
 * - Instead of a question, a player may guess. A guess that names their term, without minding
 *   capitals, accents or a leading "Am I", gets it at once; any other guess the others judge.
 *   A right guess solves the term, a wrong one ends the turn. A player may also pass, or give
 *   up, which shows them their term and puts them out.
 * - Once all but one have solved their terms, or given up, the game is over: the first to solve
 *   theirs wins.
 * - On one device, everyone asks and answers aloud, and the one asking taps what was answered.
 */

export const MIN_GUESSERS = 2
export const MAX_GUESSERS = 8
/** How many terms there are to deal. */
export const TERM_COUNT = TERMS.length
export const MAX_QUESTION = 60
/** How long the others have to answer; whoever has not by then counts for nothing. */
export const VOTE_SECONDS = 45
/** The questions the table remembers, the newest. */
export const MAX_LOG = 40

/** Moves, as their first number. */
export const ASK = 1
export const GUESS = 2
export const VOTE = 3
export const PASS = 4
export const GIVE_UP = 5
/** On one device: what the others answered aloud. */
export const SAID = 6

/** An answer to a question: yes, no, or not sure. */
export const YES = 0
export const NO = 1
export const MAYBE = 2
export type Vote = typeof YES | typeof NO | typeof MAYBE
/** What was said aloud on one device: yes, no, or that the guess was right. */
export const RIGHT = 2

export type WhoMove =
  | { readonly kind: 'ask'; readonly text: string }
  | { readonly kind: 'guess'; readonly text: string }
  | { readonly kind: 'vote'; readonly vote: Vote }
  | { readonly kind: 'pass' }
  | { readonly kind: 'giveUp' }
  | { readonly kind: 'said'; readonly said: typeof YES | typeof NO | typeof RIGHT }

/** How a question ended: answered, a guess judged, a turn passed, or a player out. */
export type Answer = 'yes' | 'no' | 'maybe' | 'right' | 'wrong' | 'pass' | 'out'

/** A question asked, and how it was answered. */
export interface Entry {
  readonly seat: number
  /** The question or the guess; null when it was said aloud, on one device. */
  readonly text: string | null
  readonly guess: boolean
  readonly answer: Answer
  /** How many answered yes, no and not sure. */
  readonly counts: readonly [number, number, number]
}

export type WhoPhase = 'ask' | 'vote'

/** The whole game, as the host knows it. */
export interface WhoState {
  /** Played on one device: asked and answered aloud. */
  readonly together: boolean
  /** Each seat's term, by its number in TERMS. */
  readonly terms: readonly number[]
  /** The turn this is, from 0: a new one begins whenever the next player asks. */
  readonly turn: number
  readonly asker: number
  readonly phase: WhoPhase
  /** The question being answered, while the others vote. */
  readonly question: { readonly text: string; readonly guess: boolean } | null
  /** Each seat's answer to it, null for none yet; the one asking has none. */
  readonly votes: readonly (Vote | null)[]
  /** Seconds left to answer. */
  readonly left: number
  /** The seats who solved their terms, in the order they did. */
  readonly solved: readonly number[]
  readonly gaveUp: readonly number[]
  readonly log: readonly Entry[]
  /** How many questions were asked in all, the log's oldest ones forgotten too. */
  readonly asked: number
  readonly winner: number | 'draw' | null
}

/** What one seat may see: every term but their own, until they solved it or the game is over. */
export interface WhoView {
  readonly together: boolean
  /** Each seat's term; null for the viewer's own while they still guess it. */
  readonly terms: readonly (number | null)[]
  /** What kind of thing each seat's term is. */
  readonly kinds: readonly TermKind[]
  readonly turn: number
  readonly asker: number
  readonly phase: WhoPhase
  readonly question: { readonly text: string; readonly guess: boolean } | null
  readonly votes: readonly (Vote | null)[]
  /** Whole seconds left to answer. */
  readonly left: number
  readonly solved: readonly number[]
  readonly gaveUp: readonly number[]
  readonly log: readonly Entry[]
  readonly winner: number | 'draw' | null
}

/** A term's names in a language: the first is the one shown. */
export function termNames(term: number, language: 'de' | 'en'): string[] {
  return (TERMS[term]?.[language] ?? '').split('|')
}

/** What kind of thing a term is. */
export const kindOf = (term: number): TermKind => TERMS[term]?.kind ?? 'thing'

/** Words a guess may begin with that name nothing: "Am I a…", "Bin ich ein…", "the". */
const FILLER = new Set([
  'am',
  'i',
  'is',
  'it',
  'bin',
  'ich',
  'ist',
  'es',
  'a',
  'an',
  'the',
  'ein',
  'eine',
  'einen',
  'der',
  'die',
  'das',
])

/** What a guess or a name names, without what it begins with: "Bin ich die Hexe?" is "hexe". */
function named(text: string): string {
  const words = text
    .toLowerCase()
    .replace(/[?!.,;:]/gu, ' ')
    .split(/\s+/u)
    .filter((word) => word !== '')
  let first = 0
  while (first < words.length - 1 && FILLER.has(words[first] ?? '')) first++
  return normalize(words.slice(first).join(' '))
}

/** Whether a guess names the term, in either language, by any of its names. */
export function names(term: number, guess: string): boolean {
  const said = named(guess)
  return (
    said !== '' &&
    [...termNames(term, 'de'), ...termNames(term, 'en')].some((name) => named(name) === said)
  )
}

/** Deals `seats` different terms, by `random`. */
function deal(seats: number, random: () => number): number[] {
  let open = TERMS.map((_, i) => i)
  const dealt: number[] = []
  for (let seat = 0; seat < seats; seat++) {
    const i = Math.min(open.length - 1, Math.floor(random() * open.length))
    dealt.push(open[i] as number)
    open = open.filter((_, j) => j !== i)
  }
  return dealt
}

export function start(seats: number, random: () => number, together = false): WhoState {
  return {
    together,
    terms: deal(seats, random),
    turn: 0,
    asker: 0,
    phase: 'ask',
    question: null,
    votes: Array.from({ length: seats }, () => null),
    left: 0,
    solved: [],
    gaveUp: [],
    log: [],
    asked: 0,
    winner: null,
  }
}

/** Whether a seat still guesses their term. */
const playing = (state: WhoState, seat: number) =>
  !state.solved.includes(seat) && !state.gaveUp.includes(seat)

export function encode(move: WhoMove): number[] {
  switch (move.kind) {
    case 'ask':
      return [ASK, ...encodeText(move.text, MAX_QUESTION)]
    case 'guess':
      return [GUESS, ...encodeText(move.text, MAX_QUESTION)]
    case 'vote':
      return [VOTE, move.vote]
    case 'pass':
      return [PASS]
    case 'giveUp':
      return [GIVE_UP]
    case 'said':
      return [SAID, move.said]
  }
}

export function decode(numbers: readonly number[]): WhoMove | null {
  const [kind, a, ...rest] = numbers
  if (kind === ASK || kind === GUESS) {
    const text = decodeText(numbers.slice(1), MAX_QUESTION)
    return text ? { kind: kind === ASK ? 'ask' : 'guess', text } : null
  }
  if (kind === PASS || kind === GIVE_UP) {
    return numbers.length === 1 ? { kind: kind === PASS ? 'pass' : 'giveUp' } : null
  }
  if (rest.length > 0 || (a !== YES && a !== NO && a !== MAYBE)) return null
  if (kind === VOTE) return { kind: 'vote', vote: a }
  if (kind === SAID) return { kind: 'said', said: a }
  return null
}

/** Whether `seat` may make this move now. */
export function legal(state: WhoState, seat: number, move: WhoMove): boolean {
  if (state.winner !== null || seat < 0 || seat >= state.terms.length) return false
  const asking = seat === state.asker && state.phase === 'ask'
  switch (move.kind) {
    case 'ask':
    case 'guess':
      return asking && !state.together
    case 'pass':
    case 'giveUp':
      return asking
    case 'said':
      return asking && state.together
    case 'vote':
      return (
        !state.together &&
        state.phase === 'vote' &&
        seat !== state.asker &&
        state.votes[seat] === null
      )
  }
}

/** Remembers a question, and only the newest. */
function logged(state: WhoState, entry: Entry): WhoState {
  return { ...state, log: [...state.log, entry].slice(-MAX_LOG), asked: state.asked + 1 }
}

/** The turn goes to the next who still guesses; the game is over once all but one are done. */
function nextTurn(state: WhoState): WhoState {
  const seats = state.terms.length
  const open = state.terms.flatMap((_, seat) => (playing(state, seat) ? [seat] : []))
  const asking = { ...state, phase: 'ask' as const, question: null, left: 0 }
  const votes = state.votes.map(() => null)
  if (open.length <= 1) return { ...asking, votes, winner: state.solved[0] ?? 'draw' }
  let asker = state.asker
  do asker = (asker + 1) % seats
  while (!playing(state, asker))
  return { ...asking, asker, votes, turn: state.turn + 1 }
}

/** The one asking solved their term. */
function solve(state: WhoState): WhoState {
  return nextTurn({ ...state, solved: [...state.solved, state.asker] })
}

/** The answers are in, or the time to answer is up: the most answers decide. */
function resolve(state: WhoState): WhoState {
  const question = state.question
  if (question === null) return state
  const count = (vote: Vote) => state.votes.filter((v) => v === vote).length
  const counts = [count(YES), count(NO), count(MAYBE)] as const
  const [yes, no] = counts
  const entry = (answer: Answer): Entry => ({
    seat: state.asker,
    text: question.text,
    guess: question.guess,
    answer,
    counts,
  })
  const asked = { ...state, question: null, votes: state.votes.map(() => null), left: 0 }
  if (question.guess) {
    return yes > no ? solve(logged(asked, entry('right'))) : nextTurn(logged(asked, entry('wrong')))
  }
  const answer = yes > no ? 'yes' : no > yes ? 'no' : 'maybe'
  const next = logged({ ...asked, phase: 'ask' }, entry(answer))
  return answer === 'no' ? nextTurn(next) : next
}

/** The game after a legal move by `seat`. */
export function play(state: WhoState, seat: number, move: WhoMove): WhoState {
  const plain = (answer: Answer, text: string | null = null): Entry => ({
    seat,
    text,
    guess: false,
    answer,
    counts: [0, 0, 0],
  })
  switch (move.kind) {
    case 'ask':
      return {
        ...state,
        phase: 'vote',
        question: { text: move.text, guess: false },
        left: VOTE_SECONDS,
      }
    case 'guess':
      if (names(state.terms[seat] ?? -1, move.text)) {
        return solve(logged(state, { ...plain('right', move.text), guess: true }))
      }
      return {
        ...state,
        phase: 'vote',
        question: { text: move.text, guess: true },
        left: VOTE_SECONDS,
      }
    case 'vote': {
      const votes = state.votes.map((v, i) => (i === seat ? move.vote : v))
      const next = { ...state, votes }
      const waiting = votes.some((v, i) => v === null && i !== state.asker)
      return waiting ? next : resolve(next)
    }
    case 'pass':
      return nextTurn(logged(state, plain('pass')))
    case 'giveUp':
      return nextTurn(logged({ ...state, gaveUp: [...state.gaveUp, seat] }, plain('out')))
    case 'said':
      if (move.said === RIGHT) return solve(logged(state, { ...plain('right'), guess: true }))
      if (move.said === NO) return nextTurn(logged(state, plain('no')))
      return logged(state, plain('yes'))
  }
}

/** The game after `seconds` more: the time to answer runs out. */
export function advance(state: WhoState, seconds: number): WhoState {
  if (state.winner !== null || state.phase !== 'vote') return state
  const left = Math.max(0, state.left - seconds)
  return left > 0 ? { ...state, left } : resolve({ ...state, left: 0 })
}

/** What `seat` may see; a seat of -1, or any that does not play, only watches. */
export function view(state: WhoState, seat: number): WhoView {
  const hidden = (other: number) =>
    other === seat && !state.together && state.winner === null && playing(state, seat)
  return {
    together: state.together,
    terms: state.terms.map((term, other) => (hidden(other) ? null : term)),
    kinds: state.terms.map(kindOf),
    turn: state.turn,
    asker: state.asker,
    phase: state.phase,
    question: state.question,
    votes: state.votes,
    left: Math.ceil(state.left),
    solved: state.solved,
    gaveUp: state.gaveUp,
    log: state.log,
    winner: state.winner,
  }
}

/** The seats to act now: the one asking, or those who still have to answer. */
export function waitingFor(view: WhoView): number[] {
  if (view.winner !== null) return []
  if (view.phase === 'ask') return [view.asker]
  return view.votes.flatMap((vote, seat) => (vote === null && seat !== view.asker ? [seat] : []))
}
