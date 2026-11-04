/**
 * Reaction, in real time, as pure rules: two to six players wait for a signal, and whoever taps
 * first once it shows scores a point. Whoever taps before it has jumped the gun, and cannot win
 * that signal. The first to POINTS_TO_WIN points wins, if nobody else has as many.
 *
 * Every phone measures its own player's time, from the moment it showed the signal to the tap,
 * so that the network's delay counts for nobody: the host only compares the times. It alone
 * knows when the signal comes, at random, and shows nothing of it before.
 */

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 6
export const POINTS_TO_WIN = 5
/** Seconds before the first signal. */
export const READY = 2.5
/** The shortest and the longest wait for a signal, in seconds. */
export const WAIT_MIN = 1.5
export const WAIT_MAX = 5
/** Seconds the host waits for every tap once the signal shows: the time, and the network's. */
export const GO_LIMIT = 3
/** Seconds the result of a signal shows before the wait for the next. */
export const RESULT = 2.5
/** A tap before the signal, in place of a time. */
export const EARLY = -1
/** The longest time a tap can take, in milliseconds: the whole time the signal is open. */
export const MAX_TIME = GO_LIMIT * 1000

export type Phase = 'ready' | 'wait' | 'go' | 'result'

export interface ReactionState {
  readonly phase: Phase
  /** The signals so far: each answer names the one it is for. */
  readonly signal: number
  /** Seconds left in this phase. */
  readonly timer: number
  /** Each seat's answer to this signal: its time in milliseconds, EARLY, or null for none yet. */
  readonly answers: readonly (number | null)[]
  readonly points: readonly number[]
  /** The seats that were fastest at the last signal, and scored. */
  readonly scored: readonly number[]
}

/** What every phone sees: everything but how long the wait for the signal still is. */
export type ReactionView = Omit<ReactionState, 'timer'>

export function start(players: number): ReactionState {
  if (players < MIN_PLAYERS || players > MAX_PLAYERS) throw new RangeError(`${players} players`)
  return {
    phase: 'ready',
    signal: 0,
    timer: READY,
    answers: Array(players).fill(null),
    points: Array(players).fill(0),
    scored: [],
  }
}

/** Whether numbers make an answer: a signal, and a time in milliseconds or EARLY. */
export function isAnswer(signal: number, time: number): boolean {
  return (
    Number.isInteger(signal) &&
    signal >= 1 &&
    (time === EARLY || (Number.isInteger(time) && time >= 0 && time <= MAX_TIME))
  )
}

/**
 * A seat's answer to signal `signal`: taken once, for the signal of now, while it is awaited.
 * Before the signal shows, only a tap too early is an answer.
 */
export function answer(
  state: ReactionState,
  seat: number,
  signal: number,
  time: number,
): ReactionState {
  if (!isAnswer(signal, time) || signal !== state.signal) return state
  if (state.answers[seat] !== null || seat < 0 || seat >= state.answers.length) return state
  if (state.phase !== 'go' && !(state.phase === 'wait' && time === EARLY)) return state
  const answers = state.answers.map((given, i) => (i === seat ? time : given))
  const next = { ...state, answers }
  return answers.every((given) => given !== null) ? close(next) : next
}

/** The signal is over: the fastest who did not jump the gun score. */
function close(state: ReactionState): ReactionState {
  const times = state.answers.flatMap((time) => (time !== null && time !== EARLY ? [time] : []))
  const best = times.length > 0 ? Math.min(...times) : null
  const scored = best === null ? [] : state.answers.flatMap((t, seat) => (t === best ? [seat] : []))
  const points = state.points.map((p, seat) => (scored.includes(seat) ? p + 1 : p))
  return { ...state, phase: 'result', timer: RESULT, points, scored }
}

/** The game `seconds` later; `random` picks how long each wait for the signal is. */
export function advance(
  state: ReactionState,
  seconds: number,
  random: () => number,
): ReactionState {
  let next = state
  let time = Math.max(0, seconds)
  while (outcome(next) === null && time >= next.timer) {
    time -= next.timer
    next = phaseOver(next, random)
  }
  return outcome(next) === null ? { ...next, timer: next.timer - time } : next
}

function phaseOver(state: ReactionState, random: () => number): ReactionState {
  if (state.phase === 'wait') {
    // Everyone jumped the gun: the signal is over before it shows.
    if (state.answers.every((given) => given !== null)) return close(state)
    return { ...state, phase: 'go', timer: GO_LIMIT }
  }
  if (state.phase === 'go') return close(state)
  return {
    ...state,
    phase: 'wait',
    signal: state.signal + 1,
    timer: WAIT_MIN + random() * (WAIT_MAX - WAIT_MIN),
    answers: state.answers.map(() => null),
    scored: [],
  }
}

/** The seat that has POINTS_TO_WIN points and more than anyone else, or null. */
export function outcome(state: ReactionState | ReactionView): number | null {
  if (state.phase !== 'result') return null
  const most = Math.max(...state.points)
  if (most < POINTS_TO_WIN) return null
  const leaders = state.points.flatMap((p, seat) => (p === most ? [seat] : []))
  return leaders.length === 1 ? (leaders[0] ?? null) : null
}

export function view(state: ReactionState): ReactionView {
  const { timer: _, ...shown } = state
  return shown
}
