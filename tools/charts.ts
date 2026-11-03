/**
 * Small SVG charts for the docs (docs/networking/): lines over time and grouped bars, drawn as
 * plain text, so that a test can make them anew and see that the files in the repository are
 * up to date. Colours follow the series, never their rank; text keeps the text colours, and a
 * legend names every series. Dark mode has its own steps of the same hues.
 */

/** A series' colour slot: 1 to 4 of the palette, or the neutral grey of a reference. */
export type Slot = 1 | 2 | 3 | 4 | 'reference'

export interface Series {
  readonly name: string
  readonly slot: Slot
  readonly points: readonly (readonly [number, number])[]
}

const WIDTH = 760
const HEIGHT = 360
const PAD = { top: 76, right: 150, bottom: 48, left: 64 }
const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'

const STYLE = `
  .surface { fill: #fcfcfb }
  .title { fill: #0b0b0b; font: 600 15px ${FONT} }
  .text { fill: #52514e; font: 12px ${FONT} }
  .label { fill: #0b0b0b; font: 12px ${FONT} }
  .grid { stroke: #e7e6e2; stroke-width: 1 }
  .axis { stroke: #b9b8b2; stroke-width: 1 }
  .s1 { stroke: #2a78d6; fill: #2a78d6 }
  .s2 { stroke: #eb6834; fill: #eb6834 }
  .s3 { stroke: #1baf7a; fill: #1baf7a }
  .s4 { stroke: #eda100; fill: #eda100 }
  .sreference { stroke: #8a8984; fill: #8a8984 }
  @media (prefers-color-scheme: dark) {
    .surface { fill: #1a1a19 }
    .title, .label { fill: #f0efec }
    .text { fill: #c3c2b7 }
    .grid { stroke: #2f2e2b }
    .axis { stroke: #57564f }
    .s1 { stroke: #3987e5; fill: #3987e5 }
    .s2 { stroke: #d95926; fill: #d95926 }
    .s3 { stroke: #199e70; fill: #199e70 }
    .s4 { stroke: #c98500; fill: #c98500 }
    .sreference { stroke: #8f8e88; fill: #8f8e88 }
  }
  /* After the colours, so that a line's colour never fills it. */
  .line { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round }`

/** Round ticks across a range: about `count` of them, at 1, 2 or 5 times a power of ten. */
export function ticks(min: number, max: number, count = 5): number[] {
  const span = max - min || 1
  const raw = span / count
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((f) => f * power).find((s) => s >= raw) ?? raw
  const first = Math.ceil(min / step - 1e-9) * step
  const out: number[] = []
  for (let v = first; v <= max + step * 1e-9; v += step) out.push(Number(v.toFixed(10)))
  return out
}

function fmt(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(Math.abs(value) < 1 ? 2 : 1)
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function frame(title: string, description: string, body: string[]): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-labelledby="t d">`,
    `<title id="t">${escapeXml(title)}</title>`,
    `<desc id="d">${escapeXml(description)}</desc>`,
    `<style>${STYLE}\n</style>`,
    `<rect class="surface" width="${WIDTH}" height="${HEIGHT}" rx="8"/>`,
    `<text class="title" x="${PAD.left}" y="26">${escapeXml(title)}</text>`,
    ...body,
    '</svg>',
    '',
  ].join('\n')
}

/** A row of legend entries under the title: a swatch, then the name. */
function legend(series: readonly { name: string; slot: Slot }[], line: boolean): string[] {
  const out: string[] = []
  let x = PAD.left
  for (const s of series) {
    out.push(
      line
        ? `<line class="line s${s.slot}" x1="${x}" y1="48" x2="${x + 16}" y2="48"/>`
        : `<rect class="s${s.slot}" x="${x}" y="42" width="12" height="12" rx="2"/>`,
      `<text class="text" x="${x + 22}" y="52">${escapeXml(s.name)}</text>`,
    )
    x += 30 + s.name.length * 6.6
  }
  return out
}

/** Lines over a shared x: each series a 2 px line, its name at its end, kept apart. */
export function lineChart(options: {
  title: string
  description: string
  x: string
  y: string
  series: readonly Series[]
}): string {
  const all = options.series.flatMap((s) => s.points)
  const xs = all.map(([x]) => x)
  const ys = all.map(([, y]) => y)
  const xTicks = ticks(Math.min(...xs), Math.max(...xs), 6)
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  // The y axis reaches out to the next tick on either side, so that every line lies on the grid.
  const rough = ticks(Math.min(...ys), Math.max(...ys), 5)
  const step = (rough[1] ?? 1) - (rough[0] ?? 0) || 1
  const y0 = Math.floor(Math.min(...ys) / step + 1e-9) * step
  const y1 = Math.ceil(Math.max(...ys) / step - 1e-9) * step
  const yTicks = ticks(y0, y1, Math.round((y1 - y0) / step))
  const plotW = WIDTH - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const sx = (v: number) => PAD.left + ((v - x0) / (x1 - x0 || 1)) * plotW
  const sy = (v: number) => PAD.top + plotH - ((v - y0) / (y1 - y0 || 1)) * plotH
  const body: string[] = []
  for (const t of yTicks) {
    body.push(
      `<line class="grid" x1="${PAD.left}" y1="${sy(t).toFixed(1)}" x2="${PAD.left + plotW}" y2="${sy(t).toFixed(1)}"/>`,
      `<text class="text" x="${PAD.left - 8}" y="${(sy(t) + 4).toFixed(1)}" text-anchor="end">${fmt(t)}</text>`,
    )
  }
  for (const t of xTicks) {
    body.push(
      `<text class="text" x="${sx(t).toFixed(1)}" y="${PAD.top + plotH + 18}" text-anchor="middle">${fmt(t)}</text>`,
    )
  }
  body.push(
    `<line class="axis" x1="${PAD.left}" y1="${PAD.top + plotH}" x2="${PAD.left + plotW}" y2="${PAD.top + plotH}"/>`,
    `<text class="text" x="${PAD.left + plotW / 2}" y="${HEIGHT - 10}" text-anchor="middle">${escapeXml(options.x)}</text>`,
    `<text class="text" transform="translate(16 ${PAD.top + plotH / 2}) rotate(-90)" text-anchor="middle">${escapeXml(options.y)}</text>`,
  )
  for (const s of options.series) {
    const points = s.points.map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(' ')
    body.push(`<polyline class="line s${s.slot}" points="${points}"/>`)
  }
  // Each line's name at its end, nudged apart so that none sits on another.
  const ends = options.series
    .map((s) => ({ s, y: sy(s.points.at(-1)?.[1] ?? 0) }))
    .sort((a, b) => a.y - b.y)
  for (let i = 1; i < ends.length; i++) {
    const before = ends[i - 1]
    const end = ends[i]
    if (before && end && end.y - before.y < 15) end.y = before.y + 15
  }
  for (const { s, y } of ends) {
    body.push(
      `<text class="label" x="${PAD.left + plotW + 8}" y="${(y + 4).toFixed(1)}">${escapeXml(short(s.name))}</text>`,
    )
  }
  return frame(options.title, options.description, [...legend(options.series, true), ...body])
}

/** Columns in groups: a group for each category, a column for each series, from 0. */
export function barChart(options: {
  title: string
  description: string
  y: string
  categories: readonly string[]
  series: readonly { name: string; slot: Slot; values: readonly number[] }[]
}): string {
  const max = Math.max(...options.series.flatMap((s) => s.values))
  const yTicks = ticks(0, max, 5)
  const top = Math.max(yTicks.at(-1) ?? 1, max)
  const plotW = WIDTH - PAD.left - 40
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const sy = (v: number) => PAD.top + plotH - (v / top) * plotH
  const body: string[] = []
  for (const t of yTicks) {
    body.push(
      `<line class="grid" x1="${PAD.left}" y1="${sy(t).toFixed(1)}" x2="${PAD.left + plotW}" y2="${sy(t).toFixed(1)}"/>`,
      `<text class="text" x="${PAD.left - 8}" y="${(sy(t) + 4).toFixed(1)}" text-anchor="end">${fmt(t)}</text>`,
    )
  }
  const band = plotW / options.categories.length
  const bar = Math.min(24, (band * 0.7) / options.series.length - 2)
  const group = options.series.length * (bar + 2) - 2
  options.categories.forEach((category, c) => {
    const left = PAD.left + c * band + (band - group) / 2
    options.series.forEach((s, i) => {
      const value = s.values[c] ?? 0
      const x = left + i * (bar + 2)
      const y = sy(value)
      const h = PAD.top + plotH - y
      const r = Math.min(4, h)
      // Rounded at the value, square at the baseline.
      body.push(
        `<path class="s${s.slot}" d="M${x.toFixed(1)},${(y + h).toFixed(1)} V${(y + r).toFixed(1)} Q${x.toFixed(1)},${y.toFixed(1)} ${(x + r).toFixed(1)},${y.toFixed(1)} H${(x + bar - r).toFixed(1)} Q${(x + bar).toFixed(1)},${y.toFixed(1)} ${(x + bar).toFixed(1)},${(y + r).toFixed(1)} V${(y + h).toFixed(1)} Z"><title>${escapeXml(`${category}, ${s.name}: ${fmt(value)}`)}</title></path>`,
      )
    })
    body.push(
      `<text class="text" x="${(PAD.left + c * band + band / 2).toFixed(1)}" y="${PAD.top + plotH + 18}" text-anchor="middle">${escapeXml(category)}</text>`,
    )
  })
  body.push(
    `<line class="axis" x1="${PAD.left}" y1="${PAD.top + plotH}" x2="${PAD.left + plotW}" y2="${PAD.top + plotH}"/>`,
    `<text class="text" transform="translate(16 ${PAD.top + plotH / 2}) rotate(-90)" text-anchor="middle">${escapeXml(options.y)}</text>`,
  )
  return frame(options.title, options.description, [...legend(options.series, false), ...body])
}

/** A series' name, short enough for the end of its line. */
function short(name: string): string {
  return name.replace('Kalman (default, q = 10⁻⁴)', 'Kalman, default').replace('Kalman, ', '')
}
