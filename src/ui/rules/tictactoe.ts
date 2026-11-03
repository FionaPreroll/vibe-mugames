import { colour } from '../canvas'
import { cross, cx, gridLines, INK, line, nought, picture, rect, ring } from './draw'
import type { GameGuide } from './guide'

/** A grid of 3 by 3 with marks: 'x', 'o' or ' ' for each cell, row by row. */
function grid(marks: string, ...extra: SVGElement[]): SVGSVGElement {
  return picture(
    3,
    3,
    rect(0, 0, 3, 3, INK.panel, 0.2),
    gridLines(3, 3, INK.muted),
    ...[...marks].map((mark, cell) => {
      const x = cx(cell % 3)
      const y = cx(Math.floor(cell / 3))
      if (mark === 'x') return cross(x, y, 0.5, colour(0), 0.14)
      if (mark === 'o') return nought(x, y, 0.27, colour(1), 0.13)
      return null
    }),
    ...extra,
  )
}

export const ticTacToeGuide: GameGuide = {
  thumbnail: () => grid('x o ox  x'),
  rules: [
    { text: 'rulesTictactoe1', picture: () => grid('x  oxo   ', ring(cx(2), cx(1), 0.42)) },
    {
      text: 'rulesTictactoe2',
      picture: () =>
        grid(
          'xoo x   x',
          line(
            [
              [0.25, 0.25],
              [2.75, 2.75],
            ],
            INK.accent,
            0.1,
          ),
        ),
    },
    { text: 'rulesTictactoe3', picture: () => grid('xoxxoooxx') },
  ],
}
