import { BOXES } from '../../core/kaesekaestchen'
import { colour } from '../canvas'
import { INK, line, picture, rect, svg } from './draw'
import type { GameGuide } from './guide'

/** A line between two dots: across from (x, y) to the dot on its right, or down to the one below. */
type Stroke = readonly [x: number, y: number, down: boolean, seat: number]
/** A box won by a seat: its top left dot, and the seat. */
type Won = readonly [x: number, y: number, seat: number]

/** `size` by `size` boxes on paper: the boxes won, the lines drawn, and the dots. */
function paper(
  size: number,
  strokes: readonly Stroke[],
  boxes: readonly Won[],
  ...extra: SVGElement[]
): SVGSVGElement {
  const dots: SVGElement[] = []
  for (let y = 0; y <= size; y++) {
    for (let x = 0; x <= size; x++) {
      dots.push(svg('circle', { cx: x + 0.5, cy: y + 0.5, r: 0.11, fill: INK.bg }))
    }
  }
  return picture(
    size + 1,
    size + 1,
    rect(0, 0, size + 1, size + 1, '#f4efe1', 0.25),
    ...boxes.map(([x, y, seat]) =>
      svg('rect', {
        x: x + 0.5,
        y: y + 0.5,
        width: 1,
        height: 1,
        fill: colour(seat),
        'fill-opacity': 0.55,
      }),
    ),
    ...strokes.map(([x, y, down, seat]) => edge(x, y, down, colour(seat))),
    ...extra,
    ...dots,
  )
}

function edge(x: number, y: number, down: boolean, stroke: string, width = 0.12): SVGElement {
  return line(
    [
      [x + 0.5, y + 0.5],
      [x + (down ? 0.5 : 1.5), y + (down ? 1.5 : 0.5)],
    ],
    stroke,
    width,
  )
}

/** The line about to be drawn: thicker, in the colour that points at things. */
function next(x: number, y: number, down: boolean): SVGElement {
  const drawn = edge(x, y, down, INK.accent, 0.16)
  drawn.setAttribute('stroke-dasharray', '0.2 0.12')
  return drawn
}

export const kaesekaestchenGuide: GameGuide = {
  thumbnail: () =>
    paper(
      BOXES,
      [
        [0, 0, false, 0],
        [1, 0, false, 1],
        [0, 0, true, 1],
        [1, 0, true, 0],
        [0, 1, false, 0],
        [2, 0, true, 1],
        [3, 1, false, 0],
        [3, 1, true, 1],
        [4, 1, true, 0],
        [3, 2, false, 1],
        [1, 3, false, 0],
        [1, 3, true, 1],
        [2, 3, true, 0],
        [1, 4, false, 1],
        [4, 3, true, 0],
        [0, 4, false, 1],
        [3, 4, false, 0],
      ],
      [
        [0, 0, 0],
        [3, 1, 1],
        [1, 3, 0],
      ],
    ),
  rules: [
    {
      text: 'rulesKaesekaestchen1',
      picture: () =>
        paper(
          3,
          [
            [0, 0, false, 0],
            [1, 1, true, 1],
            [2, 2, false, 0],
            [0, 2, true, 1],
          ],
          [],
          next(1, 0, false),
        ),
    },
    {
      text: 'rulesKaesekaestchen2',
      picture: () =>
        paper(
          3,
          [
            [1, 1, false, 1],
            [1, 1, true, 0],
            [2, 1, true, 1],
            [0, 0, false, 1],
            [2, 2, true, 0],
          ],
          [[1, 1, 0]],
          next(1, 2, false),
        ),
    },
    { text: 'rulesKaesekaestchen3' },
  ],
}
