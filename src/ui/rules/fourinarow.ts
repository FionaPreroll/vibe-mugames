import { FOUR_COLUMNS } from '../../core/fourInARow'
import { arrow, cx, INK, line, picture, piece, rect, ring, svg } from './draw'
import type { GameGuide } from './guide'

const ROWS = 6

/**
 * The upright board of 7 by 6 holes, with a row of room above it. `rows` lists the board's rows
 * from the top, each with '0' or '1' for a disc of that seat and '.' for a free hole.
 */
function frame(rows: readonly string[], ...extra: SVGElement[]): SVGSVGElement {
  const holes: SVGElement[] = []
  rows.forEach((row, y) => {
    ;[...row].forEach((mark, x) => {
      holes.push(
        mark === '.'
          ? svg('circle', { cx: cx(x), cy: cx(y) + 1, r: 0.38, fill: INK.bg })
          : piece(cx(x), cx(y) + 1, Number(mark), 0.38),
      )
    })
  })
  return picture(
    FOUR_COLUMNS,
    ROWS + 1,
    rect(0, 1, FOUR_COLUMNS, ROWS, INK.frame, 0.25),
    ...holes,
    ...extra,
  )
}

export const fourInARowGuide: GameGuide = {
  thumbnail: () => frame(['.......', '.......', '...1...', '..10...', '.0011..', '1001010']),
  rules: [
    {
      text: 'rulesFourinarow1',
      picture: () =>
        frame(
          ['.......', '.......', '.......', '...1...', '..00...', '.1001..'],
          piece(cx(2), 0.5, 1, 0.38),
          arrow([
            [cx(2), 1.05],
            [cx(2), 4.05],
          ]),
          ring(cx(2), cx(3) + 1, 0.45),
        ),
    },
    {
      text: 'rulesFourinarow2',
      picture: () =>
        frame(
          ['.......', '.......', '....0..', '...01..', '..011..', '.01100.'],
          line(
            [
              [cx(1), cx(5) + 1],
              [cx(4), cx(2) + 1],
            ],
            INK.text,
            0.12,
          ),
        ),
    },
  ],
}
