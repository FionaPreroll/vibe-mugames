import { SEA } from '../../core/seeschlacht'
import { colour } from '../canvas'
import { cross, cx, INK, picture, rect, ring, svg } from './draw'
import type { GameGuide } from './guide'

/**
 * A sea of 10 by 10: `rows` lists the rows from the top, each with '.' for open sea, 's' for a
 * ship, 'x' for a hit, '#' for a ship that is sunk and 'o' for a shot into the water.
 */
function sea(rows: readonly string[], ...extra: SVGElement[]): SVGSVGElement {
  const squares: SVGElement[] = []
  rows.forEach((row, y) => {
    ;[...row].forEach((mark, x) => {
      const fill =
        mark === 's'
          ? INK.ship
          : mark === 'x'
            ? colour(0)
            : mark === '#'
              ? INK.sunk
              : mark === 'o'
                ? INK.water
                : INK.sea
      squares.push(rect(x + 0.06, y + 0.06, 0.88, 0.88, fill, 0.08))
      if (mark === 'x' || mark === '#') squares.push(cross(cx(x), cx(y), 0.4, '#fff', 0.1))
      if (mark === 'o')
        squares.push(svg('circle', { cx: cx(x), cy: cx(y), r: 0.12, fill: INK.waterText }))
    })
  })
  return picture(
    SEA,
    SEA,
    rect(-0.1, -0.1, SEA + 0.2, SEA + 0.2, INK.seaDeep, 0.3),
    ...squares,
    ...extra,
  )
}

const FLEET = [
  '........s.',
  '.sssss..s.',
  '........s.',
  '........s.',
  '..sss.....',
  '..........',
  's.........',
  's.........',
  's....ss...',
  '..........',
]

export const seeschlachtGuide: GameGuide = {
  thumbnail: () =>
    sea([
      '........s.',
      '.sxxss..x.',
      '...o....s.',
      '......o.s.',
      '..###.....',
      '.o.....o..',
      's.........',
      'x...o.....',
      's....ss...',
      '..o.......',
    ]),
  rules: [
    { text: 'rulesSeeschlacht1', picture: () => sea(FLEET) },
    {
      text: 'rulesSeeschlacht2',
      picture: () =>
        sea(
          [
            '..........',
            '..........',
            '...o......',
            '......x...',
            '......x...',
            '..........',
            '.o........',
            '........o.',
            '..........',
            '....o.....',
          ],
          ring(cx(6), cx(5), 0.5, INK.text),
        ),
    },
    {
      text: 'rulesSeeschlacht3',
      picture: () =>
        sea([
          '..........',
          '.x........',
          '..........',
          '..ooooo...',
          '..o###o...',
          '..ooooo...',
          '..........',
          '........o.',
          '.......o..',
          '..........',
        ]),
    },
    { text: 'rulesSeeschlacht4' },
  ],
}
