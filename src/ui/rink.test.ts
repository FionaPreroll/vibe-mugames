import { describe, expect, it } from 'vitest'
import { HALF, LENGTH, WIDTH } from '../core/airhockey'
import { halfFrame, playerFrame } from './rink'

/** How the rink lies on a phone of 400 by 800 CSS pixels, for each player. */
const W = 400
const H = 800

describe('the rink on a player’s screen', () => {
  it('shows the whole rink from each player’s end, their own goal at the bottom', () => {
    for (const seat of [0, 1]) {
      const frame = playerFrame(seat, W, H)
      const ownGoal = frame.toScreen({ x: WIDTH / 2, y: seat === 0 ? 0 : LENGTH })
      const otherGoal = frame.toScreen({ x: WIDTH / 2, y: seat === 0 ? LENGTH : 0 })
      expect(ownGoal.y).toBeGreaterThan(otherGoal.y)
      expect(ownGoal.x).toBeCloseTo(W / 2)
      // The middle line across the middle of the rink drawn, which fits the screen.
      expect(frame.toScreen({ x: 0, y: HALF }).y).toBeCloseTo(H / 2)
      expect(frame.scale * LENGTH).toBeLessThanOrEqual(H + 1e-9)
      expect(frame.scale * WIDTH).toBeLessThanOrEqual(W + 1e-9)
      // A finger lands where it touches: from the screen to the rink and back.
      const touch = { x: 123, y: 456 }
      const back = frame.toScreen(frame.toRink(touch))
      expect(back.x).toBeCloseTo(touch.x)
      expect(back.y).toBeCloseTo(touch.y)
    }
  })

  it('shows only a player’s half, the middle line at the top edge, as before', () => {
    const frame = halfFrame(1, W, H, true)
    expect(frame.toScreen({ x: WIDTH / 2, y: HALF }).y).toBeCloseTo(0)
    expect(frame.toScreen({ x: WIDTH / 2, y: LENGTH }).y).toBeGreaterThan(0)
  })
})
