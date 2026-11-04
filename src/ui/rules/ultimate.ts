import { colour } from '../canvas'
import { arrow, cross, gridLines, INK, line, nought, picture, rect, svg } from './draw'
import type { GameGuide } from './guide'

/** Marks on the big board: a small board (0 to 8) and a spot in it, both row by row, and a seat. */
type Mark = readonly [small: number, spot: number, seat: number]

/** The middle of a spot of a small board, in cells of the big board of 9 by 9. */
function at(small: number, spot: number): [number, number] {
  return [
    (small % 3) * 3 + (spot % 3) + 0.5,
    Math.floor(small / 3) * 3 + Math.floor(spot / 3) + 0.5,
  ]
}

function mark(x: number, y: number, seat: number, size = 1): SVGElement {
  return seat === 0
    ? cross(x, y, 0.6 * size, colour(0), 0.16 * size)
    : nought(x, y, 0.32 * size, colour(1), 0.14 * size)
}

/** The mark of a small board's winner, large over the whole board. */
function owner(small: number, seat: number): SVGElement {
  const [x, y] = at(small, 4)
  const drawn = mark(x, y, seat, 4)
  drawn.setAttribute('opacity', '0.4')
  return drawn
}

/** A small board ringed in the colour that points at things: where the next mark must go. */
function sent(small: number): SVGElement {
  return svg('rect', {
    x: (small % 3) * 3 + 0.08,
    y: Math.floor(small / 3) * 3 + 0.08,
    width: 2.84,
    height: 2.84,
    rx: 0.2,
    fill: INK.accent,
    'fill-opacity': 0.18,
    stroke: INK.accent,
    'stroke-width': 0.14,
  })
}

/** The big board of nine small ones, with marks, and more drawn under and over them. */
function big(marks: readonly Mark[], under: SVGElement[] = [], over: SVGElement[] = []) {
  const thick = svg('path', {
    d: 'M3 0V9M6 0V9M0 3H9M0 6H9',
    stroke: INK.text,
    'stroke-width': 0.14,
    'stroke-linecap': 'round',
  })
  return picture(
    9,
    9,
    rect(0, 0, 9, 9, INK.panel, 0.3),
    ...under,
    gridLines(9, 9, INK.muted, 0.04),
    thick,
    ...marks.map(([small, spot, seat]) => mark(...at(small, spot), seat)),
    ...over,
  )
}

export const ultimateGuide: GameGuide = {
  thumbnail: () =>
    big(
      [
        [0, 0, 0],
        [0, 4, 0],
        [0, 8, 0],
        [4, 4, 1],
        [4, 0, 0],
        [8, 2, 1],
        [2, 6, 1],
        [6, 2, 0],
      ],
      [sent(2), owner(0, 0)],
    ),
  rules: [
    {
      text: 'rulesUltimate1',
      picture: () =>
        big([
          [4, 4, 0],
          [4, 0, 1],
          [0, 4, 0],
        ]),
    },
    {
      text: 'rulesUltimate2',
      picture: () =>
        big(
          [[4, 2, 0]],
          [sent(2)],
          [
            arrow([
              [5.8, 3.2],
              [7, 2],
            ]),
          ],
        ),
    },
    {
      text: 'rulesUltimate3',
      picture: () =>
        big(
          [
            [3, 0, 0],
            [3, 4, 0],
            [3, 8, 0],
            [3, 2, 1],
            [3, 6, 1],
          ],
          [owner(3, 0)],
          [
            line(
              [
                [0.25, 3.25],
                [2.75, 5.75],
              ],
              INK.accent,
              0.1,
            ),
          ],
        ),
    },
    {
      text: 'rulesUltimate4',
      picture: () =>
        big(
          [],
          [owner(2, 1), owner(4, 1), owner(6, 1), owner(0, 0)],
          [
            line(
              [
                [8.5, 0.5],
                [0.5, 8.5],
              ],
              INK.accent,
              0.14,
            ),
          ],
        ),
    },
  ],
}
