import { type Card, RANKS } from '../../core/miaumiau'
import { arrow, CARD_HEIGHT, CARD_WIDTH, card, INK, label, picture, rect, svg } from './draw'
import type { GameGuide } from './guide'

/** A card by suit (0 clubs, 1 spades, 2 hearts, 3 diamonds) and rank, 7 to the ace. */
const c = (suit: number, rank: '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'): Card =>
  suit * RANKS + ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'].indexOf(rank) + 5

const GAP = 0.3
const ROW = 3 * CARD_WIDTH + 2 * GAP

/** Three cards side by side, from (x, y), face up as Schwimmen shows them, or face down. */
function three(x: number, y: number, cards: readonly (Card | 'back')[], dim = -1): SVGElement[] {
  return cards.map((which, i) => card(x + i * (CARD_WIDTH + GAP), y, which, i === dim, false))
}

/** A row of coins: those still held filled, those lost as rings. */
function coins(x: number, y: number, held: number, lost: number): SVGElement[] {
  return Array.from({ length: held + lost }, (_, i) =>
    svg('circle', {
      cx: x + i * 0.75,
      cy: y,
      r: 0.28,
      fill: i < held ? INK.coin : 'none',
      stroke: INK.coin,
      'stroke-width': 0.08,
    }),
  )
}

export const schwimmenGuide: GameGuide = {
  thumbnail: () =>
    picture(
      ROW,
      ROW,
      rect(-0.1, -0.1, ROW + 0.2, ROW + 0.2, INK.felt, 0.3),
      ...three(0, 0.2, [c(2, 'K'), c(0, '8'), c(3, '10')]),
      ...three(0, 3.6, [c(2, 'A'), c(2, 'Q'), 'back']),
    ),
  rules: [
    {
      text: 'rulesSchwimmen1',
      picture: () =>
        picture(
          ROW,
          7.2,
          rect(-0.1, -0.1, ROW + 0.2, 7.4, INK.felt, 0.3),
          ...three(0, 0.2, [c(0, 'K'), c(3, '9'), c(1, 'A')]),
          ...three(0, 3.4, ['back', 'back', 'back']),
          ...coins(2.55, 6.7, 3, 0),
        ),
    },
    {
      text: 'rulesSchwimmen2',
      picture: () =>
        picture(
          ROW,
          7.8,
          ...three(0, 0, [c(2, 'A'), c(2, 'K'), c(0, '9')], 2),
          label(ROW / 2, CARD_HEIGHT + 0.85, '11 + 10 = 21', 0.7),
          ...three(0, 3.9, [c(0, '8'), c(1, '8'), c(3, '8')]),
          label(ROW / 2, 3.9 + CARD_HEIGHT + 0.85, '30½', 0.7),
        ),
    },
    {
      text: 'rulesSchwimmen3',
      picture: () =>
        picture(
          ROW,
          7.2,
          rect(-0.1, -0.1, ROW + 0.2, 7.4, INK.felt, 0.3),
          ...three(0, 0.2, [c(2, '10'), c(0, '7'), c(3, 'Q')]),
          ...three(0, 4.2, [c(2, 'A'), c(1, '8'), c(2, 'K')], 1),
          arrow([
            [CARD_WIDTH + GAP + 0.65, 4.1],
            [CARD_WIDTH + GAP + 0.65, 3.1],
          ]),
          arrow(
            [
              [CARD_WIDTH + GAP + 1.35, 3.1],
              [CARD_WIDTH + GAP + 1.35, 4.1],
            ],
            INK.text,
          ),
        ),
    },
    {
      text: 'rulesSchwimmen4',
      picture: () =>
        picture(
          ROW,
          4.2,
          ...three(0, 0, [c(3, 'A'), c(3, 'J'), c(3, '10')]),
          label(ROW / 2, CARD_HEIGHT + 1.1, '11 + 10 + 10 = 31!', 0.75, INK.accent),
        ),
    },
    {
      text: 'rulesSchwimmen5',
      picture: () =>
        picture(
          ROW,
          2.6,
          ...coins(0.5, 0.5, 2, 1),
          label(4.6, 0.75, '−1', 0.7),
          ...coins(0.5, 1.9, 0, 3),
          label(4.6, 2.15, '🏊', 0.8),
        ),
    },
  ],
}
