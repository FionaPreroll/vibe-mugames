import { DAME_SIZE } from '../../core/dame'
import { arrow, cross, cx, INK, picture, piece, rect } from './draw'
import type { GameGuide } from './guide'

/**
 * A board of squares, or a corner of one, with the dark squares where they are in Dame: `rows`
 * lists the rows from the top, each with '0' or '1' for a seat's piece, 'A' or 'B' for its
 * crowned piece and '.' for a free square.
 */
function squares(rows: readonly string[], ...extra: SVGElement[]): SVGSVGElement {
  const size = rows.length
  const cells: SVGElement[] = []
  rows.forEach((row, y) => {
    ;[...row].forEach((mark, x) => {
      cells.push(rect(x, y, 1, 1, (x + y) % 2 === 1 ? INK.darkSquare : INK.lightSquare))
      if (mark !== '.') {
        const crowned = mark === 'A' || mark === 'B'
        const seat = mark === '1' || mark === 'B' ? 1 : 0
        cells.push(piece(cx(x), cx(y), seat, 0.38, crowned))
      }
    })
  })
  return picture(
    size,
    size,
    rect(-0.1, -0.1, size + 0.2, size + 0.2, INK.woodDark, 0.15),
    ...cells,
    ...extra,
  )
}

/** An arrow from square to square through the squares between, stopping short of the last. */
function path(...points: readonly (readonly [number, number])[]): SVGElement {
  const centres = points.map(([x, y]) => [cx(x), cx(y)] as const)
  const end = centres[centres.length - 1] ?? [0, 0]
  const before = centres[centres.length - 2] ?? end
  const length = Math.hypot(end[0] - before[0], end[1] - before[1])
  const short = (length - 0.3) / length
  return arrow(
    [
      ...centres.slice(0, -1),
      [before[0] + (end[0] - before[0]) * short, before[1] + (end[1] - before[1]) * short],
    ],
    INK.accent,
    0.13,
  )
}

/** Where Dame starts: twelve pieces each on the dark squares of their three rows. */
function start(): string[] {
  return Array.from({ length: DAME_SIZE }, (_, y) =>
    Array.from({ length: DAME_SIZE }, (_, x) =>
      (x + y) % 2 === 0 ? '.' : y < 3 ? '1' : y >= DAME_SIZE - 3 ? '0' : '.',
    ).join(''),
  )
}

export const dameGuide: GameGuide = {
  thumbnail: () => squares(start()),
  rules: [
    {
      text: 'rulesDame1',
      picture: () =>
        squares(
          ['.1....', '....1.', '......', '..0...', '...0..', '0.....'],
          path([2, 3], [1, 2]),
          path([2, 3], [3, 2]),
        ),
    },
    {
      text: 'rulesDame2',
      picture: () =>
        squares(
          ['......', '....1.', '......', '......', '.1.1..', '0.....'],
          cross(cx(1), cx(4), 0.5, INK.text, 0.14),
          cross(cx(3), cx(4), 0.5, INK.text, 0.14),
          path([0, 5], [2, 3], [4, 5]),
        ),
    },
    { text: 'rulesDame3' },
    {
      text: 'rulesDame4',
      picture: () =>
        squares(
          ['......', '....1.', '......', '..A...', '......', '......'],
          path([2, 3], [0, 1]),
          path([2, 3], [5, 0]),
          path([2, 3], [0, 5]),
          path([2, 3], [4, 5]),
          cross(cx(4), cx(1), 0.5, INK.text, 0.14),
        ),
    },
    { text: 'rulesDame5' },
  ],
}
