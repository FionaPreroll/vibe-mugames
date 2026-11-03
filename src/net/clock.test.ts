import { describe, expect, it } from 'vitest'
import { Eased, HostClock } from './clock'

/**
 * The filter against a made-up connection: the host stamps a state 30 times a second, and each
 * arrives after a delay with jitter and now and then a spike, on a phone whose clock is far off
 * the host's. Random numbers come from a fixed seed, so a run comes back the same.
 */

function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 2 ** 32
  }
}

interface Run {
  /** The host time drawn at each frame, by the filter and by the time a state arrived. */
  readonly filtered: number[]
  readonly arrival: number[]
  readonly frames: number[]
  readonly clock: HostClock
}

/** `seconds` of play, a frame every 1/60 s, with the delay `delay(t)` plus jitter of `jitter`. */
function play(seconds: number, delay: (t: number) => number, jitter: number, seed = 1): Run {
  const random = seeded(seed)
  const skew = 1000 // the phone's clock against the host's
  const states: { host: number; arrives: number }[] = []
  for (let host = 0; host < seconds; host += 1 / 30) {
    const spike = random() < 0.05 ? 0.12 : 0
    states.push({ host, arrives: host + skew + delay(host) + random() * jitter + spike })
  }
  states.sort((a, b) => a.arrives - b.arrives)
  const clock = new HostClock()
  const run: Run = { filtered: [], arrival: [], frames: [], clock }
  let next = 0
  let newest: { host: number; arrives: number } | null = null
  for (let frame = skew + 0.2; frame < skew + seconds; frame += 1 / 60) {
    for (; next < states.length && (states[next]?.arrives ?? Infinity) <= frame; next++) {
      const state = states[next]
      if (!state) continue
      clock.observe(state.host, state.arrives)
      if (!newest || state.host > newest.host) newest = state
    }
    if (!newest) continue
    run.frames.push(frame)
    run.filtered.push(clock.now(frame))
    // As phones draw without the filter: the newest state, glided on from when it arrived.
    run.arrival.push(newest.host + (frame - newest.arrives))
  }
  return run
}

/** How far the drawn time jumps from frame to frame beyond the frame's own length, as RMS. */
function roughness(times: number[], frames: number[], from: number): number {
  let sum = 0
  let count = 0
  for (let i = from + 1; i < times.length; i++) {
    const step = (times[i] ?? 0) - (times[i - 1] ?? 0) - ((frames[i] ?? 0) - (frames[i - 1] ?? 0))
    sum += step * step
    count++
  }
  return Math.sqrt(sum / count)
}

describe('the host’s clock, filtered', () => {
  it('runs far steadier than the arrival of each state', () => {
    const run = play(20, () => 0.04, 0.06)
    const warm = 120 // two seconds to learn the jitter
    const filtered = roughness(run.filtered, run.frames, warm)
    const arrival = roughness(run.arrival, run.frames, warm)
    expect(filtered).toBeLessThan(arrival / 5)
    // It learned a jitter of the right size: uniform over 60 ms, with spikes.
    expect(run.clock.jitter()).toBeGreaterThan(0.01)
    expect(run.clock.jitter()).toBeLessThan(0.06)
  })

  it('stays close to the newest state, so the puck glides on only a little', () => {
    const run = play(20, () => 0.04, 0.06)
    const ahead = run.filtered.map((time, i) => time - (run.arrival[i] ?? 0))
    const mean = ahead.slice(120).reduce((sum, a) => sum + a, 0) / (ahead.length - 120)
    expect(Math.abs(mean)).toBeLessThan(0.05)
  })

  it('follows a lasting change of delay within two seconds', () => {
    // The delay grows by 100 ms at second 10, as when a phone walks away from the hotspot.
    const run = play(16, (t) => (t < 10 ? 0.03 : 0.13), 0.03)
    const at = (local: number) => run.frames.findIndex((frame) => frame >= local)
    const before = run.filtered[at(1009.9)] ?? 0
    const after = run.filtered[at(1012.5)] ?? 0
    // Over 2.6 s of this phone's time, the host's time drawn moved 2.6 s less the 100 ms.
    expect(after - before).toBeGreaterThan(2.6 - 0.1 - 0.03)
    expect(after - before).toBeLessThan(2.6 - 0.1 + 0.03)
  })

  it('starts anew for a new game, and ignores a state overtaken on the way', () => {
    const clock = new HostClock()
    expect(clock.started()).toBe(false)
    clock.observe(5, 100)
    expect(clock.now(100)).toBeCloseTo(5)
    clock.observe(4.9, 100.2)
    expect(clock.now(100.2)).toBeCloseTo(5.2)
    // The next game's clock starts at 0.
    clock.observe(0.1, 101)
    expect(clock.now(101)).toBeCloseTo(0.1)
    // A page that was in the background: the host's time jumped on.
    clock.observe(10, 101.1)
    expect(clock.now(101.1)).toBeCloseTo(10)
    clock.observe(Number.NaN, 102)
    expect(clock.now(101.1)).toBeCloseTo(10)
  })
})

describe('a correction, eased', () => {
  it('fades in a small correction, and follows the model exactly otherwise', () => {
    const eased = new Eased()
    expect(eased.at({ x: 1, y: 1 }, 0.016)).toEqual({ x: 1, y: 1 })
    // A new state puts the puck 0.1 further: drawn where it was, then closing in.
    eased.corrected({ x: 1, y: 1 }, { x: 1.1, y: 1 })
    expect(eased.at({ x: 1.1, y: 1 }, 0).x).toBeCloseTo(1)
    expect(eased.at({ x: 1.1, y: 1 }, 0.08).x).toBeCloseTo(1.1 - 0.1 / Math.E)
    expect(eased.at({ x: 1.1, y: 1 }, 0.5).x).toBeCloseTo(1.1, 3)
    // Once the correction faded, a puck gliding on is drawn right where it glides.
    const glided = eased.at({ x: 1.5, y: 0.5 }, 0.016)
    expect(glided.x).toBeCloseTo(1.5, 3)
    expect(glided.y).toBe(0.5)
  })

  it('draws a large jump at once', () => {
    const eased = new Eased()
    eased.corrected({ x: 0.5, y: 2.9 }, { x: 0.5, y: 0.75 })
    expect(eased.at({ x: 0.5, y: 0.75 }, 0)).toEqual({ x: 0.5, y: 0.75 })
  })
})
