import { t } from '../../i18n'
import { colour } from '../canvas'
import { cross, INK, label, line, picture, rect, svg } from './draw'
import type { GameGuide } from './guide'

/** A word written by hand, left-aligned at (x, y), in ink on the paper. */
function written(x: number, y: number, text: string, size = 0.5, fill: string = INK.black) {
  const element = label(x, y, text, size, fill)
  element.setAttribute('text-anchor', 'start')
  element.setAttribute('font-weight', '500')
  element.setAttribute('font-style', 'italic')
  return element
}

/** The round's letter on its card. */
function letterCard(x: number, y: number, letter: string, size = 1.6): SVGElement {
  return svg(
    'g',
    {},
    rect(x, y, size, size, INK.accent, size * 0.18),
    label(x + size / 2, y + size * 0.74, letter, size * 0.7, INK.bg),
  )
}

/** A sheet of paper with columns: their headings, and a row of words below each. */
function sheet(
  width: number,
  columns: readonly string[],
  rows: readonly (readonly string[])[],
): SVGElement[] {
  const step = width / columns.length
  const height = 1 + rows.length * 0.8
  return [
    rect(0, 0, width, height, INK.paper, 0.2),
    ...columns.slice(1).map((_, i) =>
      line(
        [
          [step * (i + 1), 0.15],
          [step * (i + 1), height - 0.15],
        ],
        INK.paperEdge,
        0.05,
      ),
    ),
    line(
      [
        [0.15, 0.85],
        [width - 0.15, 0.85],
      ],
      INK.paperEdge,
      0.05,
    ),
    ...columns.map((name, i) => written(i * step + 0.2, 0.6, name, 0.4, INK.muted)),
    ...rows.flatMap((row, r) =>
      row.map((word, i) => written(i * step + 0.2, 1.55 + r * 0.8, word)),
    ),
  ]
}

export const stadtLandFlussGuide: GameGuide = {
  thumbnail: () =>
    picture(
      9,
      4.4,
      ...sheet(
        9,
        [t('catCity'), t('catCountry'), t('catRiver')],
        [
          ['Bonn', 'Belgien', 'Bode'],
          ['Berlin', 'Brasilien', ''],
        ],
      ).map((node) => {
        node.setAttribute('transform', 'translate(0 1.4)')
        return node
      }),
      letterCard(3.9, 0, 'B', 1.3),
    ),
  rules: [
    {
      // The letter, and a word for each category.
      text: 'rulesStadtlandfluss1',
      picture: () =>
        picture(
          11,
          3,
          letterCard(0, 0.2, 'K'),
          ...sheet(
            9,
            [t('catCity'), t('catCountry'), t('catRiver')],
            [['Köln', 'Kenia', 'Kocher']],
          ).map((node) => {
            node.setAttribute('transform', 'translate(2 0.6)')
            return node
          }),
        ),
    },
    {
      // Stop! and the seconds left.
      text: 'rulesStadtlandfluss2',
      picture: () =>
        picture(
          9,
          3,
          rect(0, 0.3, 4, 2.2, colour(0), 0.5),
          label(2, 1.75, `${t('wordsStop')}`, 0.9, INK.bg),
          svg('circle', {
            cx: 6.6,
            cy: 1.4,
            r: 1.2,
            fill: INK.panel,
            stroke: INK.text,
            'stroke-width': 0.1,
          }),
          label(6.6, 1.75, '0:10', 0.75),
        ),
    },
    {
      // An answer struck: no such city.
      text: 'rulesStadtlandfluss3',
      picture: () =>
        picture(
          9,
          3.2,
          rect(0, 0, 9, 3.2, INK.paper, 0.2),
          written(0.4, 1.1, 'Kassel'),
          label(7.8, 1.1, '10', 0.5, INK.black),
          written(0.4, 2.4, 'Kuckucksheim'),
          line(
            [
              [0.3, 2.25],
              [4.1, 2.25],
            ],
            colour(0),
            0.1,
          ),
          cross(5, 2.25, 0.5, colour(0), 0.12),
          label(7.8, 2.4, '0', 0.5, INK.black),
        ),
    },
    {
      // What answers count: alone, unique, shared.
      text: 'rulesStadtlandfluss4',
      picture: () =>
        picture(
          10,
          3,
          ...[
            ['Pferd', '', '20'],
            ['Panda', 'Pinguin', '10'],
            ['Puma', 'Puma', '5'],
          ].flatMap(([a = '', b = '', points = ''], i) => {
            const x = i * 3.4
            return [
              rect(x, 0, 3.1, 3, INK.paper, 0.2),
              written(x + 0.25, 0.9, a, 0.45),
              written(x + 0.25, 1.7, b, 0.45, INK.muted),
              label(x + 1.55, 2.7, points, 0.6, INK.accent),
            ]
          }),
        ),
    },
  ],
}
