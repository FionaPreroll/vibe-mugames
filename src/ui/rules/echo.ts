import { COLOURS } from '../../core/echo'
import { colour } from '../canvas'
import { arrow, INK, label, picture, rect, ring, svg } from './draw'
import type { GameGuide } from './guide'

/** A pad of four colours at (x, y), `lit` (if any) shining, the others dim. */
function pad(x: number, y: number, radius: number, lit: number | null): SVGElement {
  const inner = radius * 0.38
  const wedges = Array.from({ length: COLOURS }, (_, wedge) => {
    const middle = -Math.PI / 2 + (wedge * Math.PI) / 2
    const from = middle - Math.PI / 4 + 0.08
    const to = middle + Math.PI / 4 - 0.08
    const at = (angle: number, r: number) =>
      `${(x + Math.cos(angle) * r).toFixed(3)} ${(y + Math.sin(angle) * r).toFixed(3)}`
    const d = `M${at(from, radius)}A${radius} ${radius} 0 0 1 ${at(to, radius)}L${at(to - 0.08, inner)}A${inner} ${inner} 0 0 0 ${at(from + 0.08, inner)}Z`
    return svg('path', { d, fill: colour(wedge), opacity: lit === wedge ? 1 : 0.35 })
  })
  return svg('g', {}, ...wedges)
}

/** A row of colours, as dots from left to right. */
function row(x: number, y: number, colours: readonly number[]): SVGElement {
  return svg(
    'g',
    {},
    ...colours.map((c, i) => svg('circle', { cx: x + i * 0.9, cy: y, r: 0.32, fill: colour(c) })),
  )
}

export const echoGuide: GameGuide = {
  thumbnail: () => picture(8, 8, rect(0, 0, 8, 8, INK.night, 0.3), pad(4, 4, 3.4, 0)),
  rules: [
    {
      text: 'rulesEcho1',
      picture: () =>
        picture(10, 5, pad(2.5, 2.5, 2.3, 1), row(6, 1.6, [0, 1]), label(7.8, 3.6, '…', 1.2)),
    },
    {
      text: 'rulesEcho2',
      picture: () =>
        picture(
          10,
          5,
          pad(2.4, 2.5, 2.2, 0),
          ring(2.4, 0.9, 0.55, INK.text),
          pad(7.6, 2.5, 2.2, 0),
          ring(7.6, 0.9, 0.55, INK.text),
        ),
    },
    {
      text: 'rulesEcho3',
      picture: () =>
        picture(
          10,
          4,
          row(0.6, 1, [0, 1, 3]),
          arrow(
            [
              [3.6, 1],
              [5, 1],
            ],
            INK.text,
            0.12,
          ),
          row(5.8, 1, [0, 1, 3, 2]),
          label(8.5, 2.9, '+1', 0.9),
        ),
    },
  ],
}
