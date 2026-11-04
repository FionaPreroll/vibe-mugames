import { type Card, rankOf, suitOf } from '../../core/miaumiau'
import { colour } from '../canvas'
import { rankMark, specialMark, suitSymbol } from '../cards'

/**
 * Small drawings for the rules and the game chooser, as inline SVG: boards, pieces, cards and
 * arrows. Coordinates are in cells: a square board of n cells is n wide, each cell 1 by 1, and
 * `cx(column)` is the middle of a column. Drawings only show; the text beside them explains.
 */

const NS = 'http://www.w3.org/2000/svg'

export type Attributes = Record<string, string | number>
type Child = SVGElement | null | undefined | false

/** The colours of the drawings, as on the boards: the current theme's tokens (src/style.css). */
export const INK = {
  text: 'var(--text)',
  muted: 'var(--muted)',
  panel: 'var(--panel)',
  bg: 'var(--bg)',
  line: 'var(--line)',
  accent: 'var(--accent)',
  wood: 'var(--wood)',
  woodDark: 'var(--board-line)',
  lightSquare: 'var(--board-light)',
  darkSquare: 'var(--board-dark)',
  frame: 'var(--frame)',
  sea: 'var(--sea)',
  seaDeep: 'var(--sea-deep)',
  water: 'var(--water)',
  waterText: 'var(--water-text)',
  ship: 'var(--ship)',
  sunk: 'var(--sunk)',
  paper: 'var(--paper)',
  paperEdge: 'var(--paper-edge)',
  red: 'var(--card-red)',
  cardBlue: 'var(--card-blue)',
  cardEdge: 'var(--card-edge)',
  black: 'var(--ink)',
  felt: 'var(--felt)',
  feltDeep: 'var(--felt-deep)',
  dotsPaper: 'var(--dots-paper)',
  dot: 'var(--dot)',
  ludo: 'var(--ludo)',
  cup: 'var(--cup)',
  night: 'var(--field)',
  rink: 'var(--rink)',
  apple: 'var(--apple)',
  leaf: 'var(--apple-leaf)',
  signal: 'var(--signal)',
  poor: 'var(--poor)',
} as const

/** An SVG element: `svg('circle', { cx: 1, cy: 1, r: 0.4 })`. */
export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Attributes = {},
  ...children: Child[]
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(NS, tag)
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value))
  for (const child of children) if (child) element.append(child)
  return element
}

/**
 * A drawing `width` by `height` cells, with a margin around it. It only shows what the text
 * beside it says, so screen readers skip it.
 */
export function picture(width: number, height: number, ...children: Child[]): SVGSVGElement {
  const margin = 0.15
  return svg(
    'svg',
    {
      viewBox: `${-margin} ${-margin} ${width + 2 * margin} ${height + 2 * margin}`,
      class: 'figure',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    ...children,
  )
}

/** The middle of a column or row. */
export const cx = (index: number): number => index + 0.5

/** A group of drawings, moved by (x, y) and turned by `angle` degrees round that point. */
export function group(x: number, y: number, angle: number, ...children: Child[]): SVGGElement {
  return svg('g', { transform: `translate(${x} ${y}) rotate(${angle})` }, ...children)
}

export function rect(x: number, y: number, width: number, height: number, fill: string, round = 0) {
  return svg('rect', { x, y, width, height, fill, rx: round })
}

/** A piece of a seat, round, with a dark rim; `crowned` puts a crown on it. */
export function piece(x: number, y: number, seat: number, radius = 0.36, crowned = false) {
  return svg(
    'g',
    {},
    svg('circle', {
      cx: x,
      cy: y,
      r: radius,
      fill: colour(seat),
      stroke: 'rgb(0 0 0 / 0.45)',
      'stroke-width': radius * 0.18,
    }),
    crowned ? label(x, y + radius * 0.4, '♛', radius * 1.2, INK.bg) : null,
  )
}

/** A ring round a cell, to point at it. */
export function ring(x: number, y: number, radius = 0.45, stroke: string = INK.accent) {
  return svg('circle', {
    cx: x,
    cy: y,
    r: radius,
    fill: 'none',
    stroke,
    'stroke-width': 0.09,
  })
}

/** A cross: a mark in Tic Tac Toe, a hit at sea, a piece that is taken. */
export function cross(x: number, y: number, size: number, stroke: string, width = 0.12) {
  const d = size / 2
  return svg('path', {
    d: `M${x - d} ${y - d}L${x + d} ${y + d}M${x + d} ${y - d}L${x - d} ${y + d}`,
    stroke,
    'stroke-width': width,
    'stroke-linecap': 'round',
    fill: 'none',
  })
}

/** A circle drawn as a line: the other mark in Tic Tac Toe. */
export function nought(x: number, y: number, radius: number, stroke: string, width = 0.12) {
  return svg('circle', { cx: x, cy: y, r: radius, fill: 'none', stroke, 'stroke-width': width })
}

/** A straight line, such as the one through a winning row. */
export function line(points: readonly (readonly [number, number])[], stroke: string, width = 0.12) {
  return svg('polyline', {
    points: points.map(([x, y]) => `${x},${y}`).join(' '),
    stroke,
    'stroke-width': width,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    fill: 'none',
  })
}

/**
 * An arrow along the points, with its head at the last one: a move, a jump, a turn. `dashed`
 * for a piece that jumps instead of sliding.
 */
export function arrow(
  points: readonly (readonly [number, number])[],
  stroke: string = INK.accent,
  width = 0.12,
  dashed = false,
): SVGGElement {
  const end = points[points.length - 1] ?? [0, 0]
  const before = points[points.length - 2] ?? end
  const angle = Math.atan2(end[1] - before[1], end[0] - before[0])
  const head = width * 3
  // The line stops short of the tip, so that it does not poke out of the head.
  const shaft = [
    ...points.slice(0, -1),
    [end[0] - Math.cos(angle) * head * 0.8, end[1] - Math.sin(angle) * head * 0.8] as const,
  ]
  const corner = (turn: number) =>
    `${end[0] - Math.cos(angle + turn) * head},${end[1] - Math.sin(angle + turn) * head}`
  const body = line(shaft, stroke, width)
  if (dashed) body.setAttribute('stroke-dasharray', `${width * 2} ${width * 1.6}`)
  return svg(
    'g',
    {},
    body,
    svg('polygon', {
      points: `${end[0]},${end[1]} ${corner(0.45)} ${corner(-0.45)}`,
      fill: stroke,
    }),
  )
}

/** A short text, centred on (x, y) at its baseline. */
export function label(x: number, y: number, text: string, size: number, fill: string = INK.text) {
  const element = svg('text', {
    x,
    y,
    'font-size': size,
    'text-anchor': 'middle',
    fill,
    'font-weight': 700,
    'font-family': 'system-ui, sans-serif',
  })
  element.textContent = text
  return element
}

/** The width and height of a card in the drawings. */
export const CARD_WIDTH = 2
export const CARD_HEIGHT = 2.8

/**
 * A card with its top left corner at (x, y): its rank, its suit and the mark of a card that does
 * something, as the table shows them; `back` for one face down, `dim` for one that does not fit.
 */
export function card(x: number, y: number, which: Card | 'back', dim = false): SVGGElement {
  if (which === 'back') {
    return svg(
      'g',
      {},
      rect(x, y, CARD_WIDTH, CARD_HEIGHT, INK.frame, 0.2),
      rect(x + 0.2, y + 0.2, CARD_WIDTH - 0.4, CARD_HEIGHT - 0.4, INK.cardBlue, 0.12),
      svg('rect', {
        x: x + 0.2,
        y: y + 0.2,
        width: CARD_WIDTH - 0.4,
        height: CARD_HEIGHT - 0.4,
        rx: 0.12,
        fill: 'none',
        stroke: INK.cardEdge,
        'stroke-width': 0.06,
      }),
    )
  }
  const red = suitOf(which) >= 2
  const ink = red ? INK.red : INK.black
  const mark = specialMark(rankOf(which))
  return svg(
    'g',
    { opacity: dim ? 0.45 : 1 },
    svg('rect', {
      x,
      y,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      rx: 0.2,
      fill: INK.paper,
      stroke: INK.paperEdge,
      'stroke-width': 0.05,
    }),
    label(x + 0.45, y + 0.75, rankMark(which), 0.6, ink),
    label(x + CARD_WIDTH / 2, y + 2, suitSymbol(suitOf(which)), 1.2, ink),
    mark ? label(x + CARD_WIDTH - 0.45, y + 0.75, mark, 0.45, INK.frame) : null,
  )
}

/** Lines between the cells of a board `columns` by `rows`, as on a Tic Tac Toe grid. */
export function gridLines(columns: number, rows: number, stroke: string, width = 0.08) {
  const d = [
    ...Array.from({ length: columns - 1 }, (_, i) => `M${i + 1} 0V${rows}`),
    ...Array.from({ length: rows - 1 }, (_, i) => `M0 ${i + 1}H${columns}`),
  ].join('')
  return svg('path', { d, stroke, 'stroke-width': width, 'stroke-linecap': 'round', fill: 'none' })
}

/** A burst where something crashes. */
export function burst(x: number, y: number, size: number, fill: string = INK.text) {
  const points = Array.from({ length: 16 }, (_, i) => {
    const angle = (i * Math.PI) / 8
    const r = i % 2 === 0 ? size : size * 0.45
    return `${x + Math.cos(angle) * r},${y + Math.sin(angle) * r}`
  })
  return svg('polygon', { points: points.join(' '), fill })
}

/** A die showing `pips`, with its top left corner at (x, y). */
export function die(x: number, y: number, pips: number, size = 1.7): SVGElement {
  const at: Record<number, readonly (readonly [number, number])[]> = {
    1: [[1, 1]],
    2: [
      [2, 0],
      [0, 2],
    ],
    3: [
      [2, 0],
      [1, 1],
      [0, 2],
    ],
    4: [
      [0, 0],
      [2, 0],
      [0, 2],
      [2, 2],
    ],
    5: [
      [0, 0],
      [2, 0],
      [1, 1],
      [0, 2],
      [2, 2],
    ],
    6: [
      [0, 0],
      [2, 0],
      [0, 1],
      [2, 1],
      [0, 2],
      [2, 2],
    ],
  }
  const step = size / 3.4
  return svg(
    'g',
    {},
    rect(x, y, size, size, INK.paper, size * 0.18),
    svg('rect', {
      x,
      y,
      width: size,
      height: size,
      rx: size * 0.18,
      fill: 'none',
      stroke: INK.black,
      'stroke-width': 0.07,
    }),
    ...(at[pips] ?? []).map(([px, py]) =>
      svg('circle', {
        cx: x + step * (px + 0.7),
        cy: y + step * (py + 0.7),
        r: size * 0.09,
        fill: INK.black,
      }),
    ),
  )
}
