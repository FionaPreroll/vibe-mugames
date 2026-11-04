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
  'nord',
  'gruvbox',
  'neon',
  'contrast',
  'nightred',
  'halloween',
  'winter',
  'christmas',
  'newyear',
] as const
export type Theme = (typeof THEMES)[number]

/** The looks for a time of the year, which `seasons` follows. */
export const SEASONAL_THEMES: readonly Theme[] = ['halloween', 'winter', 'christmas', 'newyear']

/** What the player picks: a look, or 'seasons' for the one the calendar suggests. */
export type ThemeChoice = Theme | 'seasons'
export const THEME_CHOICES: readonly ThemeChoice[] = [...THEMES, 'seasons']

export const isThemeChoice = (value: unknown): value is ThemeChoice =>
  THEME_CHOICES.includes(value as ThemeChoice)

/** Themes whose page is light, for the browser's own controls and bars. */
export const LIGHT_THEMES: readonly Theme[] = ['light']

/**
 * The look the calendar suggests, in local time: Halloween from 1 October to 1 November, winter
 * for the rest of November, Christmas from 1 to 27 December, New Year from 28 December to
 * 6 January, and winter again to the end of January. Otherwise the classic look.
 */
export function seasonalTheme(now: Date): Theme {
  const month = now.getMonth()
  const day = now.getDate()
  if (month === 9 || (month === 10 && day === 1)) return 'halloween'
  if (month === 11 && day <= 27) return 'christmas'
  if ((month === 11 && day >= 28) || (month === 0 && day <= 6)) return 'newyear'
  if (month === 10 || month === 0) return 'winter'
  return 'classic'
}

export const resolveTheme = (choice: ThemeChoice, now: Date): Theme =>
  choice === 'seasons' ? seasonalTheme(now) : choice
