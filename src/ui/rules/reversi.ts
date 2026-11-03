import { arrow, cx, INK, picture, piece, rect, ring } from './draw'
import type { GameGuide } from './guide'

const FELT = '#1f6b47'
const EDGE = '#143d2b'

/** Rows of green squares, each '0' or '1' for a seat's piece and '.' for a free square. */
function squares(rows: readonly string[], top = 0): SVGElement[] {
  return rows.flatMap((row, y) =>
    [...row].flatMap((mark, x): SVGElement[] => {
      const square = rect(x + 0.04, y + top + 0.04, 0.92, 0.92, FELT)
      return mark === '.' ? [square] : [square, piece(cx(x), cx(y) + top, Number(mark), 0.38)]
    }),
  )
}

function board(rows: readonly string[], ...extra: SVGElement[]): SVGSVGElement {
  const width = rows[0]?.length ?? 0
  return picture(
    width,
    rows.length,
    rect(-0.1, -0.1, width + 0.2, rows.length + 0.2, EDGE, 0.15),
    ...squares(rows),
    ...extra,
  )
}

export const reversiGuide: GameGuide = {
  thumbnail: () =>
    board([
      '........',
      '........',
      '..0.1...',
      '..0001..',
      '...011..',
      '...1.0..',
      '........',
      '........',
    ]),
  rules: [
    {
      text: 'rulesReversi1',
      picture: () =>
        board(
          [
            '........',
            '........',
            '........',
            '...10...',
            '...01...',
            '........',
            '........',
            '........',
          ],
          // Where the first player, red, may place a piece.
          ...[
            [2, 3],
            [3, 2],
            [5, 4],
            [4, 5],
          ].map(([x = 0, y = 0]) => ring(cx(x), cx(y), 0.3, INK.text)),
        ),
    },
    {
      // Before and after: a red piece at the end of a row encloses two yellow ones, which turn.
      text: 'rulesReversi2',
      picture: () =>
        picture(
          5,
          3.4,
          rect(-0.1, -0.1, 5.2, 1.2, EDGE, 0.15),
          ...squares(['0110.']),
          ring(cx(3), cx(0), 0.45, INK.text),
          arrow(
            [
              [2.5, 1.2],
              [2.5, 2.2],
            ],
            INK.accent,
            0.12,
          ),
          rect(-0.1, 2.3, 5.2, 1.2, EDGE, 0.15),
          ...squares(['0000.'], 2.4),
        ),
    },
    {
      // One piece can enclose lines in several directions at once.
      text: 'rulesReversi3',
      picture: () =>
        board(
          ['.....', '.0.0.', '..11.', '.01..', '.....'],
          ring(cx(3), cx(3), 0.42, INK.text),
          ...[
            [1, 3],
            [1, 1],
            [3, 1],
          ].map(([x = 0, y = 0]) => {
            const length = Math.hypot(x - 3, y - 3)
            const short = (length - 0.4) / length
            return arrow(
              [
                [cx(3), cx(3)],
                [cx(3) + (x - 3) * short, cx(3) + (y - 3) * short],
              ],
              INK.accent,
              0.1,
            )
          }),
        ),
    },
    { text: 'rulesReversi4' },
  ],
}
