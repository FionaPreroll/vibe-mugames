import { clampMallet, type Disc, glide, type HockeyView, slide } from '../core/airhockey'
import { Eased, HostClock, type HostClockOptions } from './clock'

/**
 * How a phone draws air hockey between the host's states, as pure TypeScript, so that the rink
 * on the screen (src/ui/rink.ts) and the benchmark (tools/smoothing.ts) run the same code.
 * Times are in seconds: the host's game time (`HockeyView.clock`) and this phone's own clock.
 */

/** The longest a phone draws the puck gliding on without word from the host. */
export const MAX_GLIDE = 0.15
/** How far back of the newest state a smoothed timeline may be drawn. */
export const MAX_BEHIND = 0.05

/**
 * Where the puck is drawn without smoothing: the newest state's, glided on from when it
 * arrived, `since` seconds ago, for a moment at most.
 */
export function arrivalPuck(rink: HockeyView, over: boolean, since: number): Disc {
  return rink.pause === 0 && !over ? glide(rink.puck, Math.min(MAX_GLIDE, since)) : rink.puck
}

/**
 * Drawing by the host's clock as a Kalman filter reads it (`HostClock`): the puck and a mallet
 * glide on from the newest state to the filtered host time, and what a new state changes of
 * what was drawn fades in (`Eased`).
 */
export class RinkSmoother {
  readonly clock: HostClock
  private readonly eased = [new Eased(), new Eased(), new Eased()]
  private view: HockeyView | null = null
  private over = false

  constructor(options: HostClockOptions = {}) {
    this.clock = new HostClock(options)
  }

  /** A state of the host's arrived at `local`; `over` once the game has ended. */
  observe(view: HockeyView, local: number, over: boolean): void {
    this.clock.observe(view.clock, local)
    const old = this.view
    if (old && view.clock >= old.clock) {
      // What the new state changes of what was drawn, at the same moment, fades in.
      const at = this.clock.now(local)
      this.eased[2]?.corrected(this.glided(old, at), this.glided(view, at))
      for (const seat of [0, 1]) {
        const was = old.mallets[seat]
        const is = view.mallets[seat]
        if (was && is)
          this.eased[seat]?.corrected(drift(was, at - old.clock), drift(is, at - view.clock))
      }
    }
    if (!old || view.clock >= old.clock) this.view = view
    this.over = over
  }

  /** Forgets the past, for a new game. */
  reset(): void {
    this.view = null
    for (const eased of this.eased) eased.reset()
  }

  /** The host time drawn at `local`: the filtered clock, within reach of the newest state. */
  time(local: number): number {
    const view = this.view
    const now = this.clock.now(local)
    return view ? Math.max(view.clock - MAX_BEHIND, Math.min(view.clock + MAX_GLIDE, now)) : now
  }

  /** Where to draw the puck at `local`, `seconds` after the last frame. */
  puck(local: number, seconds: number): Disc | null {
    const view = this.view
    if (!view) return null
    const glided = this.glided(view, this.time(local))
    return { ...glided, ...(this.eased[2]?.at(glided, seconds) ?? glided) }
  }

  /** Where to draw a mallet not steered on this phone, at `local`. */
  mallet(seat: number, local: number, seconds: number): Disc | null {
    const mallet = this.view?.mallets[seat]
    if (!this.view || !mallet) return null
    const glided = drift(mallet, this.time(local) - this.view.clock)
    const shown = this.eased[seat]?.at(glided, seconds) ?? glided
    return { ...mallet, ...clampMallet(seat, shown) }
  }

  private glided(view: HockeyView, at: number): Disc {
    return view.pause === 0 && !this.over ? glide(view.puck, clamp(at - view.clock)) : view.puck
  }
}

function clamp(seconds: number): number {
  return Math.max(-MAX_BEHIND, Math.min(MAX_GLIDE, seconds))
}

/** A mallet `seconds` on at its speed, as far as that goes. */
function drift(mallet: Disc, seconds: number): Disc {
  const s = clamp(seconds)
  return { ...mallet, x: mallet.x + mallet.vx * s, y: mallet.y + mallet.vy * s }
}

/**
 * A mallet steered on this phone, drawn where the host is going to move it: towards the finger
 * at once, by the host's own rule (`slide`: at most the host's speed, within the seat's half),
 * instead of where the host's last state had it. That state is a whole round trip old: the
 * finger's place goes to the host, waits for its next tick, and comes back with a state, which
 * over Bluetooth takes 100 to 250 ms. As the host slides its mallet towards the same places, a
 * moment later, both come to rest at the same point; only the puck's bounces off it are the
 * host's, and come that moment later.
 */
export class OwnMallet {
  private drawn: Disc | null = null

  constructor(private readonly seat: number) {}

  /**
   * Where to draw the mallet `seconds` after the last frame, with the finger at `aim` on the
   * rink; `host` is where the host's newest state has it, where drawing starts.
   */
  at(host: Disc, aim: { x: number; y: number }, seconds: number): Disc {
    this.drawn = slide(this.seat, this.drawn ?? host, aim, Math.max(0, seconds))
    return this.drawn
  }

  /** Starts again from the host's mallet, for a new game. */
  reset(): void {
    this.drawn = null
  }
}
