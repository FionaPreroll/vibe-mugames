import {
  advance,
  type Disc,
  fromRink,
  HALF,
  type HockeyState,
  type HockeyView,
  start,
  type Target,
  view,
} from '../src/core/airhockey'
import type { HostClockOptions } from '../src/net/clock'
import { arrivalPuck, RinkSmoother } from '../src/net/smooth'

/**
 * The benchmark of air hockey's smoothing (see docs/NETWORKING.md): a host runs a real game
 * between two simple players; its states cross a made-up network, with delay, jitter and spikes;
 * a phone draws 60 frames a second, as it does without smoothing and with the Kalman filter at
 * several settings, through the same code as the rink on the screen (src/net/smooth.ts).
 * Everything comes from fixed seeds, so a run gives the same numbers on every computer.
 */

/** The network between host and phone, in seconds. */
export interface Scenario {
  readonly id: string
  readonly name: string
  /** The least one-way delay. */
  readonly delay: number
  /** Jitter on top, spread evenly from 0 to this. */
  readonly jitter: number
  /** How often a state is held up by a spike, and by how much more. */
  readonly spikes: number
  readonly spike: number
  /** Seconds between two states the host sends. */
  readonly every: number
  /** A lasting change of delay, `by` seconds from second `at` on. */
  readonly step?: { readonly at: number; readonly by: number }
}

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'quiet',
    name: 'Quiet Wi-Fi',
    delay: 0.008,
    jitter: 0.006,
    spikes: 0.01,
    spike: 0.03,
    every: 1 / 30,
  },
  {
    id: 'busy',
    name: 'Busy Wi-Fi',
    delay: 0.02,
    jitter: 0.06,
    spikes: 0.05,
    spike: 0.12,
    every: 1 / 30,
  },
  {
    id: 'bluetooth',
    name: 'Bluetooth',
    delay: 0.04,
    jitter: 0.04,
    spikes: 0.03,
    spike: 0.08,
    every: 1 / 15,
  },
  {
    id: 'step',
    name: 'Delay step',
    delay: 0.02,
    jitter: 0.03,
    spikes: 0.02,
    spike: 0.08,
    every: 1 / 30,
    step: { at: 12, by: 0.1 },
  },
]

/** How a phone draws: as states arrive, or by the filtered clock, tuned as given. */
export interface Method {
  readonly id: string
  readonly name: string
  readonly filter: HostClockOptions | null
}

export const METHODS: readonly Method[] = [
  { id: 'arrival', name: 'Unfiltered', filter: null },
  { id: 'kalman', name: 'Kalman (default, q = 10⁻⁴)', filter: {} },
  { id: 'quick', name: 'Kalman, q = 10⁻³', filter: { drift: 1e-3 } },
  { id: 'steady', name: 'Kalman, q = 10⁻⁵', filter: { drift: 1e-5 } },
]

/** Seconds of play, the seconds left out at the start, and frames a second. */
export const SECONDS = 24
const WARM_UP = 4
const FPS = 60
/** The host's ticks: 30 a second, each run in the game's own fine steps. */
const TICK = 1 / 30
/** How finely the truth is kept, for comparing. */
const FINE = 1 / 240
/** The phone's clock against the host's: any number, as the filter must not care. */
const SKEW = 1000

/** The numbers of one method in one scenario. */
export interface Metrics {
  /** How far the drawn host time jumps from frame to frame beyond the frame's length (RMS, ms). */
  readonly clockRoughness: number
  /** How far behind the host's own time the drawing is, on average and its spread (ms). */
  readonly lagMean: number
  readonly lagSpread: number
  /** How far the drawn puck is from where it was at that steady lag (RMS and 95th, % of rink width). */
  readonly puckRms: number
  readonly puck95: number
  /**
   * After a lasting change of delay: how long until the drawing lags as it will from then on,
   * within 10 ms over half a second and staying there (ms); null without one, or if it never
   * holds steady.
   */
  readonly settle: number | null
}

/** Frames of one method, for the plots: the phone's time, the drawn host time and the puck. */
export interface Trace {
  /** The host's own time at each frame. */
  readonly host: number[]
  readonly drawn: number[]
  readonly puck: { x: number; y: number }[]
  /** Where the puck was at the steady lag: what a perfect, even drawing would show. */
  readonly truth: { x: number; y: number }[]
  /** Frames counted (in play, away from goals). */
  readonly counted: boolean[]
}

export interface Result {
  readonly metrics: Metrics
  readonly trace: Trace
}

function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 2 ** 32
  }
}

/** One game on the host, its fine path for comparing and the states it sends. */
interface Game {
  /** The puck every 1/240 s, and whether it was in play. */
  readonly path: { puck: Disc; playing: boolean }[]
  readonly states: { view: HockeyView; sent: number }[]
}

/**
 * Two simple players: each strikes through the puck while it is in their half, off to one side as
 * chance has it, and waits in front of their goal otherwise.
 */
function play(every: number): Game {
  const random = seeded(7)
  let state: HockeyState = start()
  const path: Game['path'] = []
  const states: Game['states'] = []
  const sendEvery = Math.round(every / TICK)
  let aims: (Target | null)[] = [null, null]
  let offsets = [0, 0]
  for (let tick = 0; tick * TICK < SECONDS + 1; tick++) {
    if (tick % 30 === 0) offsets = [random() * 0.12 - 0.06, random() * 0.12 - 0.06]
    aims = [0, 1].map((seat) => {
      const own = fromRink(seat, state.puck)
      // Its half; seat 0 also takes the face-off on the middle line, so that the two do not
      // squeeze the puck between them.
      return own.y < (seat === 0 ? HALF + 0.05 : HALF - 0.01)
        ? { x: own.x + (offsets[seat] ?? 0), y: own.y + 0.3 }
        : { x: 0.5, y: 0.3 }
    })
    for (let step = 0; step < TICK / FINE - 1e-9; step++) {
      state = advance(state, aims, FINE)
      path.push({ puck: state.puck, playing: state.pause === 0 })
    }
    if (tick % sendEvery === 0) states.push({ view: view(state), sent: (tick + 1) * TICK })
  }
  return { path, states }
}

/** The puck at the host's time `t`, from the fine path. */
function truthAt(game: Game, t: number): { puck: Disc; playing: boolean } {
  const i = Math.max(0, Math.min(game.path.length - 1, Math.round(t / FINE) - 1))
  return game.path[i] ?? { puck: start().puck, playing: false }
}

/** Runs a method in a scenario. */
export function bench(scenario: Scenario, method: Method): Result {
  const game = play(scenario.every)
  const random = seeded(11)
  const arrivals = game.states
    .map(({ view: state, sent }) => {
      const step = scenario.step && sent >= scenario.step.at ? scenario.step.by : 0
      const spike = random() < scenario.spikes ? scenario.spike : 0
      const delay = scenario.delay + step + random() * scenario.jitter + spike
      return { view: state, arrives: sent + SKEW + delay }
    })
    .sort((a, b) => a.arrives - b.arrives)

  const smoother = method.filter ? new RinkSmoother(method.filter) : null
  let latest: { view: HockeyView; arrives: number } | null = null
  let next = 0
  const trace: Trace = { host: [], drawn: [], puck: [], truth: [], counted: [] }
  for (let frame = SKEW; frame < SKEW + SECONDS; frame += 1 / FPS) {
    for (; next < arrivals.length && (arrivals[next]?.arrives ?? Infinity) <= frame; next++) {
      const arrival = arrivals[next]
      if (!arrival) continue
      latest = arrival
      smoother?.observe(arrival.view, arrival.arrives, false)
    }
    if (!latest) continue
    const since = frame - latest.arrives
    const drawnPuck = smoother
      ? (smoother.puck(frame, 1 / FPS) ?? latest.view.puck)
      : arrivalPuck(latest.view, false, since)
    const drawn = smoother
      ? smoother.time(frame)
      : latest.view.clock + (latest.view.pause === 0 ? Math.min(0.15, since) : since)
    trace.host.push(frame - SKEW)
    trace.drawn.push(drawn)
    trace.puck.push({ x: drawnPuck.x, y: drawnPuck.y })
  }

  // The steady lag of this method, and the truth at it: where an even drawing would be. With a
  // lasting change of delay, before it and from two seconds after it, each on its own.
  const from = trace.host.findIndex((t) => t >= WARM_UP)
  const lags = trace.host.map((t, i) => t - (trace.drawn[i] ?? t))
  const step = scenario.step
  const segments: [number, number][] = step
    ? [
        [WARM_UP, step.at],
        [step.at + 2, SECONDS],
      ]
    : [[WARM_UP, SECONDS]]
  const segmentOf = (t: number) => segments.findIndex(([a, b]) => t >= a && t < b)
  const means = segments.map(([a, b]) => {
    const inside = lags.filter((_, i) => (trace.host[i] ?? 0) >= a && (trace.host[i] ?? 0) < b)
    return inside.reduce((sum, lag) => sum + lag, 0) / inside.length
  })
  const deviations = lags
    .map((lag, i) => {
      const segment = segmentOf(trace.host[i] ?? 0)
      return segment < 0 ? null : lag - (means[segment] ?? 0)
    })
    .filter((d): d is number => d !== null)
  const lagMean = means.reduce((sum, m) => sum + m, 0) / means.length
  const lagSpread = Math.sqrt(deviations.reduce((sum, d) => sum + d * d, 0) / deviations.length)
  let settle: number | null = null
  if (step) {
    // The lag over half a second around each frame, so that jitter is not taken for settling.
    const after = means[1] ?? 0
    const half = Math.round(FPS / 4)
    let last = step.at
    trace.host.forEach((t, i) => {
      if (t < step.at || t >= SECONDS - 0.25) return
      const near = lags.slice(Math.max(0, i - half), i + half + 1)
      const average = near.reduce((sum, lag) => sum + lag, 0) / near.length
      if (Math.abs(average - after) > 0.01) last = t
    })
    // Still off in the last seconds: it never holds steady, as drawing by arrival never does.
    settle = last > SECONDS - 3 ? null : round((last - step.at) * 1000)
  }
  const errors: number[] = []
  trace.host.forEach((t, i) => {
    const segment = segmentOf(t)
    const at = t - (means[Math.max(0, segment)] ?? lagMean)
    // Away from goals and face-offs, where the puck is put back and every drawing jumps.
    const playing = [-0.3, -0.15, 0, 0.15, 0.3].every((d) => truthAt(game, at + d).playing)
    const truth = truthAt(game, at).puck
    trace.truth.push({ x: truth.x, y: truth.y })
    const ok = i >= from && segment >= 0 && playing
    trace.counted.push(ok)
    const puck = trace.puck[i]
    if (ok && puck) errors.push(Math.hypot(puck.x - truth.x, puck.y - truth.y))
  })
  let roughness = 0
  let steps = 0
  for (let i = from + 1; i < trace.drawn.length; i++) {
    const d =
      (trace.drawn[i] ?? 0) -
      (trace.drawn[i - 1] ?? 0) -
      ((trace.host[i] ?? 0) - (trace.host[i - 1] ?? 0))
    roughness += d * d
    steps++
  }
  const sorted = [...errors].sort((a, b) => a - b)
  return {
    metrics: {
      clockRoughness: round(Math.sqrt(roughness / steps) * 1000),
      lagMean: round(lagMean * 1000),
      lagSpread: round(lagSpread * 1000),
      puckRms: round(Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / errors.length) * 100),
      puck95: round((sorted[Math.floor(sorted.length * 0.95)] ?? 0) * 100),
      settle,
    },
    trace,
  }
}

/** Every method in every scenario, as the numbers the docs show. */
export function benchAll(): Record<string, Record<string, Metrics>> {
  const all: Record<string, Record<string, Metrics>> = {}
  for (const scenario of SCENARIOS) {
    all[scenario.id] = {}
    for (const method of METHODS) {
      const row = all[scenario.id]
      if (row) row[method.id] = bench(scenario, method).metrics
    }
  }
  return all
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
