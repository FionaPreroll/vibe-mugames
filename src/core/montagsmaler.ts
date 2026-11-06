import { SKETCH_WORDS } from './sketchWords'
import { decodeText, nearly, normalize } from './text'

/**
 * Montagsmaler, the drawing game, as pure rules: 2 to 8 players.
 *
 * - In turn, each player draws: they choose one of three words, which only they see, and draw
 *   it in 80 seconds, without letters or numbers. The others guess, each on their own phone.
 * - A guess that names the word, without minding capitals or accents, gets it: the first to
 *   get it scores 3, the second 2, everyone after 1. The one drawing scores 1 for each who got
 *   it. When everyone has, or the time is up, the word is shown, and the next player draws.
 * - With half of the time gone, the others see a letter of the word, and another with a quarter
 *   left.
 * - The one drawing may also mark who said the word aloud: on one device, that is how it is
 *   guessed.
 * - Everyone draws twice with up to three players, once with more. The most points win.
 */

export const MIN_SKETCHERS = 2
/** How many words there are to draw. */
export const SKETCH_WORD_COUNT = SKETCH_WORDS.length
export const MAX_SKETCHERS = 8

/** The paper is GRID by GRID points; a point is `x * GRID + y`. */
export const GRID = 100
/** Inks to draw with; the last is the eraser, which draws in the paper's colour. */
export const INKS = 6
export const ERASER = INKS - 1
/** The most numbers a drawing holds, so that the table still fits in one message. */
export const MAX_INK = 1800
/** The most numbers one move of drawing adds. */
export const MAX_STROKE = 120
export const MAX_GUESS = 30
/** How many words the one drawing chooses from. */
export const OPTIONS = 3

export const CHOOSE_SECONDS = 20
export const DRAW_SECONDS = 80
export const SHOW_SECONDS = 6
/** The guesses the table remembers of a turn, the newest. */
export const MAX_FEED = 16

export type SketchPhase = 'choose' | 'draw' | 'show'

/** Moves, as their first number. */
export const DRAW = 1
export const UNDO = 2
export const CLEAR = 3
export const CHOOSE = 4
export const GUESS = 5
export const GOT = 6

export type SketchMove =
  /** Adds to the drawing: points, each stroke begun by -1 - its ink. */
  | { readonly kind: 'draw'; readonly ink: readonly number[] }
  | { readonly kind: 'undo' }
  | { readonly kind: 'clear' }
  | { readonly kind: 'choose'; readonly option: number }
  | { readonly kind: 'guess'; readonly text: string }
  /** The one drawing marks who said the word aloud. */
  | { readonly kind: 'got'; readonly seat: number }

/** A guess, as everyone sees it: its words, or null for one that got it. */
export interface Guess {
  readonly seat: number
  readonly text: string | null
  /** Nearly the word: only the one who guessed sees this. */
  readonly close: boolean
}

/** The whole game, as the host knows it. */
export interface SketchState {
  /** Played on one device: words are guessed aloud, and the one drawing marks who got it. */
  readonly together: boolean
  /** The turn this is, from 0; the seat drawing is `turn % seats`. */
  readonly turn: number
  readonly turns: number
  readonly phase: SketchPhase
  /** Seconds left in this phase. */
  readonly left: number
  /** The words to choose from, by their number in SKETCH_WORDS. */
  readonly options: readonly number[]
  /** The word drawn, once chosen. */
  readonly word: number | null
  /** The words of the game so far, never offered again. */
  readonly used: readonly number[]
  /** The letters shown to the others, by place in the word, in German and in English. */
  readonly shown: { readonly de: readonly number[]; readonly en: readonly number[] }
  readonly ink: readonly number[]
  /** The seats who got the word this turn, in the order they did. */
  readonly guessed: readonly number[]
  readonly feed: readonly Guess[]
  readonly points: readonly number[]
  /** What each seat scored this turn. */
  readonly gained: readonly number[]
  readonly winner: number | 'draw' | null
}

/** What one seat may see: the word only while they draw it, or once it is shown. */
export interface SketchView {
  readonly together: boolean
  readonly turn: number
  readonly turns: number
  readonly drawer: number
  readonly phase: SketchPhase
  /** Whole seconds left in this phase. */
  readonly left: number
  /** The words to choose from, for the one drawing. */
  readonly options: readonly number[]
  readonly word: number | null
  /**
   * The word as the others see it, in German and English: a `_` for every letter not shown,
   * spaces and hyphens as they are; empty strings for the one drawing and while choosing.
   */
  readonly hint: { readonly de: string; readonly en: string }
  readonly ink: readonly number[]
  readonly guessed: readonly number[]
  readonly feed: readonly Guess[]
  readonly points: readonly number[]
  readonly gained: readonly number[]
  readonly winner: number | 'draw' | null
}

/** The seat drawing in a turn. */
export const drawerOf = (state: { turn: number; points: readonly number[] }): number =>
  state.turn % state.points.length

/** How many turns a game of `seats` has: everyone draws twice with up to three, else once. */
export const turnsFor = (seats: number): number => seats * (seats <= 3 ? 2 : 1)

/** A word's names in a language: the first is the one shown. */
export function names(word: number, language: 'de' | 'en'): string[] {
  return (SKETCH_WORDS[word]?.[language] ?? '').split('|')
}

/** Whether a guess names the word, in either language, by any of its names. */
export function matches(word: number, guess: string): boolean {
  const said = normalize(guess)
  return (
    said !== '' && [...names(word, 'de'), ...names(word, 'en')].some((n) => normalize(n) === said)
  )
}

/** Picks `count` words not used yet, by `random`. */
function pick(used: readonly number[], count: number, random: () => number): number[] {
  let open = SKETCH_WORDS.map((_, i) => i).filter((i) => !used.includes(i))
  if (open.length < count) open = SKETCH_WORDS.map((_, i) => i)
  const picked: number[] = []
  while (picked.length < count && open.length > 0) {
    const i = Math.min(open.length - 1, Math.floor(random() * open.length))
    picked.push(open[i] as number)
    open = open.filter((_, j) => j !== i)
  }
  return picked
}

/** A turn: the next player chooses a word. */
function turnStart(state: SketchState, turn: number, random: () => number): SketchState {
  const options = pick(state.used, OPTIONS, random)
  return {
    ...state,
    turn,
    phase: 'choose',
    left: CHOOSE_SECONDS,
    options,
    word: null,
    used: [...state.used, ...options],
    shown: { de: [], en: [] },
    ink: [],
    guessed: [],
    feed: [],
    gained: state.points.map(() => 0),
  }
}

export function start(seats: number, random: () => number, together = false): SketchState {
  return turnStart(
    {
      together,
      turn: 0,
      turns: turnsFor(seats),
      phase: 'choose',
      left: 0,
      options: [],
      word: null,
      used: [],
      shown: { de: [], en: [] },
      ink: [],
      guessed: [],
      feed: [],
      points: Array.from({ length: seats }, () => 0),
      gained: [],
      winner: null,
    },
    0,
    random,
  )
}

/** Whether a number may stand in a drawing: a point on the paper, or the start of a stroke. */
export function isInk(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= -INKS && (value as number) < GRID * GRID
}

export function encode(move: SketchMove): number[] {
  switch (move.kind) {
    case 'draw':
      return [DRAW, ...move.ink]
    case 'undo':
      return [UNDO]
    case 'clear':
      return [CLEAR]
    case 'choose':
      return [CHOOSE, move.option]
    case 'guess':
      return [GUESS, ...[...move.text].map((char) => char.codePointAt(0) ?? 32)]
    case 'got':
      return [GOT, move.seat]
  }
}

export function decode(numbers: readonly number[]): SketchMove | null {
  const [kind, a, ...rest] = numbers
  if (kind === DRAW) {
    const ink = numbers.slice(1)
    return ink.length > 0 && ink.length <= MAX_STROKE && ink.every(isInk)
      ? { kind: 'draw', ink }
      : null
  }
  if (kind === GUESS) {
    const text = decodeText(numbers.slice(1), MAX_GUESS)
    return text ? { kind: 'guess', text } : null
  }
  if (kind === UNDO || kind === CLEAR) {
    return numbers.length === 1 ? { kind: kind === UNDO ? 'undo' : 'clear' } : null
  }
  if (a === undefined || rest.length > 0 || !Number.isInteger(a) || a < 0) return null
  if (kind === CHOOSE) return a < OPTIONS ? { kind: 'choose', option: a } : null
  if (kind === GOT) return { kind: 'got', seat: a }
  return null
}

/** Whether `seat` may make this move now. */
export function legal(state: SketchState, seat: number, move: SketchMove): boolean {
  if (state.winner !== null || seat < 0 || seat >= state.points.length) return false
  const drawer = drawerOf(state)
  switch (move.kind) {
    case 'choose':
      return state.phase === 'choose' && seat === drawer && move.option < state.options.length
    case 'draw': {
      if (state.phase !== 'draw' || seat !== drawer) return false
      // A drawing begins with a stroke, and stays small enough to send.
      const first = move.ink[0] ?? 0
      return (state.ink.length > 0 || first < 0) && state.ink.length + move.ink.length <= MAX_INK
    }
    case 'undo':
    case 'clear':
      return state.phase === 'draw' && seat === drawer && state.ink.length > 0
    case 'guess':
      return (
        state.phase === 'draw' &&
        !state.together &&
        seat !== drawer &&
        !state.guessed.includes(seat)
      )
    case 'got':
      return (
        state.phase === 'draw' &&
        seat === drawer &&
        move.seat !== drawer &&
        move.seat < state.points.length &&
        !state.guessed.includes(move.seat)
      )
  }
}

/** The points for the next who gets the word: 3, then 2, then 1. */
const award = (place: number) => Math.max(1, 3 - place)

/** A seat got the word: they and the one drawing score, and the turn ends once all have. */
function got(state: SketchState, seat: number): SketchState {
  const drawer = drawerOf(state)
  const score = award(state.guessed.length)
  const add = (list: readonly number[]) =>
    list.map((n, i) => n + (i === seat ? score : i === drawer ? 1 : 0))
  const next = {
    ...state,
    guessed: [...state.guessed, seat],
    feed: [...state.feed, { seat, text: null, close: false }].slice(-MAX_FEED),
    points: add(state.points),
    gained: add(state.gained),
  }
  return next.guessed.length >= state.points.length - 1 ? reveal(next) : next
}

/** The word is shown to everyone, for a few seconds. */
function reveal(state: SketchState): SketchState {
  return { ...state, phase: 'show', left: SHOW_SECONDS }
}

/** The game after a legal move by `seat`. */
export function play(state: SketchState, seat: number, move: SketchMove): SketchState {
  switch (move.kind) {
    case 'choose':
      return {
        ...state,
        phase: 'draw',
        left: DRAW_SECONDS,
        word: state.options[move.option] ?? null,
      }
    case 'draw':
      return { ...state, ink: [...state.ink, ...move.ink] }
    case 'undo': {
      const last = state.ink.findLastIndex((n) => n < 0)
      return { ...state, ink: state.ink.slice(0, Math.max(0, last)) }
    }
    case 'clear':
      return { ...state, ink: [] }
    case 'got':
      return got(state, move.seat)
    case 'guess': {
      const word = state.word ?? -1
      if (matches(word, move.text)) return got(state, seat)
      const close = [...names(word, 'de'), ...names(word, 'en')].some(
        (name) => normalize(name).length >= 4 && nearly(name, move.text),
      )
      const feed = [...state.feed, { seat, text: move.text, close }].slice(-MAX_FEED)
      return { ...state, feed }
    }
  }
}

/** Letters to show of a word: one more at half time, and another with a quarter left. */
function hintsDue(left: number): number {
  return left <= DRAW_SECONDS / 4 ? 2 : left <= DRAW_SECONDS / 2 ? 1 : 0
}

/** The places of the letters of a word that may be shown. */
function letterPlaces(word: string): number[] {
  return [...word].flatMap((char, i) => (/\p{L}/u.test(char) ? [i] : []))
}

/** Shows letters as they come due, at places chosen by `random`. */
function hints(state: SketchState, random: () => number): SketchState {
  if (state.word === null) return state
  const due = hintsDue(state.left)
  const shown = { ...state.shown }
  let changed = false
  for (const language of ['de', 'en'] as const) {
    const word = names(state.word, language)[0] ?? ''
    const places = letterPlaces(word)
    // Short words keep most of their letters hidden: at most a third shows.
    const most = Math.min(due, Math.floor(places.length / 3))
    while (shown[language].length < most) {
      const open = places.filter((p) => !shown[language].includes(p))
      const place = open[Math.min(open.length - 1, Math.floor(random() * open.length))] ?? 0
      shown[language] = [...shown[language], place]
      changed = true
    }
  }
  return changed ? { ...state, shown } : state
}

/** The game after `seconds` more: time runs out on choosing, drawing and showing the word. */
export function advance(state: SketchState, seconds: number, random: () => number): SketchState {
  if (state.winner !== null) return state
  const left = Math.max(0, state.left - seconds)
  if (left > 0) {
    const next = { ...state, left }
    return state.phase === 'draw' ? hints(next, random) : next
  }
  if (state.phase === 'choose')
    return play({ ...state, left: 0 }, drawerOf(state), { kind: 'choose', option: 0 })
  if (state.phase === 'draw') return reveal({ ...state, left: 0 })
  // The word was shown: the next turn, or the end.
  if (state.turn + 1 < state.turns) return turnStart(state, state.turn + 1, random)
  const best = Math.max(...state.points)
  const top = state.points.flatMap((p, i) => (p === best ? [i] : []))
  return { ...state, left: 0, winner: top.length === 1 ? (top[0] ?? 0) : 'draw' }
}

/** The word with only the letters at `shown` showing. */
function masked(word: string, shown: readonly number[]): string {
  return [...word]
    .map((char, i) => (/\p{L}/u.test(char) && !shown.includes(i) ? '_' : char))
    .join('')
}

/** What `seat` may see; a seat of -1, or any that does not play, only watches. */
export function view(state: SketchState, seat: number): SketchView {
  const drawer = drawerOf(state)
  const mine = seat === drawer
  const open = state.phase === 'show' || state.winner !== null
  const hint =
    state.word === null || mine || open
      ? { de: '', en: '' }
      : {
          de: masked(names(state.word, 'de')[0] ?? '', state.shown.de),
          en: masked(names(state.word, 'en')[0] ?? '', state.shown.en),
        }
  return {
    together: state.together,
    turn: state.turn,
    turns: state.turns,
    drawer,
    phase: state.phase,
    left: Math.ceil(state.left),
    options: mine && state.phase === 'choose' ? state.options : [],
    word: mine || open ? state.word : null,
    hint,
    ink: state.ink,
    guessed: state.guessed,
    feed: state.feed.map((guess) => (guess.seat === seat ? guess : { ...guess, close: false })),
    points: state.points,
    gained: state.gained,
    winner: state.winner,
  }
}

/** The seats to act now: the one drawing, while they choose or draw. */
export function waitingFor(view: SketchView): number[] {
  return view.winner === null && view.phase !== 'show' ? [view.drawer] : []
}
