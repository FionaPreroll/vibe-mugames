import { colour } from '../canvas'
import { arrow, cross, die, INK, label, picture, rect, svg } from './draw'
import type { GameGuide } from './guide'

/** The cup the dice are rolled under, its rim at (x, y), `lifted` tilted off the dice. */
function cup(x: number, y: number, lifted = false): SVGElement {
  const shape = svg('path', {
    d: `M${x - 1.9} ${y}L${x - 1.3} ${y - 3}H${x + 1.3}L${x + 1.9} ${y}Z`,
    fill: '#6d3b1f',
    stroke: INK.woodDark,
    'stroke-width': 0.1,
    'stroke-linejoin': 'round',
  })
  const rim = rect(x - 2, y - 0.35, 4, 0.4, '#8a4b27', 0.15)
  const whole = svg('g', {}, shape, rim)
  if (lifted) whole.setAttribute('transform', `rotate(28 ${x + 2} ${y}) translate(1 -0.8)`)
  return whole
}

/** What a player says, in a bubble: a throw, such as 53. */
function bubble(x: number, y: number, text: string, width = 2.4): SVGElement {
  return svg(
    'g',
    {},
    rect(x, y, width, 1.5, INK.paper, 0.5),
    svg('polygon', {
      points: `${x + 0.5},${y + 1.4} ${x + 0.4},${y + 2} ${x + 1.1},${y + 1.4}`,
      fill: INK.paper,
    }),
    label(x + width / 2, y + 1.1, text, 0.9, INK.black),
  )
}

/** A life: a heart, crossed out once lost. */
function life(x: number, y: number, lost = false): SVGElement {
  return svg(
    'g',
    {},
    label(x, y, '♥', 1.2, lost ? INK.muted : colour(0)),
    lost ? cross(x, y - 0.4, 0.8, INK.text, 0.12) : null,
  )
}

export const maexchenGuide: GameGuide = {
  thumbnail: () =>
    picture(
      9,
      5.2,
      life(1.2, 1.1),
      life(2.4, 1.1),
      life(3.6, 1.1, true),
      cup(2.4, 5),
      die(4.8, 3, 5, 1.8),
      die(6.9, 3.2, 3, 1.8),
    ),
  rules: [
    {
      // A five and a three are said as 53.
      text: 'rulesMaexchen1',
      picture: () =>
        picture(
          8,
          2.4,
          die(0, 0.2, 3, 2),
          die(2.4, 0.2, 5, 2),
          arrow([
            [4.7, 1.2],
            [5.6, 1.2],
          ]),
          label(7, 1.75, '53', 1.4, INK.text),
        ),
    },
    {
      text: 'rulesMaexchen2',
      picture: () =>
        picture(
          9.4,
          3.2,
          cup(2, 3.1),
          bubble(0.2, -0.1, '53'),
          arrow([
            [4.25, 1.6],
            [5.15, 1.6],
          ]),
          cup(7.4, 3.1),
          bubble(6, -0.1, '61'),
        ),
    },
    {
      // The throws from the lowest to the highest.
      text: 'rulesMaexchen3',
      picture: () => {
        const throws = ['31', '32', '…', '65', '11', '…', '66', '21']
        return picture(
          throws.length * 1.6,
          3.2,
          ...throws.map((value, i) =>
            svg(
              'g',
              {},
              value === '…'
                ? null
                : rect(
                    i * 1.6 + 0.1,
                    3.1 - 0.55 - i * 0.25,
                    1.4,
                    0.55 + i * 0.25,
                    value === '21' ? colour(1) : i >= 4 ? INK.accent : INK.muted,
                    0.15,
                  ),
              label(i * 1.6 + 0.8, 3.1 - 0.75 - i * 0.25, value, 0.6, INK.text),
            ),
          ),
        )
      },
    },
    {
      // "53" was said, the cup is lifted: 42 is less, and the one who said it loses a life.
      text: 'rulesMaexchen4',
      picture: () =>
        picture(
          9,
          4.4,
          bubble(0, 0, '53'),
          life(1.2, 4.1, true),
          cup(4.9, 4.3, true),
          die(3.2, 2.6, 4, 1.6),
          die(5.1, 2.6, 2, 1.6),
        ),
    },
    {
      text: 'rulesMaexchen5',
      picture: () =>
        picture(
          9,
          3,
          die(0, 0.6, 2, 2),
          die(2.3, 0.6, 1, 2),
          life(5.6, 2.3),
          life(6.9, 2.3, true),
          life(8.2, 2.3, true),
        ),
    },
  ],
}
