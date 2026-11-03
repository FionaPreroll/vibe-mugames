/**
 * The host's clock as this phone reads it, through the jitter of the network: a Kalman filter.
 *
 * The host stamps each state of a game in real time with its own game time (`HockeyState.clock`).
 * What it says is exact; only when it arrives is not: one-way delay, and its jitter, from a few
 * milliseconds on a quiet Wi-Fi to tens on a busy one or over Bluetooth, with now and then a
 * spike. Drawing each state from the moment it arrived, as phones do without this, makes the
 * puck jump back and forth by that jitter, and stall when a state is late.
 *
 * So the filter estimates one number: the offset from this phone's clock to the host's, as it
 * reaches here (`host − local`), which holds the clocks' difference and the mean delay. Each
 * state is a measurement of it; their scatter is the jitter, which the filter learns as it goes
 * (the measurement noise), and the offset may wander slowly, as the delay of a connection does
 * (the process noise). `now()` is then a steady host time, which runs at the pace of this phone's
 * clock instead of jumping with every state, and follows a lasting change of delay within a
 * second or two. A new game, whose clock starts again, or a jump of more than half a second,
 * such as a page that was in the background, starts the filter anew.
 */

/** How fast the offset may wander, as a variance per second (s²/s): slowly, as delay does. */
const DRIFT = 1e-4
/** What the jitter is taken to be until learned, and the bounds of what it may be (s²). */
const FIRST_NOISE = 1e-3
const MIN_NOISE = 1e-6
const MAX_NOISE = 0.05
/** How much of the jitter's estimate each measurement makes. */
const LEARN = 0.05
/** An offset this far off, in seconds, is no jitter: the filter starts anew. */
const RESET = 0.5

/** How a filter is tuned; the defaults are what phones use (see docs/NETWORKING.md). */
export interface HostClockOptions {
  /** Process noise: how fast the offset may wander, as a variance per second (s²/s). */
  readonly drift?: number
  /** How much of the learned jitter each measurement makes, from 0 to 1. */
  readonly learn?: number
  /** A jitter to take as it is, as a variance (s²), instead of learning it. */
  readonly fixedNoise?: number
}

export class HostClock {
  private offset = 0
  private variance = Number.POSITIVE_INFINITY
  private noise: number
  private lastHost = Number.NEGATIVE_INFINITY
  private lastLocal = 0
  private readonly drift: number
  private readonly learn: number
  private readonly fixed: boolean

  constructor(options: HostClockOptions = {}) {
    this.drift = options.drift ?? DRIFT
    this.learn = options.learn ?? LEARN
    this.fixed = options.fixedNoise !== undefined
    this.noise = options.fixedNoise ?? FIRST_NOISE
  }

  /** A state stamped `host` (seconds of the host's game) arrived at `local` (this phone's seconds). */
  observe(host: number, local: number): void {
    if (!Number.isFinite(host) || !Number.isFinite(local)) return
    // An older state, overtaken on the way, teaches nothing; a clock far back is a new game.
    if (host <= this.lastHost && host > this.lastHost - RESET) return
    const measured = host - local
    if (!this.started() || host < this.lastHost || Math.abs(measured - this.offset) > RESET) {
      this.offset = measured
      this.variance = this.noise
    } else {
      this.variance += this.drift * Math.max(0, local - this.lastLocal)
      const innovation = measured - this.offset
      if (!this.fixed)
        this.noise = Math.min(
          MAX_NOISE,
          Math.max(MIN_NOISE, (1 - this.learn) * this.noise + this.learn * innovation * innovation),
        )
      const gain = this.variance / (this.variance + this.noise)
      this.offset += gain * innovation
      this.variance *= 1 - gain
    }
    this.lastHost = host
    this.lastLocal = local
  }

  /** Whether a state has come yet. */
  started(): boolean {
    return Number.isFinite(this.variance)
  }

  /** The host's game time now, as filtered: steady, at this phone's pace. */
  now(local: number): number {
    return local + this.offset
  }

  /** The jitter learned so far, as a standard deviation in seconds. */
  jitter(): number {
    return Math.sqrt(this.noise)
  }
}

/** A point, or a disc's place. */
export interface Point {
  readonly x: number
  readonly y: number
}

/** How fast a correction fades in, in seconds: quick enough to follow, slow enough not to jump. */
const FADE = 0.08
/** A correction this large is no jitter but a jump, such as the puck put back after a goal. */
const SNAP = 0.3

/**
 * Something drawn where a model says, with corrections faded in. When a new state changes the
 * model's mind, as when it shows the puck hit a mallet the phone did not know of, the drawing does
 * not jump there but closes the gap within a fraction of a second; a large jump, such as the puck
 * put back after a goal, is drawn at once. Between corrections, it is drawn right where the model
 * says, so a gliding puck does not lag behind.
 */
export class Eased {
  private dx = 0
  private dy = 0

  /** The model changed its mind: for the same moment, it had `before` and now has `after`. */
  corrected(before: Point, after: Point): void {
    this.dx += before.x - after.x
    this.dy += before.y - after.y
    if (Math.hypot(this.dx, this.dy) > SNAP) this.reset()
  }

  /** Where to draw what the model has at `model`, `seconds` after the last frame. */
  at(model: Point, seconds: number): Point {
    const fade = Math.exp(-Math.max(0, seconds) / FADE)
    this.dx *= fade
    this.dy *= fade
    return { x: model.x + this.dx, y: model.y + this.dy }
  }

  /** Forgets the corrections, for a new game. */
  reset(): void {
    this.dx = 0
    this.dy = 0
  }
}
