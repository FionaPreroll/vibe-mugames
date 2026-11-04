import { describe, expect, it } from 'vitest'
import { aceWeekStart, STICKERS, stickersOn } from './awareness'

const on = (month: number, day: number) => new Date(2026, month - 1, day, 12)

describe('the days the box wears a sticker', () => {
  it('are Pride Month, all of June', () => {
    expect(stickersOn(on(5, 31))).toEqual([])
    expect(stickersOn(on(6, 1))).toEqual(['pride'])
    expect(stickersOn(on(6, 30))).toEqual(['pride'])
    expect(stickersOn(on(7, 1))).toEqual([])
  })

  it('are Trans Awareness Month, its week and the Day of Remembrance in November', () => {
    expect(stickersOn(new Date(2025, 9, 31))).toEqual([])
    expect(stickersOn(on(11, 1))).toEqual(['transMonth'])
    expect(stickersOn(on(11, 12))).toEqual(['transMonth'])
    expect(stickersOn(on(11, 13))).toEqual(['transMonth', 'transWeek'])
    expect(stickersOn(on(11, 19))).toEqual(['transMonth', 'transWeek'])
    expect(stickersOn(on(11, 20))).toEqual(['transMonth', 'tdor'])
    expect(stickersOn(on(11, 21))).toEqual(['transMonth'])
    expect(stickersOn(on(12, 1))).toEqual([])
  })

  it('mark the queer and trans days of the year', () => {
    expect(stickersOn(on(3, 31))).toEqual(['tdov'])
    expect(stickersOn(on(5, 17))).toEqual(['idahobit'])
    expect(stickersOn(on(7, 14))).toEqual(['nonbinary'])
    expect(stickersOn(on(9, 23))).toEqual(['bi'])
    expect(stickersOn(on(10, 11))).toEqual(['comingout'])
    for (const [month, day] of [
      [3, 30],
      [5, 16],
      [7, 15],
      [9, 22],
      [10, 12],
    ] as const) {
      expect(stickersOn(on(month, day))).toEqual([])
    }
  })

  it('keep Ace Week to the last full week of October, beside Intersex Awareness Day', () => {
    expect(aceWeekStart(2024)).toBe(20)
    expect(aceWeekStart(2025)).toBe(19)
    expect(aceWeekStart(2026)).toBe(25)
    expect(stickersOn(on(10, 24))).toEqual([])
    expect(stickersOn(on(10, 25))).toEqual(['ace'])
    expect(stickersOn(on(10, 31))).toEqual(['ace'])
    expect(stickersOn(new Date(2025, 9, 26))).toEqual(['intersex'])
    expect(stickersOn(new Date(2024, 9, 26))).toEqual(['intersex', 'ace'])
  })

  it('never puts more stickers on the box than it has room for', () => {
    const start = new Date(2026, 0, 1)
    for (let day = 0; day < 366; day++) {
      const date = new Date(start.getFullYear(), 0, 1 + day)
      expect(stickersOn(date).length).toBeLessThanOrEqual(4)
      for (const sticker of stickersOn(date)) expect(STICKERS).toContain(sticker)
    }
  })
})
