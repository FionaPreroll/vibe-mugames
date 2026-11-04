/**
 * Colour Echo, in real time, as pure rules: everyone watches the same row of colours light up,
 * one after another, on a pad of four, then taps it back on their own pad, all at the same
 * time. Whoever taps a wrong colour, or waits too long, is out. Everyone still in after a row
 * gets the same row again, one colour longer. The last player still in wins, once they have
 * tapped their row back; if the last ones go out in the same row, whoever got further in it
 * wins, and as far makes a draw.
 *
 * The host alone picks the colours, at random, and shows a row only while it lights up.
 */

/** The pad's colours: 0 at the top, 1 on the right, 2 at the bottom, 3 on the left. */
export const COLOURS = 4
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 6
/** The colours of the first row. */
export const START_LENGTH = 2
/** The longest row: everyone still in after it makes a draw. */
export const MAX_LENGTH = 32
/** Seconds before the first row lights up, and before every other. */
export const FIRST_LEAD = 2.5
export const LEAD = 0.8
/** Seconds a colour stays lit, of the time each takes. */
export const LIT = 0.6
/** Seconds a player may take for each tap. */
export const TAP_TIME = 5
/** Seconds between a row tapped back and the next one lighting up. */
export const PAUSE = 1.5

export type Phase = 'show' | 'repeat' | 'pause'

export interface EchoState {
  /** The row of colours, as long as it is now. */
  readonly pattern: readonly number[]
  readonly phase: Phase
  /** Seconds since the phase began. */
  readonly clock: number
  /** Each seat's taps in this row, in order. */
  readonly entries: readonly (readonly number[])[]
  /** Seconds since each seat's last tap, or since the row began. */
  readonly idle: readonly number[]
  /** The length of the row each seat went out in; null while it is in. */
  readonly out: readonly (number | null)[]
  /** Whether a seat went out by waiting too long, not by a wrong colour. */
  readonly late: readonly boolean[]
  readonly winner: number | 'draw' | null
}

/** Colour Echo as one player sees it: the row only while it lights up, and their own taps. */
export interface EchoView {
  readonly length: number
  /** The row while it lights up, between rows and once the game is over; otherwise empty. */
  readonly pattern: readonly number[]
  readonly phase: Phase
  readonly clock: number
  /** How many colours each seat has tapped in this row. */
  readonly progress: readonly number[]
  /** The viewer's own taps in this row; empty for anyone not at the pad. */
  readonly entries: readonly number[]
  readonly out: readonly (number | null)[]
  readonly late: readonly boolean[]
  readonly winner: number | 'draw' | null
}

export const isColour = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) < COLOURS

/** Seconds each colour of a row of `length` takes: a little faster as rows grow. */
export function stepTime(length: number): number {
  return Math.max(0.4, 0.75 - 0.015 * length)
}

/** Seconds before a row of `length` lights up: longer for the first. */
export function leadTime(length: number): number {
  return length <= START_LENGTH ? FIRST_LEAD : LEAD
}

/** Seconds a row of `length` takes to light up, from the start of its phase to its end. */
export function showTime(length: number): number {
  return leadTime(length) + length * stepTime(length)
}

/** The colour lit `clock` seconds into the showing of a row, or null between two. */
export function litAt(pattern: readonly number[], clock: number): number | null {
  const step = stepTime(pattern.length)
  const into = clock - leadTime(pattern.length)
  if (into < 0) return null
  const index = Math.floor(into / step)
  if (index >= pattern.length || into - index * step > LIT * step) return null
  return pattern[index] ?? null
}

function colour(random: () => number): number {
  return Math.min(COLOURS - 1, Math.floor(random() * COLOURS))
}

export function start(players: number, random: () => number): EchoState {
  if (players < MIN_PLAYERS || players > MAX_PLAYERS) throw new RangeError(`${players} players`)
  return {
    pattern: Array.from({ length: START_LENGTH }, () => colour(random)),
    phase: 'show',
    clock: 0,
    entries: Array.from({ length: players }, () => []),
    idle: Array(players).fill(0),
    out: Array(players).fill(null),
    late: Array(players).fill(false),
    winner: null,
  }
}

/**
 * A seat's taps in the row of `length` so far, all of them, as its phone sends them again and
 * again: only taps beyond those the host has are new. A wrong one puts the seat out.
 */
export function enter(
  state: EchoState,
  seat: number,
  length: number,
  taps: readonly number[],
): EchoState {
  const had = state.entries[seat]
  if (state.winner !== null || state.phase !== 'repeat' || had === undefined) return state
  if (length !== state.pattern.length || state.out[seat] !== null) return state
  if (taps.length <= had.length || taps.length > length) return state
  if (!had.every((tap, i) => taps[i] === tap) || !taps.every(isColour)) return state
  const wrong = taps.findIndex((tap, i) => i >= had.length && tap !== state.pattern[i])
  const kept = wrong < 0 ? [...taps] : taps.slice(0, wrong + 1)
  const next: EchoState = {
    ...state,
    entries: state.entries.map((entry, i) => (i === seat ? kept : entry)),
    idle: state.idle.map((idle, i) => (i === seat ? 0 : idle)),
    out: wrong < 0 ? state.out : state.out.map((out, i) => (i === seat ? length : out)),
  }
  return settle(next)
}

/** Whether a seat is still to tap in this row: in, and not done with it. */
function tapping(state: EchoState, seat: number): boolean {
  return state.out[seat] === null && (state.entries[seat]?.length ?? 0) < state.pattern.length
}

/** The colours a seat got right in the row it went out in, or in this one. */
function rightTaps(state: EchoState, seat: number): number {
  const taps = state.entries[seat]?.length ?? 0
  return state.out[seat] !== null && !state.late[seat] ? taps - 1 : taps
}

/** Once nobody is still to tap: the next row, or the end of the game. */
function settle(state: EchoState): EchoState {
  if (state.phase !== 'repeat' || state.out.some((_, seat) => tapping(state, seat))) return state
  const length = state.pattern.length
  const still = state.out.flatMap((out, seat) => (out === null ? [seat] : []))
  if (still.length === 1) return { ...state, winner: still[0] ?? 'draw' }
  if (still.length > 1) {
    if (length >= MAX_LENGTH) return { ...state, winner: 'draw' }
    return { ...state, phase: 'pause', clock: 0 }
  }
  // Everyone still in went out in this row: whoever got furthest wins.
  const last = state.out.flatMap((out, seat) => (out === length ? [seat] : []))
  const best = Math.max(...last.map((seat) => rightTaps(state, seat)))
  const furthest = last.filter((seat) => rightTaps(state, seat) === best)
  return { ...state, winner: furthest.length === 1 ? (furthest[0] ?? 'draw') : 'draw' }
}

/**
 * The game `seconds` later: a row lights up, then everyone taps it back, each within TAP_TIME
 * of their last tap, then a pause, and `random` adds the next colour.
 */
export function advance(state: EchoState, seconds: number, random: () => number): EchoState {
  if (state.winner !== null) return state
  const time = Math.max(0, seconds)
  const clock = state.clock + time
  if (state.phase === 'show') {
    if (clock < showTime(state.pattern.length)) return { ...state, clock }
    return {
      ...state,
      phase: 'repeat',
      clock: 0,
      idle: state.idle.map(() => 0),
    }
  }
  if (state.phase === 'pause') {
    if (clock < PAUSE) return { ...state, clock }
    return {
      ...state,
      pattern: [...state.pattern, colour(random)],
      phase: 'show',
      clock: 0,
      entries: state.entries.map(() => []),
    }
  }
  const idle = state.idle.map((idle, seat) => (tapping(state, seat) ? idle + time : idle))
  const slow = idle.map((idle, seat) => tapping(state, seat) && idle > TAP_TIME)
  return settle({
    ...state,
    clock,
    idle,
    out: state.out.map((out, seat) => (slow[seat] ? state.pattern.length : out)),
    late: state.late.map((late, seat) => late || (slow[seat] ?? false)),
  })
}

/** The game as `seat` sees it; -1 for anyone not at the pad. */
export function view(state: EchoState, seat: number): EchoView {
  const open = state.phase !== 'repeat' || state.winner !== null
  return {
    length: state.pattern.length,
    pattern: open ? state.pattern : [],
    phase: state.phase,
    clock: Math.round(state.clock * 100) / 100,
    progress: state.entries.map((entry) => entry.length),
    entries: state.entries[seat] ?? [],
    out: state.out,
    late: state.late,
    winner: state.winner,
  }
}

/** Colours a number holds, in input: four colours are two bits. */
const PER_NUMBER = 16

/** Taps as the input carries them: how many, then the colours, PER_NUMBER to a number. */
export function packTaps(taps: readonly number[]): number[] {
  const packs: number[] = []
  for (let from = 0; from < taps.length; from += PER_NUMBER) {
    packs.push(
      taps.slice(from, from + PER_NUMBER).reduce((sum, tap, i) => sum + tap * COLOURS ** i, 0),
    )
  }
  return [taps.length, ...packs]
}

/** The taps in input from `packTaps`, or null for anything else. */
export function unpackTaps(values: readonly number[]): number[] | null {
  const [count, ...packs] = values
  if (count === undefined || !Number.isInteger(count) || count < 1 || count > MAX_LENGTH) {
    return null
  }
  if (packs.length !== Math.ceil(count / PER_NUMBER)) return null
  const taps: number[] = []
  for (const [index, pack] of packs.entries()) {
    const size = Math.min(PER_NUMBER, count - index * PER_NUMBER)
    if (!Number.isInteger(pack) || pack < 0 || pack >= COLOURS ** size) return null
    let rest = pack
    for (let i = 0; i < size; i++) {
      taps.push(rest % COLOURS)
      rest = Math.floor(rest / COLOURS)
    }
  }
  return taps
}
