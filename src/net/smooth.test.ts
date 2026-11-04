import { describe, expect, it } from 'vitest'
import { type Disc, HALF, MALLET, MALLET_SPEED, slide } from '../core/airhockey'
import { OwnMallet } from './smooth'

const FRAME = 1 / 60
const still = (x: number, y: number): Disc => ({ x, y, vx: 0, vy: 0 })

describe('a mallet steered on this phone', () => {
  it('moves to the finger at once, while the host’s state still has it where it was', () => {
    const own = new OwnMallet(0)
    const host = still(0.5, 0.3)
    const finger = { x: 0.2, y: 0.6 }
    let drawn = host
    for (let frame = 0; frame < 6; frame++) drawn = own.at(host, finger, FRAME)
    // 0.42 rink widths at the host's speed take 70 ms: within six frames, it is there.
    expect(Math.hypot(0.3, 0.3) / MALLET_SPEED).toBeLessThan(6 * FRAME)
    expect(drawn.x).toBeCloseTo(finger.x)
    expect(drawn.y).toBeCloseTo(finger.y)
  })

  it('moves no faster than the host moves it, and stays in its own half', () => {
    const own = new OwnMallet(0)
    const first = own.at(still(0.5, 0.3), { x: 0.5, y: 2.5 }, FRAME)
    expect(first.y - 0.3).toBeCloseTo(MALLET_SPEED * FRAME)
    let drawn = first
    for (let frame = 0; frame < 60; frame++)
      drawn = own.at(still(0.5, 0.3), { x: 0.5, y: 2.5 }, FRAME)
    expect(drawn.y).toBeCloseTo(HALF - MALLET)
    // The other seat's mallet stays in the other half.
    const other = new OwnMallet(1)
    const theirs = other.at(still(0.5, 2.7), { x: 0.5, y: 0 }, 1)
    expect(theirs.y).toBeCloseTo(HALF + MALLET)
  })

  it('comes to rest where the host’s mallet does, a round trip later', () => {
    // The finger runs to and fro, then rests; the host hears of each place 150 ms later, and
    // its state comes back after as long again.
    const finger = (t: number) =>
      t < 1
        ? { x: 0.5 + 0.3 * Math.sin(6 * t), y: 0.5 + 0.2 * Math.cos(5 * t) }
        : { x: 0.7, y: 0.4 }
    const delay = 0.15
    const own = new OwnMallet(0)
    let host = still(0.5, 0.3)
    const states: { at: number; mallet: Disc }[] = []
    let drawn = host
    let ahead = 0
    let frames = 0
    for (let t = 0; t < 2; t += FRAME) {
      host = slide(0, host, finger(Math.max(0, t - delay)), FRAME)
      states.push({ at: t + delay, mallet: host })
      const seen = states.filter((s) => s.at <= t).at(-1)?.mallet ?? still(0.5, 0.3)
      drawn = own.at(seen, finger(t), FRAME)
      if (t > 0.3 && t < 1) {
        // How much closer to the finger it is drawn than the host's newest state.
        const target = finger(t)
        ahead +=
          Math.hypot(seen.x - target.x, seen.y - target.y) -
          Math.hypot(drawn.x - target.x, drawn.y - target.y)
        frames++
      }
    }
    expect(ahead / frames).toBeGreaterThan(0.05)
    const seen = states.at(-1)?.mallet ?? host
    expect(drawn.x).toBeCloseTo(seen.x)
    expect(drawn.y).toBeCloseTo(seen.y)
  })

  it('starts again from the host’s mallet for a new game', () => {
    const own = new OwnMallet(0)
    own.at(still(0.5, 0.3), { x: 0.2, y: 0.2 }, 1)
    own.reset()
    expect(own.at(still(0.8, 0.5), { x: 0.8, y: 0.5 }, FRAME)).toMatchObject({ x: 0.8, y: 0.5 })
  })
})
