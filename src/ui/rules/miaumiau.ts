import { type Card, EIGHT, JACK, RANKS, SEVEN } from '../../core/miaumiau'
import { suitSymbol } from '../cards'
import {
  arrow,
  CARD_HEIGHT,
  CARD_WIDTH,
  card,
  group,
  INK,
  label,
  picture,
  piece,
  rect,
  svg,
} from './draw'
import type { GameGuide } from './guide'

const CLUBS = 0
const SPADES = 1
const HEARTS = 2
const DIAMONDS = 3
const NINE = 7
const TEN = 8
const KING = 11

const of = (suit: number, rank: number): Card => suit * RANKS + rank

/** The space between two cards side by side. */
const GAP = 0.3

export const miauMiauGuide: GameGuide = {
  thumbnail: () =>
    picture(
      9.4,
      4.4,
      card(0, 0.8, 'back'),
      card(2.3, 0.8, of(HEARTS, NINE)),
      // The hand, fanned out from below.
      group(7, 4.6, -22, card(-1, -3.4, of(SPADES, NINE))),
      group(7, 4.6, 0, card(-1, -3.6, of(HEARTS, KING))),
      group(7, 4.6, 22, card(-1, -3.4, of(CLUBS, JACK))),
    ),
  rules: [
    {
      // The pile's nine of hearts: the king of hearts and the nine of spades fit, the ten of
      // clubs does not.
      text: 'rulesMiaumiau1',
      picture: () =>
        picture(
          4 * CARD_WIDTH + 1 + 2 * GAP,
          CARD_HEIGHT,
          card(0, 0, of(HEARTS, NINE)),
          card(CARD_WIDTH + 1, 0, of(HEARTS, KING)),
          card(2 * CARD_WIDTH + 1 + GAP, 0, of(SPADES, NINE)),
          card(3 * CARD_WIDTH + 1 + 2 * GAP, 0, of(CLUBS, TEN), true),
        ),
    },
    {
      text: 'rulesMiaumiau2',
      picture: () =>
        picture(
          2 * CARD_WIDTH + 2,
          CARD_HEIGHT,
          card(0, 0, 'back'),
          arrow([
            [CARD_WIDTH + 0.3, CARD_HEIGHT / 2],
            [CARD_WIDTH + 1.7, CARD_HEIGHT / 2],
          ]),
          card(CARD_WIDTH + 2, 0, of(DIAMONDS, NINE)),
        ),
    },
    {
      text: 'rulesMiaumiau3',
      picture: () =>
        picture(
          2 * CARD_WIDTH + 1.6,
          CARD_HEIGHT + 1,
          card(0, 0, of(CLUBS, SEVEN)),
          arrow([
            [CARD_WIDTH + 0.25, CARD_HEIGHT / 2],
            [CARD_WIDTH + 1.35, CARD_HEIGHT / 2],
          ]),
          card(CARD_WIDTH + 1.6, 0, of(DIAMONDS, SEVEN)),
          label(CARD_WIDTH / 2, CARD_HEIGHT + 0.85, '+2', 0.8, INK.accent),
          label(CARD_WIDTH * 1.5 + 1.6, CARD_HEIGHT + 0.85, '+4', 0.8, INK.accent),
        ),
    },
    {
      // The eight, and the player after its player missing their turn.
      text: 'rulesMiaumiau4',
      picture: () =>
        picture(
          CARD_WIDTH + 5.6,
          CARD_HEIGHT,
          card(0, 0, of(SPADES, EIGHT)),
          piece(CARD_WIDTH + 1, 1.9, 0, 0.45),
          svg('g', { opacity: 0.35 }, piece(CARD_WIDTH + 2.8, 1.9, 1, 0.45)),
          piece(CARD_WIDTH + 4.6, 1.9, 2, 0.45),
          arrow(
            [
              [CARD_WIDTH + 1.2, 1.3],
              [CARD_WIDTH + 2.8, 0.35],
              [CARD_WIDTH + 4.4, 1.25],
            ],
            INK.accent,
            0.12,
            true,
          ),
        ),
    },
    {
      // A jack on the nine of hearts, wishing for diamonds.
      text: 'rulesMiaumiau5',
      picture: () =>
        picture(
          CARD_WIDTH + 4.6,
          CARD_HEIGHT + 0.4,
          card(0, 0.4, of(HEARTS, NINE)),
          group(0.9, 0, 12, card(0, 0, of(CLUBS, JACK))),
          rect(CARD_WIDTH + 2, 0.5, 2.2, 1.8, INK.paper, 0.5),
          label(CARD_WIDTH + 3.1, 1.85, suitSymbol(DIAMONDS), 1.3, INK.red),
        ),
    },
    { text: 'rulesMiaumiau6' },
  ],
}
