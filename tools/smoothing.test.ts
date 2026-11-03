import { readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { barChart, lineChart, type Series, type Slot } from './charts'
import { bench, METHODS, type Metrics, type Result, SCENARIOS, type Scenario } from './smoothing'

/**
 * Air hockey's smoothing, measured (see docs/NETWORKING.md): the numbers must stay within their
 * bounds, and the numbers and plots in docs/networking/ must be what the code gives now. After a
 * change to the filter, the drawing or the benchmark, `pnpm bench:smoothing` writes them anew;
 * the diff then shows what changed, for review.
 */

const UPDATE = Boolean(process.env.UPDATE_BENCHMARK)
const DOCS = new URL('../docs/networking/', import.meta.url)
const DOC = new URL('../docs/NETWORKING.md', import.meta.url)
/** Where docs/NETWORKING.md shows the numbers, between these two lines. */
const START = '<!-- smoothing:results -->'
const END = '<!-- /smoothing:results -->'

const SLOTS: Record<string, Slot> = { arrival: 1, kalman: 2, quick: 3, steady: 4 }

/** Every method in every scenario, run once for all the tests below. */
const results: Record<string, Record<string, Result>> = {}
for (const scenario of SCENARIOS) {
  const row: Record<string, Result> = {}
  for (const method of METHODS) row[method.id] = bench(scenario, method)
  results[scenario.id] = row
}

function result(scenario: string, method: string): Result {
  const found = results[scenario]?.[method]
  if (!found) throw new Error(`no result for ${scenario}, ${method}`)
  return found
}

function metrics(scenario: string, method: string): Metrics {
  return result(scenario, method).metrics
}

/** The frames from `from` to `to` seconds of a trace, as indexes. */
function window(scenario: string, from: number, to: number): number[] {
  const { host } = result(scenario, 'kalman').trace
  return host.flatMap((t, i) => (t >= from && t <= to ? [i] : []))
}

/** Where the plots of a scenario look: a stretch of play, and for the delay step, the step. */
function views(scenario: Scenario): { clock: [number, number]; puck: [number, number] } {
  if (scenario.step) return { clock: [scenario.step.at - 2, scenario.step.at + 8], puck: [8, 12] }
  return { clock: [6, 12], puck: [8, 12] }
}

function clockChart(scenario: Scenario): string {
  const [from, to] = views(scenario).clock
  const frames = window(scenario.id, from, to)
  const series: Series[] = METHODS.map((method) => {
    const { host, drawn } = result(scenario.id, method.id).trace
    return {
      name: method.name,
      slot: SLOTS[method.id] ?? 1,
      points: frames.map((i) => [host[i] ?? 0, ((host[i] ?? 0) - (drawn[i] ?? 0)) * 1000] as const),
    }
  })
  return lineChart({
    title: `${scenario.name}: how far behind the host the drawing is`,
    description: `The host's time drawn at each frame, as milliseconds behind the host's own time, from second ${from} to ${to}: without smoothing and with the Kalman filter at three settings.`,
    x: 'host time (s)',
    y: 'lag (ms)',
    series,
  })
}

/** The two methods the puck's plots compare: as states arrive, and the default filter. */
const COMPARED = METHODS.filter((method) => method.id === 'arrival' || method.id === 'kalman')

/**
 * How far ahead (+) or behind (−) along the rink each method draws the puck, against where the
 * host had it at that method's steady lag, in % of the rink's width; frames near goals are left
 * out, as there every drawing jumps.
 */
function puckChart(scenario: Scenario): string {
  const [from, to] = views(scenario).puck
  const frames = window(scenario.id, from, to)
  const series: Series[] = COMPARED.map((method) => {
    const { host, puck, truth, counted } = result(scenario.id, method.id).trace
    return {
      name: method.name,
      slot: SLOTS[method.id] ?? 1,
      points: frames
        .filter((i) => counted[i])
        .map((i) => [host[i] ?? 0, ((puck[i]?.y ?? 0) - (truth[i]?.y ?? 0)) * 100] as const),
    }
  })
  return lineChart({
    title: `${scenario.name}: the drawn puck against an even drawing`,
    description: `How far along the rink a phone draws the puck from where the host had it at the steady lag, from second ${from} to ${to}, without smoothing and with the default Kalman filter. Zero is a perfectly even drawing.`,
    x: 'host time (s)',
    y: 'puck ahead (+) or behind (−), % of rink width',
    series,
  })
}

/** The puck's place itself, over half a second of busy Wi-Fi, where the jumps are plain. */
function pathChart(): string {
  const scenario = 'busy'
  const frames = window(scenario, 8.1, 8.6)
  const reference = result(scenario, 'kalman').trace
  const series: Series[] = [
    {
      name: 'Host, at the steady lag',
      slot: 'reference',
      points: frames.map((i) => [reference.host[i] ?? 0, reference.truth[i]?.y ?? 0] as const),
    },
    ...COMPARED.map((method) => {
      const { host, puck } = result(scenario, method.id).trace
      return {
        name: method.name,
        slot: SLOTS[method.id] ?? 1,
        points: frames.map((i) => [host[i] ?? 0, puck[i]?.y ?? 0] as const),
      }
    }),
  ]
  return lineChart({
    title: 'Busy Wi-Fi: the puck along the rink, close up',
    description:
      'The puck’s place along the rink as a phone draws it, over half a second of busy Wi-Fi, without smoothing and with the default Kalman filter, against where the host had it at the steady lag.',
    x: 'host time (s)',
    y: 'puck along the rink (rink widths)',
    series,
  })
}

function summary(
  key: 'puckRms' | 'clockRoughness',
  title: string,
  y: string,
  description: string,
): string {
  return barChart({
    title,
    description,
    y,
    categories: SCENARIOS.map((s) => s.name),
    series: METHODS.map((method) => ({
      name: method.name,
      slot: SLOTS[method.id] ?? 1,
      values: SCENARIOS.map((s) => metrics(s.id, method.id)[key]),
    })),
  })
}

/** Every file in docs/networking/, as the code makes it now. */
function files(): Record<string, string> {
  const out: Record<string, string> = {}
  const table: Record<string, Record<string, Metrics>> = {}
  for (const scenario of SCENARIOS) {
    table[scenario.id] = Object.fromEntries(METHODS.map((m) => [m.id, metrics(scenario.id, m.id)]))
    out[`clock-${scenario.id}.svg`] = clockChart(scenario)
    out[`puck-${scenario.id}.svg`] = puckChart(scenario)
  }
  out['puck-path-busy.svg'] = pathChart()
  out['summary-clock.svg'] = summary(
    'clockRoughness',
    'How unevenly the host’s time is drawn',
    'roughness (ms RMS per frame)',
    'For each network and method: how far the drawn host time jumps from frame to frame beyond the frame’s own length, as RMS in milliseconds. Lower is smoother.',
  )
  out['summary-puck.svg'] = summary(
    'puckRms',
    'How far the drawn puck is from an even drawing',
    'puck error (% of rink width, RMS)',
    'For each network and method: how far the drawn puck is from where the host had it at the steady lag, as RMS in percent of the rink’s width. Lower is closer.',
  )
  out['smoothing.json'] = `${JSON.stringify(table, null, 2)}\n`
  return out
}

/** The numbers as a Markdown table, for docs/NETWORKING.md: the table view of the plots. */
function table(): string {
  const rows = SCENARIOS.flatMap((scenario) =>
    METHODS.map((method) => {
      const m = metrics(scenario.id, method.id)
      // Settling only means something after a lasting change of delay.
      const settle = scenario.step ? (m.settle === null ? 'never' : String(m.settle)) : '–'
      return [
        scenario.name,
        method.name,
        ...[m.clockRoughness, m.lagMean, m.lagSpread, m.puckRms, m.puck95].map((n) => n.toFixed(2)),
        settle,
      ]
    }),
  )
  const head = [
    'Network',
    'Method',
    'Clock roughness (ms)',
    'Lag (ms)',
    'Lag spread (ms)',
    'Puck error, RMS (%)',
    'Puck error, 95th (%)',
    'Settles (ms)',
  ]
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i]?.length ?? 0)))
  const line = (cells: readonly string[], numbers: boolean) =>
    `| ${cells.map((cell, i) => (numbers && i > 1 ? cell.padStart(widths[i] ?? 0) : cell.padEnd(widths[i] ?? 0))).join(' | ')} |`
  const rule = `| ${widths.map((w, i) => (i > 1 ? `${'-'.repeat(w - 1)}:` : '-'.repeat(w))).join(' | ')} |`
  return [line(head, false), rule, ...rows.map((row) => line(row, true))].join('\n')
}

/** docs/NETWORKING.md with the table of numbers as the code gives them now. */
function doc(text: string): string {
  const start = text.indexOf(START)
  const end = text.indexOf(END)
  if (start < 0 || end < start) throw new Error('docs/NETWORKING.md has lost its results markers')
  return `${text.slice(0, start + START.length)}\n\n${table()}\n\n${text.slice(end)}`
}

describe('air hockey’s smoothing, against the unfiltered drawing', () => {
  it('draws the host’s time far more evenly where the network shakes', () => {
    for (const scenario of ['busy', 'bluetooth', 'step']) {
      expect(metrics(scenario, 'kalman').clockRoughness).toBeLessThan(
        metrics(scenario, 'arrival').clockRoughness / 5,
      )
    }
    expect(metrics('quiet', 'kalman').clockRoughness).toBeLessThan(
      metrics('quiet', 'arrival').clockRoughness,
    )
    expect(metrics('busy', 'kalman').lagSpread).toBeLessThan(8)
  })

  it('draws the puck closer to an even drawing where the network shakes', () => {
    expect(metrics('busy', 'kalman').puckRms).toBeLessThan(metrics('busy', 'arrival').puckRms * 0.5)
    expect(metrics('bluetooth', 'kalman').puckRms).toBeLessThan(
      metrics('bluetooth', 'arrival').puckRms * 0.8,
    )
    expect(metrics('step', 'kalman').puckRms).toBeLessThan(metrics('step', 'arrival').puckRms * 0.8)
  })

  it('stays close on a quiet network, where there is little to smooth', () => {
    expect(metrics('quiet', 'kalman').puckRms).toBeLessThan(0.6)
    expect(metrics('busy', 'kalman').puckRms).toBeLessThan(1)
    expect(metrics('bluetooth', 'kalman').puckRms).toBeLessThan(1.2)
    expect(metrics('step', 'kalman').puckRms).toBeLessThan(1)
  })

  it('adds little delay of its own', () => {
    for (const scenario of SCENARIOS) {
      expect(metrics(scenario.id, 'kalman').lagMean).toBeLessThan(
        metrics(scenario.id, 'arrival').lagMean + 15,
      )
    }
  })

  it('follows a lasting change of delay within three seconds, as the slow setting does not', () => {
    const settle = metrics('step', 'kalman').settle
    expect(settle).not.toBeNull()
    expect(settle ?? Infinity).toBeLessThan(3000)
    // The quick setting follows sooner, the slow one too late: the default sits between.
    expect(metrics('step', 'quick').settle ?? Infinity).toBeLessThan(settle ?? 0)
    expect(metrics('step', 'steady').settle ?? Infinity).toBeGreaterThan(settle ?? 0)
  })
})

describe('the numbers and plots in docs/networking/', () => {
  it(UPDATE ? 'are written anew' : 'are what the code gives now (pnpm bench:smoothing)', () => {
    for (const [name, content] of Object.entries(files())) {
      const url = new URL(name, DOCS)
      if (UPDATE) writeFileSync(url, content)
      else expect(readFileSync(url, 'utf8'), name).toBe(content)
    }
    const text = readFileSync(DOC, 'utf8')
    if (UPDATE) writeFileSync(DOC, doc(text))
    else expect(text, 'docs/NETWORKING.md').toBe(doc(text))
  })
})
