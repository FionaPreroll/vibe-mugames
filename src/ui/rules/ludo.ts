import { MAX_LUDO, SIX, TRACK } from '../../core/ludo'
import { colour } from '../canvas'
import { CORNER_SPOTS, HOME_SPOTS, TRACK_SPOTS } from '../ludo'
import { arrow, die, INK, picture, piece, rect, ring, svg } from './draw'
import type { GameGuide } from './guide'

/**
 * Ludo's board of 11 by 11 as the drawings show it: corner 0 at the top left, each corner the
 * colour of the seat that starts there, as when four play.
 */

const SIZE = 11
type Spot = readonly [number, number]
const centre = ([x, y]: Spot): [number, number] => [x + 0.5, y + 0.5]

const track = (square: number): Spot => TRACK_SPOTS[square % TRACK] ?? [0, 0]
const homeSquare = (corner: number, index: number): Spot => HOME_SPOTS[corner]?.[index] ?? [5, 5]
const yard = (corner: number, index: number): Spot => CORNER_SPOTS[corner]?.[index] ?? [0, 0]
/** The start square of a corner, where its pieces come out. */
const startOf = (corner: number): Spot => track(corner * (TRACK / MAX_LUDO))

function hole(spot: Spot, fill: string, stroke: string = INK.woodDark): SVGElement {
  const [x, y] = centre(spot)
  return svg('circle', { cx: x, cy: y, r: 0.43, fill, stroke, 'stroke-width': 0.07 })
}

/** A seat's colour mixed with the paper of the board, `amount` in a hundred, for its squares. */
function tint(seat: number, amount: number): string {
  const channels = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16))
  const seatColour = channels(colour(seat))
  const paper = channels(INK.paper)
  const mixed = seatColour.map((value, i) =>
    Math.round((value * amount + (paper[i] ?? 0) * (100 - amount)) / 100),
  )
  return `rgb(${mixed.join(' ')})`
}

/** Pieces on the board: a seat, and where it stands. */
type Placed = readonly [seat: number, spot: Spot]

function board(pieces: readonly Placed[], ...extra: SVGElement[]): SVGSVGElement {
  const cells: SVGElement[] = []
  TRACK_SPOTS.forEach((spot, square) => {
    const corner = square % (TRACK / MAX_LUDO) === 0 ? square / (TRACK / MAX_LUDO) : -1
    cells.push(hole(spot, corner >= 0 ? tint(corner, 55) : INK.paper))
  })
  for (let corner = 0; corner < MAX_LUDO; corner++) {
    for (let index = 0; index < 4; index++) {
      cells.push(hole(homeSquare(corner, index), tint(corner, 55)))
      cells.push(hole(yard(corner, index), tint(corner, 30), tint(corner, 70)))
    }
  }
  // The middle, where the home squares meet: a triangle of each corner's colour.
  const middle = [0, 1, 2, 3].map((corner) => {
    const [hx, hy] = centre(homeSquare(corner, 3))
    const dx = (hx - 5.5) * 0.9
    const dy = (hy - 5.5) * 0.9
    return svg('polygon', {
      points: `5.5,5.5 ${5.5 + dx - dy},${5.5 + dy + dx} ${5.5 + dx + dy},${5.5 + dy - dx}`,
      fill: colour(corner),
    })
  })
  return picture(
    SIZE,
    SIZE,
    rect(0, 0, SIZE, SIZE, INK.lightSquare, 0.4),
    ...middle,
    ...cells,
    ...pieces.map(([seat, spot]) => piece(...centre(spot), seat, 0.32)),
    ...extra,
  )
}

/** An arrow along spots of the board, stopping short of the last. */
function path(spots: readonly Spot[], stroke: string = INK.black, dashed = false): SVGElement {
  const points = spots.map(centre)
  const end = points[points.length - 1] ?? [0, 0]
  const before = points[points.length - 2] ?? end
  const length = Math.hypot(end[0] - before[0], end[1] - before[1])
  const short = (length - 0.3) / length
  return arrow(
    [
      ...points.slice(0, -1),
      [before[0] + (end[0] - before[0]) * short, before[1] + (end[1] - before[1]) * short],
    ],
    stroke,
    0.12,
    dashed,
  )
}

const RED = 0
const YELLOW = 1
const TEAL = 2
const VIOLET = 3
/** Where the die lies in the drawings: in the free space beside corner 0. */
const DIE_AT = 2.15

export const ludoGuide: GameGuide = {
  thumbnail: () =>
    board([
      [RED, yard(0, 0)],
      [RED, yard(0, 1)],
      [RED, track(6)],
      [RED, homeSquare(0, 3)],
      [YELLOW, yard(1, 0)],
      [YELLOW, track(14)],
      [YELLOW, track(23)],
      [YELLOW, yard(1, 3)],
      [TEAL, yard(2, 1)],
      [TEAL, yard(2, 2)],
      [TEAL, track(31)],
      [TEAL, track(36)],
      [VIOLET, yard(3, 0)],
      [VIOLET, yard(3, 1)],
      [VIOLET, yard(3, 2)],
      [VIOLET, track(2)],
    ]),
  rules: [
    {
      text: 'rulesLudo1',
      picture: () =>
        board(
          [
            [RED, yard(0, 0)],
            [RED, yard(0, 1)],
            [RED, yard(0, 3)],
            [RED, track(2)],
            [YELLOW, track(17)],
          ],
          path([2, 3, 4, 5, 6].map(track)),
          ring(...centre(track(6)), 0.47, INK.black),
          die(DIE_AT, DIE_AT, 4),
        ),
    },
    {
      text: 'rulesLudo2',
      picture: () =>
        board(
          [
            [RED, yard(0, 0)],
            [RED, yard(0, 1)],
            [RED, yard(0, 2)],
            [RED, yard(0, 3)],
          ],
          path([yard(0, 2), startOf(0)]),
          ring(...centre(startOf(0)), 0.47, INK.black),
          die(DIE_AT, DIE_AT, SIX),
        ),
    },
    {
      text: 'rulesLudo3',
      picture: () =>
        board(
          [
            [RED, yard(0, 0)],
            [RED, yard(0, 1)],
            [RED, track(5)],
            [YELLOW, track(8)],
            [YELLOW, yard(1, 1)],
          ],
          path([5, 6, 7, 8].map(track)),
          path([track(8), yard(1, 0)], colour(YELLOW), true),
          ring(...centre(yard(1, 0)), 0.47, INK.black),
          die(DIE_AT, DIE_AT, 3),
        ),
    },
    { text: 'rulesLudo4' },
    {
      text: 'rulesLudo5',
      picture: () =>
        board(
          [
            [RED, homeSquare(0, 3)],
            [RED, homeSquare(0, 2)],
            [RED, homeSquare(0, 1)],
            [RED, track(38)],
          ],
          path([track(38), track(39), homeSquare(0, 0)]),
          ring(...centre(homeSquare(0, 0)), 0.47, INK.black),
          die(DIE_AT, DIE_AT, 2),
        ),
    },
  ],
}
