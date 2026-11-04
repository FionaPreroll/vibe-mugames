/**
 * The days, weeks and months the Spielekiste marks with a sticker on the box on its start screen
 * (docs/STICKERS.md). Several can hold at once, each with its own sticker.
 */
export const STICKERS = [
  'tdov',
  'idahobit',
  'pride',
  'nonbinary',
  'bi',
  'comingout',
  'intersex',
  'ace',
  'transMonth',
  'transWeek',
  'tdor',
] as const
export type Sticker = (typeof STICKERS)[number]

/** The Sunday that starts Ace Week, the last full week of October (Sunday to Saturday). */
export function aceWeekStart(year: number): number {
  const lastSaturday = 31 - ((new Date(year, 9, 31).getDay() + 1) % 7)
  return lastSaturday - 6
}

/** The stickers for a day, in local time, in the order they stand on the box. */
export function stickersOn(now: Date): Sticker[] {
  const month = now.getMonth() + 1
  const day = now.getDate()
  const on = (m: number, d: number) => month === m && day === d
  const stickers: Sticker[] = []
  // Trans Day of Visibility.
  if (on(3, 31)) stickers.push('tdov')
  // The International Day Against Homophobia, Biphobia, Interphobia and Transphobia.
  if (on(5, 17)) stickers.push('idahobit')
  // Pride Month: all of June.
  if (month === 6) stickers.push('pride')
  // International Non-Binary People's Day.
  if (on(7, 14)) stickers.push('nonbinary')
  // Bi Visibility Day.
  if (on(9, 23)) stickers.push('bi')
  // Coming Out Day.
  if (on(10, 11)) stickers.push('comingout')
  // Intersex Awareness Day.
  if (on(10, 26)) stickers.push('intersex')
  // Ace Week: the last full week of October.
  const ace = aceWeekStart(now.getFullYear())
  if (month === 10 && day >= ace && day <= ace + 6) stickers.push('ace')
  if (month === 11) {
    // Trans Awareness Month: all of November.
    stickers.push('transMonth')
    // Trans Awareness Week: 13 to 19 November, the week before the Day of Remembrance.
    if (day >= 13 && day <= 19) stickers.push('transWeek')
    // Transgender Day of Remembrance: 20 November.
    if (day === 20) stickers.push('tdor')
  }
  return stickers
}
