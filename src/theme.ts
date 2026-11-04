/**
 * The Spielekiste's looks: the classic one, others for every taste, and seasonal ones. The colours
 * of each are in src/style.css (classic) and src/themes.css (the others); src/ui/theme.ts applies
 * them.
 */
export const THEMES = [
  'classic',
  'light',
  'black',
  'amoled',
  'wood',
  'felt',
  'forest',
  'nord',
  'gruvbox',
  'neon',
  'contrast',
  'nightred',
  'chinesenewyear',
  'spring',
  'easter',
  'summer',
  'halloween',
  'winter',
  'christmas',
  'newyear',
] as const
export type Theme = (typeof THEMES)[number]

/** The looks for a time of the year, which `seasons` follows. */
export const SEASONAL_THEMES: readonly Theme[] = [
  'chinesenewyear',
  'spring',
  'easter',
  'summer',
  'halloween',
  'winter',
  'christmas',
  'newyear',
]

/** What the player picks: a look, or 'seasons' for the one the calendar suggests. */
export type ThemeChoice = Theme | 'seasons'
export const THEME_CHOICES: readonly ThemeChoice[] = ['seasons', ...THEMES]

/** The theme of a device that never chose one. */
export const DEFAULT_THEME: ThemeChoice = 'seasons'

export const isThemeChoice = (value: unknown): value is ThemeChoice =>
  THEME_CHOICES.includes(value as ThemeChoice)

/** Themes whose page is light, for the browser's own controls and bars. */
export const LIGHT_THEMES: readonly Theme[] = ['light', 'spring', 'easter', 'summer']

/**
 * Chinese New Year, the first day of the lunar year, as [month, day] by year. It follows the moon,
 * so it is looked up, not worked out; a year beyond the table has none.
 */
export const CHINESE_NEW_YEAR: Readonly<Record<number, readonly [number, number]>> = {
  2024: [2, 10],
  2025: [1, 29],
  2026: [2, 17],
  2027: [2, 6],
  2028: [1, 26],
  2029: [2, 13],
  2030: [2, 3],
  2031: [1, 23],
  2032: [2, 11],
  2033: [1, 31],
  2034: [2, 19],
  2035: [2, 8],
  2036: [1, 28],
  2037: [2, 15],
  2038: [2, 4],
  2039: [1, 24],
  2040: [2, 12],
}

/** Easter Sunday of a year, as [month, day], by the Gregorian calendar (Meeus, Jones, Butcher). */
export function easterSunday(year: number): readonly [number, number] {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return [month, day]
}

/** Days from `day` (month 1 to 12) to the date, negative before it, by the calendar alone. */
function daysSince(now: Date, [month, day]: readonly [number, number]): number {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((today - Date.UTC(now.getFullYear(), month - 1, day)) / 86_400_000)
}

/**
 * The look the calendar suggests, in local time: Chinese New Year from its eve to the Lantern
 * Festival, a fortnight later; Easter from Palm Sunday to Easter Monday; Halloween from 1 October
 * to 1 November; Christmas from 1 to 27 December; New Year from 28 December to 6 January. Between
 * them, the seasons: winter from November to February, spring from March to May, summer from June
 * to August, and the classic look in September.
 */
export function seasonalTheme(now: Date): Theme {
  const month = now.getMonth() + 1
  const day = now.getDate()
  if (month === 10 || (month === 11 && day === 1)) return 'halloween'
  if (month === 12 && day <= 27) return 'christmas'
  if ((month === 12 && day >= 28) || (month === 1 && day <= 6)) return 'newyear'
  const lunar = CHINESE_NEW_YEAR[now.getFullYear()]
  if (lunar) {
    const since = daysSince(now, lunar)
    if (since >= -1 && since <= 14) return 'chinesenewyear'
  }
  const easter = daysSince(now, easterSunday(now.getFullYear()))
  if (easter >= -7 && easter <= 1) return 'easter'
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month === 9) return 'classic'
  return 'winter'
}

export const resolveTheme = (choice: ThemeChoice, now: Date): Theme =>
  choice === 'seasons' ? seasonalTheme(now) : choice
