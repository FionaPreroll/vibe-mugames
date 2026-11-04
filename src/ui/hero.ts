import { type Sticker, stickersOn } from '../awareness'
import type { GameId } from '../core/board'
import { type TextKey, t } from '../i18n'
import { toast } from './dom'
import { card, die, group, INK, label, piece, rect, svg } from './rules/draw'
import { GUIDES } from './rules/index'

/**
 * The start screen's picture: an open wooden box, the Spielekiste, with boards standing up in
 * it, and cards, dice and pieces on the table in front. The boards are the chooser's own
 * thumbnails. Coordinates are in tenths of the picture's width: 36 wide, 23 high. On the queer and
 * trans days, weeks and months of src/awareness.ts, a sticker on the box says so (docs/STICKERS.md).
 */
export function hero(now = new Date()): SVGSVGElement {
  const stuck = stickersOn(now)
  const picture = svg(
    'svg',
    {
      viewBox: '0 0 36 23',
      class: 'hero',
      role: 'img',
      'aria-label': [t('heroLabel'), ...stuck.map((sticker) => t(STICKER_TEXTS[sticker]))].join(
        ' ',
      ),
      focusable: 'false',
    },
    svg(
      'defs',
      {},
      svg(
        'filter',
        { id: 'hero-shadow', x: '-10%', y: '-10%', width: '130%', height: '130%' },
        svg('feDropShadow', {
          dx: 0.25,
          dy: 0.35,
          stdDeviation: 0.25,
          'flood-color': '#000',
          'flood-opacity': 0.45,
        }),
      ),
    ),
    // The light on the table.
    svg('ellipse', { cx: 18, cy: 20.4, rx: 17, ry: 2.4, fill: INK.accent, opacity: 0.12 }),
    svg('ellipse', { cx: 18, cy: 20.2, rx: 13.5, ry: 1.4, fill: '#000', opacity: 0.28 }),
    // The inside of the box, behind what stands in it.
    rect(5.6, 8.6, 24.8, 5, '#6a3f19', 0.5),
    svg('polygon', { points: '5.6,8.9 3.6,12.6 5.6,12.6', fill: '#a96a2c' }),
    svg('polygon', { points: '30.4,8.9 32.4,12.6 30.4,12.6', fill: '#a96a2c' }),
    // Boards standing in the box, leaning every way.
    standing('sternhalma', 25.4, 3.4, 6.4, 7.2, 17),
    standing('muehle', 6.4, 2.2, 8, 8, -13),
    standing('ludo', 20.6, 1.8, 8, 8, 9),
    standing('fourinarow', 13.2, 0.6, 9.4, 8.4, -2),
    // The cards, stuck in at the front.
    svg(
      'g',
      { transform: 'translate(10.4 12.2) scale(1.25)', filter: 'url(#hero-shadow)' },
      group(-0.8, 0, -26, card(-1, -2.8, 2 * 13 + 12)),
      group(0, 0, -8, card(-1, -3, 3 * 13 + 11)),
      group(0.8, 0, 12, card(-1, -2.8, 'back')),
    ),
    // The box's front, with its rim, a groove and a grip.
    rect(3.4, 12, 29.2, 1.5, '#e09b4f', 0.6),
    rect(3.9, 13.1, 28.2, 7.2, INK.wood, 0.7),
    rect(4.4, 16.6, 27.2, 0.28, '#a96a2c', 0.14),
    rect(15.6, 14.1, 4.8, 1.4, '#6a3f19', 0.7),
    // On the table in front: dice, a crowned draughtsman, Ludo pieces and the Mäxchen cup.
    group(4.2, 18.2, -14, die(-0.9, -0.9, 5, 1.9)),
    group(6.8, 19.3, 9, die(-0.9, -0.9, 2, 1.9)),
    cup(25.4, 18.6),
    stack(30.8, 20.2),
    pawn(28.2, 20.6, 0),
    pawn(9.6, 20.7, 2),
    piece(12, 20.6, 1, 0.7),
  )
  stuck.forEach((sticker, i) => {
    const [x, y, angle] = STICKER_PLACES[i % STICKER_PLACES.length] ?? [24, 15, 0]
    picture.append(stickerOn(sticker, x, y, angle))
  })
  return picture
}

const STICKER_TEXTS: Record<Sticker, TextKey> = {
  tdov: 'stickerTdov',
  idahobit: 'stickerIdahobit',
  pride: 'stickerPride',
  nonbinary: 'stickerNonbinary',
  bi: 'stickerBi',
  comingout: 'stickerComingOut',
  intersex: 'stickerIntersex',
  ace: 'stickerAce',
  transMonth: 'stickerTransMonth',
  transWeek: 'stickerTransWeek',
  tdor: 'stickerTdor',
}

/** Where stickers go on the box's front, right of its grip first: x, y and a slant. */
const STICKER_PLACES: readonly (readonly [number, number, number])[] = [
  [23.3, 14.7, -8],
  [26.9, 14.5, 6],
  [30.3, 14.9, -4],
  [8.6, 14.9, 7],
]

const RADIUS = 1.6

/** How long a sticker's text stays, long enough to read. */
const READING = 7000

/** A flag's stripes, top to bottom: a colour, and how wide it is against the others. */
type Stripes = readonly (readonly [colour: string, weight: number])[]
const even = (...colours: string[]): Stripes => colours.map((colour) => [colour, 1] as const)

const RAINBOW = even('#e40303', '#ff8c00', '#ffed00', '#008026', '#24408e', '#732982')
const TRANS = even('#5bcefa', '#f5a9b8', '#ffffff', '#f5a9b8', '#5bcefa')

/** Each sticker's flag, the mark in its middle, and whether it sparkles. */
const LOOKS: Record<Sticker, { stripes: Stripes; mark?: () => SVGElement; calm?: boolean }> = {
  tdov: { stripes: TRANS, mark: () => star('#ffd36b') },
  idahobit: { stripes: RAINBOW, mark: () => heart('#ffffff') },
  pride: { stripes: RAINBOW },
  nonbinary: { stripes: even('#fcf434', '#ffffff', '#9c59d1', '#2c2c2c') },
  bi: {
    stripes: [
      ['#d60270', 2],
      ['#9b4f96', 1],
      ['#0038a8', 2],
    ],
  },
  comingout: { stripes: RAINBOW, mark: door },
  intersex: {
    stripes: even('#ffd800'),
    mark: () => svg('circle', { r: 0.62, fill: 'none', stroke: '#7902aa', 'stroke-width': 0.24 }),
  },
  ace: { stripes: even('#000000', '#a3a3a3', '#ffffff', '#800080') },
  transMonth: { stripes: TRANS, mark: () => heart('#e0507a') },
  transWeek: { stripes: TRANS, mark: transSymbol },
  tdor: { stripes: TRANS, mark: candle, calm: true },
}

/**
 * A round sticker at (x, y), in its flag's stripes, with a mark for those that share a flag. It
 * sparkles, except the Day of Remembrance's, whose candle glows quietly. Hovering shows what it
 * is for, as does a tap, in a toast.
 */
function stickerOn(sticker: Sticker, x: number, y: number, angle: number): SVGGElement {
  const text = t(STICKER_TEXTS[sticker])
  const { stripes, mark, calm = false } = LOOKS[sticker]
  const clip = `sticker-${sticker}`
  const total = stripes.reduce((sum, [, weight]) => sum + weight, 0)
  let top = -RADIUS
  const bands = stripes.map(([colour, weight]) => {
    const height = (2 * RADIUS * weight) / total
    const band = rect(-RADIUS, top, 2 * RADIUS, height + 0.01, colour)
    top += height
    return band
  })
  const group = svg(
    'g',
    {
      class: `sticker sticker-${sticker}`,
      transform: `translate(${x} ${y}) rotate(${angle})`,
      tabindex: 0,
      'aria-label': text,
    },
    svg('title', {}),
    svg('clipPath', { id: clip }, svg('circle', { cx: 0, cy: 0, r: RADIUS })),
    svg('g', { 'clip-path': `url(#${clip})` }, ...bands),
    svg('circle', {
      cx: 0,
      cy: 0,
      r: RADIUS,
      fill: 'none',
      stroke: calm ? '#3a3f55' : '#ffffff',
      'stroke-width': 0.2,
    }),
    mark && svg('g', { transform: 'scale(1.2)' }, mark()),
    ...(calm
      ? []
      : [
          [1.55, -1.45, 0.48],
          [-1.7, -0.6, 0.34],
          [1.15, 1.6, 0.38],
        ].map(([dx, dy, size], i) =>
          svg('path', {
            class: `sparkle sparkle-${i}`,
            d: sparklePath(dx ?? 0, dy ?? 0, size ?? 0.3),
            fill: '#fff7c2',
          }),
        )),
  )
  const title = group.querySelector('title')
  if (title) title.textContent = text
  group.addEventListener('click', () => toast(text, READING))
  group.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    toast(text, READING)
  })
  return group
}

function heart(fill: string): SVGElement {
  return svg('path', {
    d: 'M0 0.55C-0.75 0 -0.75 -0.45 -0.4 -0.55C-0.15 -0.6 0 -0.4 0 -0.3C0 -0.4 0.15 -0.6 0.4 -0.55C0.75 -0.45 0.75 0 0 0.55Z',
    fill,
    stroke: 'rgb(0 0 0 / 0.25)',
    'stroke-width': 0.05,
  })
}

function star(fill: string): SVGElement {
  const points = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 0.62 : 0.26
    const a = (i * Math.PI) / 5 - Math.PI / 2
    return `${(r * Math.cos(a)).toFixed(3)},${(r * Math.sin(a)).toFixed(3)}`
  })
  return svg('polygon', {
    points: points.join(' '),
    fill,
    stroke: 'rgb(0 0 0 / 0.3)',
    'stroke-width': 0.05,
  })
}

/** An open door, for coming out. */
function door(): SVGElement {
  return svg(
    'g',
    {},
    rect(-0.5, -0.7, 1, 1.4, '#3b2410', 0.05),
    svg('path', { d: 'M-0.5 -0.7L0.25 -0.55V0.85L-0.5 0.7Z', fill: '#ffffff' }),
    svg('circle', { cx: 0.08, cy: 0.12, r: 0.07, fill: '#3b2410' }),
  )
}

/** The trans symbol: a circle with an arrow, a cross, and both together. */
function transSymbol(): SVGElement {
  return svg(
    'g',
    { fill: 'none', stroke: '#26324a', 'stroke-width': 0.11, 'stroke-linecap': 'round' },
    svg('circle', { cx: 0, cy: 0, r: 0.3 }),
    svg('path', { d: 'M0.21 -0.21L0.62 -0.62M0.38 -0.62H0.62V-0.38' }),
    svg('path', { d: 'M0 0.3V0.75M-0.18 0.55H0.18' }),
    svg('path', { d: 'M-0.21 -0.21L-0.62 -0.62M-0.62 -0.38V-0.62H-0.38M-0.55 -0.35L-0.35 -0.55' }),
  )
}

/** A candle with a quiet glow, for the Day of Remembrance. */
function candle(): SVGElement {
  return svg(
    'g',
    {},
    svg('circle', { class: 'candle-glow', cx: 0, cy: -0.45, r: 0.5, fill: '#ffd36b' }),
    rect(-0.22, -0.2, 0.44, 0.85, '#fdf6e3', 0.06),
    svg('path', { d: 'M0 -0.78Q0.2 -0.5 0 -0.28Q-0.2 -0.5 0 -0.78Z', fill: '#f59e0b' }),
  )
}

/** A four-pointed sparkle round (x, y). */
function sparklePath(x: number, y: number, size: number): string {
  const w = size * 0.28
  return `M${x} ${y - size}Q${x + w} ${y - w} ${x + size} ${y}Q${x + w} ${y + w} ${x} ${y + size}Q${x - w} ${y + w} ${x - size} ${y}Q${x - w} ${y - w} ${x} ${y - size}Z`
}

/** A game's thumbnail, standing up at (x, y), `width` by `height`, leaning by `angle` degrees. */
function standing(
  game: GameId,
  x: number,
  y: number,
  width: number,
  height: number,
  angle: number,
): SVGGElement {
  const board = GUIDES[game].thumbnail()
  board.removeAttribute('class')
  for (const [name, value] of Object.entries({ x, y, width, height }))
    board.setAttribute(name, String(value))
  return svg(
    'g',
    { transform: `rotate(${angle} ${x + width / 2} ${y + height})`, filter: 'url(#hero-shadow)' },
    board,
  )
}

/** A Ludo piece in a seat's colour, standing on the table at (x, y). */
function pawn(x: number, y: number, seat: number): SVGGElement {
  const fill = `var(--seat-${seat})`
  const edge = 'rgb(0 0 0 / 0.35)'
  return svg(
    'g',
    { stroke: edge, 'stroke-width': 0.12 },
    svg('path', {
      d: `M${x - 0.9} ${y}h1.8l-0.55 -2.1h-0.7z`,
      fill,
    }),
    svg('ellipse', { cx: x, cy: y - 2.1, rx: 0.65, ry: 0.22, fill }),
    svg('circle', { cx: x, cy: y - 2.75, r: 0.6, fill }),
  )
}

/** Two draughtsmen on top of each other, a crowned one, at (x, y). */
function stack(x: number, y: number): SVGGElement {
  return svg(
    'g',
    {},
    svg('ellipse', { cx: x, cy: y, rx: 1.1, ry: 0.45, fill: '#a3282c' }),
    svg('rect', { x: x - 1.1, y: y - 0.9, width: 2.2, height: 0.9, fill: '#a3282c' }),
    svg('ellipse', { cx: x, cy: y - 0.9, rx: 1.1, ry: 0.45, fill: 'var(--seat-0)' }),
    svg('rect', { x: x - 1.1, y: y - 1.6, width: 2.2, height: 0.7, fill: '#a3282c' }),
    svg('ellipse', { cx: x, cy: y - 1.6, rx: 1.1, ry: 0.45, fill: 'var(--seat-0)' }),
    label(x, y - 1.32, '♛', 0.8, INK.bg),
  )
}

/** Mäxchen's cup, upside down on the table at (x, y). */
function cup(x: number, y: number): SVGGElement {
  return svg(
    'g',
    {},
    svg('path', { d: `M${x - 1.5} ${y + 1.2}h3l-0.5 -3.1h-2z`, fill: '#6f3b1d' }),
    rect(x - 1.75, y + 0.9, 3.5, 0.55, '#4f2812', 0.25),
    rect(x - 1.1, y - 2, 2.2, 0.35, '#8a4d27', 0.15),
  )
}
