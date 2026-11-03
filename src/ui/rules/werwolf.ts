import { t } from '../../i18n'
import { colour } from '../canvas'
import { arrow, cross, INK, label, line, picture, piece, rect, svg } from './draw'
import type { GameGuide } from './guide'

/** The roles' marks, as the game shows them. */
const ICONS = { wolf: '🐺', seer: '🔮', healer: '🌿', villager: '🏠' } as const

/** A role's card: its mark, and its name below it. */
function roleCard(x: number, icon: string, name: string): SVGElement {
  return svg(
    'g',
    {},
    rect(x, 0, 2.6, 3.2, INK.panel, 0.25),
    label(x + 1.3, 1.85, icon, 1.4),
    label(x + 1.3, 2.8, name, 0.42, INK.text),
  )
}

/** The moon, a crescent, for the night. */
function moon(x: number, y: number, r: number): SVGElement {
  return svg('path', {
    d: `M${x} ${y - r}A${r} ${r} 0 1 0 ${x} ${y + r}A${r * 0.75} ${r} 0 1 1 ${x} ${y - r}Z`,
    fill: '#f3e6b0',
  })
}

/** The sun, for the day. */
function sun(x: number, y: number, r: number): SVGElement {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * Math.PI) / 4
    return line(
      [
        [x + Math.cos(angle) * r * 1.35, y + Math.sin(angle) * r * 1.35],
        [x + Math.cos(angle) * r * 1.8, y + Math.sin(angle) * r * 1.8],
      ],
      colour(1),
      0.14,
    )
  })
  return svg('g', {}, svg('circle', { cx: x, cy: y, r, fill: colour(1) }), ...rays)
}

export const werwolfGuide: GameGuide = {
  thumbnail: () =>
    picture(
      9,
      4.4,
      rect(0, 0, 9, 4.4, '#14233a', 0.4),
      moon(7.3, 1.2, 0.75),
      ...[
        [0.6, 0.6],
        [2.2, 1.1],
        [4.4, 0.5],
        [5.6, 1.4],
      ].map(([x = 0, y = 0]) => svg('circle', { cx: x, cy: y, r: 0.07, fill: INK.text })),
      label(1.6, 3.6, ICONS.villager, 1.3),
      label(3.4, 3.8, ICONS.villager, 1.3),
      label(5.4, 3.7, ICONS.wolf, 1.6),
      label(7.5, 3.6, ICONS.villager, 1.3),
    ),
  rules: [
    {
      text: 'rulesWerwolf1',
      picture: () =>
        picture(
          11.2,
          3.2,
          roleCard(0, ICONS.wolf, t('roleWolf')),
          roleCard(2.85, ICONS.seer, t('roleSeer')),
          roleCard(5.7, ICONS.healer, t('roleHealer')),
          roleCard(8.55, ICONS.villager, t('roleVillager')),
        ),
    },
    {
      // At night: the wolf goes for a house, which the healer protects.
      text: 'rulesWerwolf2',
      picture: () =>
        picture(
          10,
          4,
          rect(0, 0, 10, 4, '#14233a', 0.4),
          moon(8.8, 0.9, 0.55),
          label(1.4, 2.9, ICONS.wolf, 1.6),
          arrow(
            [
              [2.6, 2.4],
              [5.2, 2.4],
            ],
            colour(0),
            0.14,
          ),
          label(6.4, 2.9, ICONS.villager, 1.6),
          svg('circle', {
            cx: 6.4,
            cy: 2.35,
            r: 1.15,
            fill: 'none',
            stroke: INK.accent,
            'stroke-width': 0.12,
            'stroke-dasharray': '0.3 0.15',
          }),
          label(8.4, 3.3, ICONS.healer, 1),
        ),
    },
    {
      // By day: the votes, and the player with the most of them banished.
      text: 'rulesWerwolf3',
      picture: () =>
        picture(
          10,
          4,
          sun(1, 1, 0.5),
          ...[0, 1, 2, 3, 4].flatMap((seat) => {
            const x = 3 + seat * 1.6
            const votes = seat === 2 ? 3 : seat === 4 ? 1 : 0
            return [
              piece(x, 3.2, seat, 0.5),
              ...Array.from({ length: votes }, (_, vote) =>
                svg('circle', { cx: x - 0.4 + vote * 0.4, cy: 2.2, r: 0.14, fill: INK.text }),
              ),
              seat === 2 ? cross(x, 3.2, 0.8, INK.text, 0.16) : null,
            ]
          }),
        ),
    },
    { text: 'rulesWerwolf4' },
  ],
}
