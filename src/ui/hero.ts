import type { GameId } from '../core/board'
import { t } from '../i18n'
import { card, die, group, INK, label, piece, rect, svg } from './rules/draw'
import { GUIDES } from './rules/index'

/**
 * The start screen's picture: an open wooden box, the Spielekiste, with boards standing up in
 * it, and cards, dice and pieces on the table in front. The boards are the chooser's own
 * thumbnails. Coordinates are in tenths of the picture's width: 36 wide, 23 high.
 */
export function hero(): SVGSVGElement {
  return svg(
    'svg',
    {
      viewBox: '0 0 36 23',
      class: 'hero',
      role: 'img',
      'aria-label': t('heroLabel'),
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
