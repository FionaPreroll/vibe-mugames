import { currentLanguage } from '../../i18n'
import { colour } from '../canvas'
import { INK, label, picture, rect, svg } from './draw'
import type { GameGuide } from './guide'

/** Words for the drawings, in the player's language. */
const say = (de: string, en: string) => (currentLanguage() === 'de' ? de : en)

/** A player at (x, y), with a note on their forehead that says `word`. */
function head(x: number, y: number, seat: number, word: string, mine = false): SVGElement {
  return svg(
    'g',
    {},
    svg('circle', { cx: x, cy: y + 1.6, r: 0.9, fill: colour(seat) }),
    rect(x - 1.25, y, 2.5, 1, mine ? INK.panel : INK.paper, 0.15),
    label(x, y + 0.72, word, mine ? 0.7 : 0.45, mine ? INK.accent : INK.black),
  )
}

/** A question in a bubble, at (x, y). */
function bubble(x: number, y: number, width: number, text: string): SVGElement {
  return svg(
    'g',
    {},
    rect(x, y, width, 1.2, INK.panel, 0.4),
    label(x + width / 2, y + 0.82, text, 0.5),
  )
}

/** An answer, as its button. */
function answer(x: number, y: number, text: string, on = false): SVGElement {
  return svg(
    'g',
    {},
    rect(x, y, 2.4, 0.95, on ? INK.accent : INK.panel, 0.3),
    label(x + 1.2, y + 0.66, text, 0.45, on ? INK.bg : INK.text),
  )
}

export const werbinichGuide: GameGuide = {
  thumbnail: () =>
    picture(
      9,
      4.4,
      head(1.6, 0.3, 0, '?', true),
      head(4.5, 0.3, 1, say('Hexe', 'witch')),
      head(7.4, 0.3, 2, say('Pirat', 'pirate')),
      label(4.5, 4.1, '❓', 0.9),
    ),
  rules: [
    {
      // Everyone sees the others' words, not their own.
      text: 'rulesWerbinich1',
      picture: () =>
        picture(
          10,
          3.2,
          head(1.7, 0.2, 0, '?', true),
          head(5, 0.2, 1, say('Pinguin', 'penguin')),
          head(8.3, 0.2, 2, say('Ritter', 'knight')),
        ),
    },
    {
      // A question, and the answers.
      text: 'rulesWerbinich2',
      picture: () =>
        picture(
          10,
          2.6,
          bubble(1.5, 0.1, 7, say('Kann ich fliegen?', 'Can I fly?')),
          answer(0.9, 1.6, say('Ja', 'Yes'), true),
          answer(3.8, 1.6, say('Nein', 'No')),
          answer(6.7, 1.6, say('Weiß nicht', 'Not sure')),
        ),
    },
    {
      // A guess.
      text: 'rulesWerbinich3',
      picture: () =>
        picture(
          10,
          3.2,
          head(1.7, 0.2, 0, say('Eule', 'owl'), true),
          bubble(3.4, 0.6, 5.4, say('Bin ich eine Eule?', 'Am I an owl?')),
          label(9.4, 1.5, '✓', 0.9, INK.accent),
        ),
    },
    { text: 'rulesWerbinich4' },
  ],
}
