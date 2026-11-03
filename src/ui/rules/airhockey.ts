import { GOAL_WIDTH, LENGTH, WIDTH } from '../../core/airhockey'
import { colour } from '../canvas'
import { arrow, group, INK, picture, rect, svg } from './draw'
import type { GameGuide } from './guide'

/** The rink lies across in the drawings: seat 0's goal on the left, seat 1's on the right. */
const SCALE = 5
const LONG = LENGTH * SCALE
const WIDE = WIDTH * SCALE
const GOAL = GOAL_WIDTH * SCALE

function mallet(x: number, y: number, seat: number): SVGElement {
  return svg(
    'g',
    {},
    svg('circle', { cx: x, cy: y, r: 0.55, fill: colour(seat) }),
    svg('circle', { cx: x, cy: y, r: 0.25, fill: 'rgb(0 0 0 / 0.3)' }),
  )
}

function puck(x: number, y: number): SVGElement {
  return svg('circle', { cx: x, cy: y, r: 0.32, fill: INK.text })
}

/** The rink's markings: the middle line and circle, and the goals at either end. */
function rink(...children: SVGElement[]): SVGGElement {
  const middle = LONG / 2
  return svg(
    'g',
    {},
    rect(0, 0, LONG, WIDE, INK.rink, 0.4),
    svg('path', {
      d: `M${middle} 0V${WIDE}`,
      stroke: 'rgb(255 255 255 / 0.25)',
      'stroke-width': 0.08,
    }),
    svg('circle', {
      cx: middle,
      cy: WIDE / 2,
      r: 0.9,
      fill: 'none',
      stroke: 'rgb(255 255 255 / 0.25)',
      'stroke-width': 0.08,
    }),
    rect(-0.12, (WIDE - GOAL) / 2, 0.3, GOAL, colour(0), 0.1),
    rect(LONG - 0.18, (WIDE - GOAL) / 2, 0.3, GOAL, colour(1), 0.1),
    ...children,
  )
}

/**
 * Two phones lying on the table, top edge to top edge, under the rink: their bodies, and the
 * edges between their screens, with each phone's earpiece at its top edge.
 */
function phones(): SVGElement {
  return rect(-0.4, -0.4, LONG + 0.8, WIDE + 0.8, '#0b0f14', 0.6)
}

function seam(): SVGElement {
  const middle = LONG / 2
  return svg(
    'g',
    {},
    rect(middle - 0.35, -0.4, 0.7, WIDE + 0.8, '#0b0f14'),
    svg('path', { d: `M${middle} -0.4V${WIDE + 0.4}`, stroke: '#3a4552', 'stroke-width': 0.06 }),
    rect(middle - 0.25, WIDE / 2 - 0.6, 0.12, 1.2, '#2c3540', 0.06),
    rect(middle + 0.13, WIDE / 2 - 0.6, 0.12, 1.2, '#2c3540', 0.06),
  )
}

export const airHockeyGuide: GameGuide = {
  thumbnail: () =>
    picture(LONG, WIDE, rink(mallet(2.2, 2.2, 0), mallet(12.4, 3.1, 1), puck(9.5, 1.6))),
  rules: [
    {
      text: 'rulesAirhockey1',
      picture: () =>
        picture(
          LONG + 0.8,
          WIDE + 0.8,
          group(
            0.4,
            0.4,
            0,
            phones(),
            rink(mallet(2, 2.5, 0), mallet(13, 2.5, 1)),
            seam(),
            puck(LONG / 2 + 1.2, 1.8),
          ),
        ),
    },
    {
      text: 'rulesAirhockey2',
      picture: () =>
        picture(
          LONG,
          WIDE,
          rink(
            mallet(3, 3.2, 0),
            puck(4.2, 2.8),
            arrow(
              [
                [4.6, 2.6],
                [9.5, 0.45],
                [14.4, 2.5],
              ],
              INK.text,
              0.12,
              true,
            ),
          ),
        ),
    },
    { text: 'rulesAirhockey3' },
  ],
}
