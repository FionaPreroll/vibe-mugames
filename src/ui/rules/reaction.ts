import { colour } from '../canvas'
import { arrow, cross, INK, label, picture, rect, svg } from './draw'
import type { GameGuide } from './guide'

/** A phone of `width` by `height` at (x, y), its screen lit as `screen`. */
function phone(x: number, y: number, screen: string, ...children: (SVGElement | null)[]) {
  return svg(
    'g',
    {},
    rect(x, y, 3.4, 5.6, INK.panel, 0.45),
    rect(x + 0.25, y + 0.45, 2.9, 4.7, screen, 0.15),
    ...children,
  )
}

/** A finger's tap: rings round where it touches. */
function tap(x: number, y: number): SVGElement {
  return svg(
    'g',
    { fill: 'none', stroke: INK.text, 'stroke-width': 0.12 },
    svg('circle', { cx: x, cy: y, r: 0.35 }),
    svg('circle', { cx: x, cy: y, r: 0.7, opacity: 0.5 }),
  )
}

export const reactionGuide: GameGuide = {
  thumbnail: () =>
    picture(
      10,
      7,
      rect(0, 0, 10, 7, INK.night, 0.3),
      rect(1.5, 1, 7, 5, INK.signal, 0.4),
      label(5, 4.4, '!', 3, INK.night),
      tap(7.2, 4.8),
    ),
  rules: [
    {
      text: 'rulesReaction1',
      picture: () =>
        picture(
          10,
          6,
          phone(0.3, 0.2, INK.night, label(2, 3.3, '…', 1.2)),
          arrow(
            [
              [4, 3],
              [6, 3],
            ],
            INK.text,
            0.16,
          ),
          phone(6.3, 0.2, INK.signal, label(8, 3.6, '!', 2.2, INK.night), tap(8, 4.2)),
        ),
    },
    {
      text: 'rulesReaction2',
      picture: () =>
        picture(
          10,
          6,
          phone(3.3, 0.2, INK.poor, label(5, 3.3, '…', 1.2, INK.night), tap(5, 4.2)),
          cross(8, 1.6, 1.2, INK.poor, 0.3),
        ),
    },
    {
      text: 'rulesReaction3',
      picture: () =>
        picture(
          10,
          6.4,
          phone(0.3, 0.2, INK.signal, label(2, 3.2, '231', 1, INK.night)),
          phone(6.3, 0.2, INK.signal, label(8, 3.2, '305', 1, INK.night)),
          label(2, 6.4, '+1', 0.9, colour(0)),
          label(5, 3.3, 'ms', 0.7, INK.muted),
        ),
    },
  ],
}
