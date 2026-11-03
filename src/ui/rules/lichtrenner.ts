import { colour } from '../canvas'
import { arrow, burst, gridLines, INK, line, picture, rect, svg } from './draw'
import type { GameGuide } from './guide'

/** A corner of the grid, `size` squares wide, at night. */
const SIZE = 12

type Point = readonly [number, number]

/** A rider's wall of light through the corners where it turned, and the rider at its end. */
function rider(seat: number, corners: readonly Point[]): SVGElement {
  const head = corners[corners.length - 1] ?? [0, 0]
  return svg(
    'g',
    {},
    line(corners, colour(seat), 0.32),
    rect(head[0] - 0.35, head[1] - 0.35, 0.7, 0.7, '#fff', 0.15),
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

export const lichtrennerGuide: GameGuide = {
  thumbnail: () =>
    grid(
      rider(0, [
        [1.5, 10.5],
        [5.5, 10.5],
        [5.5, 4.5],
        [8.5, 4.5],
      ]),
      rider(1, [
        [10.5, 1.5],
        [10.5, 8.5],
        [7.5, 8.5],
      ]),
      rider(2, [
        [1.5, 1.5],
        [3.5, 1.5],
        [3.5, 7.5],
      ]),
    ),
  rules: [
    {
      text: 'rulesLichtrenner1',
      picture: () =>
        grid(
          rider(0, [
            [1.5, 10.5],
            [6.5, 10.5],
            [6.5, 5.5],
          ]),
          rider(1, [
            [10.5, 1.5],
            [10.5, 6.5],
            [8.5, 6.5],
          ]),
        ),
    },
    {
      text: 'rulesLichtrenner2',
      picture: () =>
        grid(
          rider(0, [
            [6, 11.5],
            [6, 7.5],
          ]),
          arrow(
            [
              [6, 6.8],
              [6, 4.5],
              [3, 4.5],
            ],
            INK.text,
            0.24,
          ),
          arrow(
            [
              [6, 6.8],
              [6, 4.5],
              [9, 4.5],
            ],
            INK.text,
            0.24,
          ),
        ),
    },
    {
      text: 'rulesLichtrenner3',
      picture: () =>
        grid(
          rider(1, [
            [11.5, 4.5],
            [2.5, 4.5],
            [2.5, 1.5],
          ]),
          line(
            [
              [5.5, 11.5],
              [5.5, 5.1],
            ],
            colour(0),
            0.32,
          ),
          burst(5.5, 5.1, 1, '#fff'),
        ),
    },
  ],
}
