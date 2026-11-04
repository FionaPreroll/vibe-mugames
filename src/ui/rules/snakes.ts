import { colour } from '../canvas'
import { arrow, burst, gridLines, INK, label, line, picture, rect, svg } from './draw'
import type { GameGuide } from './guide'

/** A corner of the grid, `size` squares wide. */
const SIZE = 10

type Point = readonly [number, number]

/** A snake through the middles of its squares, head first, with eyes on its head. */
function snake(seat: number, cells: readonly Point[], out = false): SVGElement {
  const [hx, hy] = cells[0] ?? [0, 0]
  return svg(
    'g',
    { opacity: out ? 0.35 : 1 },
    line(cells, colour(seat), 0.72),
    svg('circle', { cx: hx, cy: hy, r: 0.48, fill: colour(seat) }),
    svg('circle', { cx: hx + 0.18, cy: hy - 0.18, r: 0.09, fill: '#fff' }),
    svg('circle', { cx: hx + 0.18, cy: hy + 0.18, r: 0.09, fill: '#fff' }),
  )
}

function apple(x: number, y: number): SVGElement {
  return svg(
    'g',
    {},
    svg('circle', { cx: x, cy: y + 0.05, r: 0.34, fill: INK.apple }),
    svg('ellipse', {
      cx: x + 0.12,
      cy: y - 0.32,
      rx: 0.14,
      ry: 0.07,
      fill: INK.leaf,
      transform: `rotate(-34 ${x + 0.12} ${y - 0.32})`,
    }),
  )
}

function grid(...children: SVGElement[]): SVGSVGElement {
  return picture(
    SIZE,
    SIZE,
    rect(0, 0, SIZE, SIZE, INK.night, 0.3),
    gridLines(SIZE, SIZE, 'rgb(255 255 255 / 0.07)', 0.05),
    ...children,
  )
}

export const snakesGuide: GameGuide = {
  thumbnail: () =>
    grid(
      snake(0, [
        [6.5, 2.5],
        [5.5, 2.5],
        [4.5, 2.5],
        [3.5, 2.5],
        [2.5, 2.5],
        [2.5, 3.5],
        [2.5, 4.5],
      ]),
      snake(2, [
        [4.5, 7.5],
        [5.5, 7.5],
        [6.5, 7.5],
        [7.5, 7.5],
        [7.5, 6.5],
      ]),
      apple(8.5, 2.5),
      apple(2.5, 7.5),
    ),
  rules: [
    {
      text: 'rulesSnakes1',
      picture: () =>
        grid(
          snake(0, [
            [4.5, 5.5],
            [4.5, 6.5],
            [4.5, 7.5],
            [4.5, 8.5],
          ]),
          arrow(
            [
              [4.5, 4.6],
              [4.5, 2.5],
              [2, 2.5],
            ],
            INK.text,
            0.2,
          ),
          arrow(
            [
              [4.5, 4.6],
              [4.5, 2.5],
              [7, 2.5],
            ],
            INK.text,
            0.2,
          ),
        ),
    },
    {
      text: 'rulesSnakes2',
      picture: () =>
        grid(
          snake(1, [
            [5.5, 5.5],
            [4.5, 5.5],
            [3.5, 5.5],
            [2.5, 5.5],
          ]),
          apple(6.5, 5.5),
          label(6.5, 4.3, '+1', 0.9),
        ),
    },
    {
      text: 'rulesSnakes3',
      picture: () =>
        grid(
          snake(3, [
            [2.5, 4.5],
            [3.5, 4.5],
            [4.5, 4.5],
            [5.5, 4.5],
            [6.5, 4.5],
            [7.5, 4.5],
          ]),
          snake(
            0,
            [
              [4.5, 5.5],
              [4.5, 6.5],
              [4.5, 7.5],
              [4.5, 8.5],
            ],
            true,
          ),
          burst(4.5, 5, 0.9, '#fff'),
        ),
    },
  ],
}
