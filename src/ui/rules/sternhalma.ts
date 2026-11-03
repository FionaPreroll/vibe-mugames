import { home, STERN_HOLES, STERN_TRIANGLE, target } from '../../core/sternhalma'
import { colour } from '../canvas'
import { arrow, INK, picture, piece, ring, svg } from './draw'
import type { GameGuide } from './guide'

/** Rows lie closer than the half steps across, so that neighbours are equally far apart. */
const ROW = Math.sqrt(3) / 2

/** Where a hole of the star is drawn: x in half steps of one, y in rows. */
function at(x: number, y: number): [number, number] {
  return [x / 2 + 0.5, y * ROW + 0.5]
}

const WIDTH = 13
const HEIGHT = 16 * ROW + 1

/** The star's outline, through its six tips and the six corners between them. */
const OUTLINE = [
  [12, -1.2],
  [16.4, 3.6],
  [25.2, 3.6],
  [20.8, 8],
  [25.2, 12.4],
  [16.4, 12.4],
  [12, 17.2],
  [7.6, 12.4],
  [-1.2, 12.4],
  [3.2, 8],
  [-1.2, 3.6],
  [7.6, 3.6],
] as const

/**
 * The star, with the pieces of `seats` players in their triangles, as the game starts, but for
 * `moved`: pieces that left, by hole, with the hole they went to.
 */
function star(
  seats: number,
  moved: ReadonlyMap<number, number> = new Map(),
  ...extra: SVGElement[]
): SVGSVGElement {
  const seatAt = new Map<number, number>()
  STERN_HOLES.forEach((_, hole) => {
    for (let seat = 0; seat < seats; seat++) {
      if (STERN_TRIANGLE[hole] === home(seat, seats)) seatAt.set(hole, seat)
    }
  })
  for (const [from, to] of moved) {
    const seat = seatAt.get(from)
    seatAt.delete(from)
    if (seat !== undefined) seatAt.set(to, seat)
  }
  return picture(
    WIDTH,
    HEIGHT,
    svg('polygon', {
      points: OUTLINE.map(([x, y]) => at(x, y).join(',')).join(' '),
      fill: INK.wood,
      stroke: INK.woodDark,
      'stroke-width': 0.08,
      'stroke-linejoin': 'round',
    }),
    ...STERN_HOLES.map(([x, y], hole) => {
      const [px, py] = at(x, y)
      const seat = seatAt.get(hole)
      return seat === undefined
        ? svg('circle', { cx: px, cy: py, r: 0.13, fill: INK.woodDark })
        : piece(px, py, seat, 0.36)
    }),
    ...extra,
  )
}

/** The hole at (x, y) of the star. */
function hole(x: number, y: number): number {
  return STERN_HOLES.findIndex(([hx, hy]) => hx === x && hy === y)
}

/**
 * A corner of holes in rows, as on the star: `pieces` maps "x,y" (in half steps and rows) to the
 * seat of the piece there.
 */
function patch(pieces: Readonly<Record<string, number>>, ...extra: SVGElement[]): SVGSVGElement {
  const holes: SVGElement[] = []
  for (let y = 0; y <= 4; y++) {
    for (let x = 0; x <= 12; x++) {
      if ((x + y) % 2 !== 0) continue
      const [px, py] = at(x, y)
      const seat = pieces[`${x},${y}`]
      holes.push(
        seat === undefined
          ? svg('circle', { cx: px, cy: py, r: 0.13, fill: INK.woodDark })
          : piece(px, py, seat, 0.36),
      )
    }
  }
  return picture(
    7,
    4 * ROW + 1,
    svg('rect', { x: 0, y: 0, width: 7, height: 4 * ROW + 1, rx: 0.3, fill: INK.wood }),
    ...holes,
    ...extra,
  )
}

/** An arrow from hole to hole in a patch, through the holes between, stopping short of the last. */
function path(...holes: readonly (readonly [number, number])[]): SVGElement {
  const points = holes.map(([x, y]) => at(x, y))
  const end = points[points.length - 1] ?? [0, 0]
  const before = points[points.length - 2] ?? end
  const length = Math.hypot(end[0] - before[0], end[1] - before[1])
  const short = (length - 0.3) / length
  return arrow(
    [
      ...points.slice(0, -1),
      [before[0] + (end[0] - before[0]) * short, before[1] + (end[1] - before[1]) * short],
    ],
    INK.bg,
    0.1,
  )
}

export const sternhalmaGuide: GameGuide = {
  thumbnail: () =>
    star(
      3,
      new Map([
        [hole(11, 13), hole(11, 9)],
        [hole(13, 13), hole(14, 8)],
        [hole(4, 4), hole(8, 6)],
        [hole(20, 4), hole(15, 7)],
      ]),
    ),
  rules: [
    {
      text: 'rulesSternhalma1',
      picture: () =>
        star(
          2,
          new Map(),
          ...STERN_HOLES.flatMap(([x, y], index) =>
            STERN_TRIANGLE[index] === target(0, 2) ? [ring(...at(x, y), 0.42, colour(0))] : [],
          ),
          arrow([at(12, 11.6), at(12, 4.4)], INK.accent, 0.16),
        ),
    },
    {
      text: 'rulesSternhalma2',
      picture: () =>
        patch(
          { '1,3': 0, '3,3': 1, '6,4': 0, '7,3': 1, '9,1': 0 },
          path([1, 3], [2, 2]),
          path([6, 4], [8, 2], [10, 0]),
        ),
    },
    { text: 'rulesSternhalma3' },
  ],
}
