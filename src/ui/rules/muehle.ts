import { MUEHLE_SPOTS } from '../../core/muehle'
import { arrow, cross, cx, INK, line, picture, piece, rect, ring, svg } from './draw'
import type { GameGuide } from './guide'

/** Where a point is drawn: the middle of its spot on the grid of 7 by 7. */
function at(point: number): [number, number] {
  const [x, y] = MUEHLE_SPOTS[point] ?? [0, 0]
  return [cx(x), cx(y)]
}

/** The board of three squares, with the pieces of each seat on their points. */
function board(red: readonly number[], yellow: readonly number[], ...extra: SVGElement[]) {
  const lines = [
    ...[0, 1, 2].map((ring) => {
      const size = 6 - 2 * ring
      return `M${cx(ring)} ${cx(ring)}h${size}v${size}h${-size}z`
    }),
    `M${cx(3)} ${cx(0)}v2M${cx(3)} ${cx(4)}v2M${cx(0)} ${cx(3)}h2M${cx(4)} ${cx(3)}h2`,
  ]
  return picture(
    7,
    7,
    rect(0, 0, 7, 7, INK.wood, 0.3),
    svg('path', { d: lines.join(''), stroke: INK.woodDark, 'stroke-width': 0.1, fill: 'none' }),
    ...MUEHLE_SPOTS.map((_, point) => {
      const [x, y] = at(point)
      if (red.includes(point)) return piece(x, y, 0, 0.36)
      if (yellow.includes(point)) return piece(x, y, 1, 0.36)
      return svg('circle', { cx: x, cy: y, r: 0.13, fill: INK.woodDark })
    }),
    ...extra,
  )
}

/** An arrow from one point to another, stopping short of the piece there. */
function move(from: number, to: number, dashed = false): SVGElement {
  const [x1, y1] = at(from)
  const [x2, y2] = at(to)
  const length = Math.hypot(x2 - x1, y2 - y1)
  const short = (length - 0.45) / length
  return arrow(
    [
      [x1, y1],
      [x1 + (x2 - x1) * short, y1 + (y2 - y1) * short],
    ],
    INK.bg,
    0.14,
    dashed,
  )
}

export const muehleGuide: GameGuide = {
  thumbnail: () => board([0, 9, 11, 20], [2, 13, 15, 17]),
  rules: [
    {
      text: 'rulesMuehle1',
      picture: () => board([0, 9, 22], [13, 19], ring(...at(22), 0.48, INK.bg)),
    },
    { text: 'rulesMuehle2', picture: () => board([1, 8, 19, 22], [2, 10, 13, 15], move(8, 9)) },
    {
      text: 'rulesMuehle3',
      picture: () =>
        board(
          [0, 1, 2, 17],
          [12, 14, 20],
          line([at(0), at(2)], INK.text, 0.16),
          cross(...at(20), 0.75, INK.bg, 0.14),
        ),
    },
    {
      text: 'rulesMuehle4',
      picture: () => board([0, 9, 10, 17, 23], [3, 13, 21], move(3, 14, true)),
    },
    { text: 'rulesMuehle5' },
  ],
}
