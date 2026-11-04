import { describe, expect, it } from 'vitest'
import { isThemeChoice, resolveTheme, SEASONAL_THEMES, seasonalTheme, THEMES } from './theme'

const on = (month: number, day: number) => new Date(2026, month - 1, day, 12)

describe('the themes', () => {
  it('knows its themes and the seasons, and nothing else', () => {
    for (const theme of THEMES) expect(isThemeChoice(theme)).toBe(true)
    expect(isThemeChoice('seasons')).toBe(true)
    expect(isThemeChoice('dark')).toBe(false)
    expect(isThemeChoice(undefined)).toBe(false)
    expect(new Set(THEMES).size).toBe(THEMES.length)
    for (const theme of SEASONAL_THEMES) expect(THEMES).toContain(theme)
  })

  it('follows the calendar with the seasons', () => {
    expect(seasonalTheme(on(9, 30))).toBe('classic')
    expect(seasonalTheme(on(10, 1))).toBe('halloween')
    expect(seasonalTheme(on(10, 31))).toBe('halloween')
    expect(seasonalTheme(on(11, 1))).toBe('halloween')
    expect(seasonalTheme(on(11, 2))).toBe('winter')
    expect(seasonalTheme(on(11, 30))).toBe('winter')
    expect(seasonalTheme(on(12, 1))).toBe('christmas')
    expect(seasonalTheme(on(12, 27))).toBe('christmas')
    expect(seasonalTheme(on(12, 28))).toBe('newyear')
    expect(seasonalTheme(on(12, 31))).toBe('newyear')
    expect(seasonalTheme(on(1, 6))).toBe('newyear')
    expect(seasonalTheme(on(1, 7))).toBe('winter')
    expect(seasonalTheme(on(1, 31))).toBe('winter')
    expect(seasonalTheme(on(2, 1))).toBe('classic')
    expect(seasonalTheme(on(7, 15))).toBe('classic')
  })

  it('takes a chosen theme as it is', () => {
    expect(resolveTheme('neon', on(10, 31))).toBe('neon')
    expect(resolveTheme('seasons', on(10, 31))).toBe('halloween')
  })
})
