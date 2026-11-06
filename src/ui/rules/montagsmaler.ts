import { currentLanguage } from '../../i18n'
import { colour } from '../canvas'
import { INK, label, line, picture, rect, svg } from './draw'
import type { GameGuide } from './guide'

/** Words for the drawings, in the player's language. */
const say = (de: string, en: string) => (currentLanguage() === 'de' ? de : en)

/** A sheet of paper. */
const paper = (x: number, y: number, width: number, height: number) =>
  rect(x, y, width, height, INK.paper, 0.25)

/** A house with the sun beside it, drawn by hand on the paper at (x, y). */
function sketch(x: number, y: number, size: number): SVGElement {
  const at = (px: number, py: number) => [x + px * size, y + py * size] as const
  const width = size * 0.06
  return svg(
    'g',
    {},
    line(
      [at(0.15, 0.9), at(0.15, 0.5), at(0.4, 0.25), at(0.65, 0.5), at(0.65, 0.9), at(0.15, 0.9)],
      INK.black,
      width,
    ),
    line([at(0.33, 0.9), at(0.33, 0.68), at(0.47, 0.68), at(0.47, 0.9)], colour(0), width),
    svg('circle', {
      cx: x + 0.84 * size,
      cy: y + 0.2 * size,
      r: 0.1 * size,
      fill: 'none',
      stroke: colour(1),
      'stroke-width': width,
    }),
  )
}

export const montagsmalerGuide: GameGuide = {
  thumbnail: () =>
    picture(9, 4.4, paper(0.5, 0, 8, 4.4), sketch(2.2, 0.2, 4), label(7.6, 3.9, '✏️', 1.1)),
  rules: [
    {
      // Three words to choose from.
      text: 'rulesMontagsmaler1',
      picture: () =>
        picture(
          10,
          2.4,
          ...[say('Haus', 'house'), say('Wal', 'whale'), say('Kerze', 'candle')].flatMap(
            (word, i) => [
              rect(i * 3.4, 0.2, 3.1, 2, i === 0 ? INK.accent : INK.panel, 0.3),
              label(i * 3.4 + 1.55, 1.4, word, 0.55, i === 0 ? INK.bg : INK.text),
            ],
          ),
        ),
    },
    {
      // The drawing grows, and a letter shows.
      text: 'rulesMontagsmaler2',
      picture: () =>
        picture(
          10,
          4,
          paper(0, 0, 4, 4),
          sketch(0.1, 0.2, 3.7),
          label(7.2, 2.3, say('_ a _ _', 'h _ _ _ _'), 0.8),
        ),
    },
    {
      // Points: 3, 2, 1, and the one drawing.
      text: 'rulesMontagsmaler3',
      picture: () =>
        picture(
          10,
          3,
          ...[3, 2, 1].flatMap((points, i) => [
            svg('circle', { cx: 1.2 + i * 2.6, cy: 1.2, r: 0.7, fill: colour(i + 2) }),
            label(1.2 + i * 2.6, 2.75, `+${points}`, 0.6),
          ]),
          label(9, 1.6, '✏️', 1),
          label(9, 2.75, '+1', 0.6),
        ),
    },
    { text: 'rulesMontagsmaler4' },
  ],
}
