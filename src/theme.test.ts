import { describe, expect, it } from 'vitest'
import {
  CHINESE_NEW_YEAR,
  DEFAULT_THEME,
  easterSunday,
  isThemeChoice,
  resolveTheme,
  SEASONAL_THEMES,
  seasonalTheme,
  THEMES,
} from './theme'

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
    expect(seasonalTheme(on(2, 10))).toBe('winter')
    expect(seasonalTheme(on(3, 10))).toBe('spring')
    expect(seasonalTheme(on(5, 31))).toBe('spring')
    expect(seasonalTheme(on(6, 1))).toBe('summer')
    expect(seasonalTheme(on(8, 31))).toBe('summer')
    expect(seasonalTheme(on(9, 1))).toBe('classic')
  })

  it('keeps Chinese New Year from its eve to the Lantern Festival', () => {
    // In 2026 it falls on 17 February, in 2027 on 6 February.
    expect(seasonalTheme(on(2, 15))).toBe('winter')
    expect(seasonalTheme(on(2, 16))).toBe('chinesenewyear')
    expect(seasonalTheme(on(3, 3))).toBe('chinesenewyear')
    expect(seasonalTheme(on(3, 4))).toBe('spring')
    expect(seasonalTheme(new Date(2027, 1, 5, 12))).toBe('chinesenewyear')
    expect(seasonalTheme(new Date(2027, 1, 4, 12))).toBe('winter')
    // A year beyond the table has none.
    expect(seasonalTheme(new Date(2099, 1, 10, 12))).toBe('winter')
  })

  it('keeps Easter from Palm Sunday to Easter Monday', () => {
    expect(easterSunday(2024)).toEqual([3, 31])
    expect(easterSunday(2025)).toEqual([4, 20])
    expect(easterSunday(2026)).toEqual([4, 5])
    expect(easterSunday(2027)).toEqual([3, 28])
    expect(easterSunday(2038)).toEqual([4, 25])
    expect(seasonalTheme(on(3, 28))).toBe('spring')
    expect(seasonalTheme(on(3, 29))).toBe('easter')
    expect(seasonalTheme(on(4, 6))).toBe('easter')
    expect(seasonalTheme(on(4, 7))).toBe('spring')
  })

  it('chooses with the seasons until told otherwise', () => {
    expect(DEFAULT_THEME).toBe('seasons')
    for (const year of Object.keys(CHINESE_NEW_YEAR).map(Number)) {
      const [month, day] = CHINESE_NEW_YEAR[year] ?? [0, 0]
      expect(month === 1 ? day >= 21 : month === 2 && day <= 20).toBe(true)
    }
  })

  it('takes a chosen theme as it is', () => {
    expect(resolveTheme('neon', on(10, 31))).toBe('neon')
    expect(resolveTheme('seasons', on(10, 31))).toBe('halloween')
  })
})
