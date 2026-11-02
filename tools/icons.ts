// Draws the Spielekiste's icon, a games box with a card and two pieces, and writes every file
// made from it: the Android app's adaptive icon (vector drawables), its PNGs for Android 7, and
// the website's icon. Run it with `pnpm icons` after changing a shape here.
//
// The drawing is on Android's adaptive icon grid of 108 by 108: launchers cut it to a circle,
// squircle or rounded square, and only the circle of 66 around the middle is always shown.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const res = join(root, 'android/app/src/main/res')

type Point = [number, number]

interface Shape {
  d: string
  color: string
  /**
   * How strongly the shape shows in the one-colour icon that Android 13 tints, from 0 to 1, or
   * null to leave it out. That icon has alpha only, and a shape drawn over another can only add
   * to it, so details inside a shape are left out.
   */
  mono: number | null
}

const BACKGROUND = '#1D2B3A'
const SQUARE = '#22354A'

const n = (v: number) => String(Math.round(v * 100) / 100)

function rotate([x, y]: Point, degrees: number, [px, py]: Point): Point {
  const a = (degrees * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c]
}

/** A rectangle with rounded corners, turned by `degrees` around `pivot`. */
function box(x: number, y: number, w: number, h: number, r: number, degrees = 0, pivot?: Point) {
  const p = pivot ?? [x + w / 2, y + h / 2]
  const at = (q: Point) => rotate(q, degrees, p)
  const arc = (q: Point) => `A${n(r)},${n(r)} 0 0 1 ${at(q).map(n).join(',')}`
  const line = (q: Point) => `L${at(q).map(n).join(',')}`
  return [
    `M${at([x + r, y])
      .map(n)
      .join(',')}`,
    line([x + w - r, y]),
    arc([x + w, y + r]),
    line([x + w, y + h - r]),
    arc([x + w - r, y + h]),
    line([x + r, y + h]),
    arc([x, y + h - r]),
    line([x, y + r]),
    arc([x + r, y]),
    'Z',
  ].join(' ')
}

function circle(cx: number, cy: number, r: number) {
  return `M${n(cx - r)},${n(cy)} A${n(r)},${n(r)} 0 1 1 ${n(cx + r)},${n(cy)} A${n(r)},${n(r)} 0 1 1 ${n(cx - r)},${n(cy)} Z`
}

function polygon(points: Point[], degrees = 0, pivot: Point = [0, 0]) {
  const [first, ...rest] = points.map((q) => rotate(q, degrees, pivot).map(n).join(','))
  return `M${first} ${rest.map((q) => `L${q}`).join(' ')} Z`
}

const CARD_TURN = -14
const CARD_PIVOT: Point = [45, 60]

// From back to front: the open lid, seen from inside, a card, a draughts piece and a pawn standing in the box, and
// the box's front, which hides their lower ends.
const shapes: Shape[] = [
  {
    d: polygon([
      [30, 58],
      [78, 58],
      [73, 29],
      [35, 29],
    ]),
    color: '#E09B4F',
    mono: 0.4,
  },
  {
    d: polygon([
      [34, 58],
      [74, 58],
      [70.2, 32.5],
      [37.8, 32.5],
    ]),
    color: '#A96A2C',
    mono: null,
  },
  { d: box(37, 32, 16, 23, 2.5, CARD_TURN, CARD_PIVOT), color: '#F1ECE2', mono: 0.75 },
  {
    d: polygon(
      [
        [45, 37.5],
        [49, 43.5],
        [45, 49.5],
        [41, 43.5],
      ],
      CARD_TURN,
      CARD_PIVOT,
    ),
    color: '#E5484D',
    mono: null,
  },
  { d: circle(57.5, 51, 8.5), color: '#E5484D', mono: 1 },
  { d: circle(57.5, 51, 5.5), color: '#B8363A', mono: null },
  { d: circle(57.5, 51, 4), color: '#E5484D', mono: null },
  {
    d: polygon([
      [63.5, 60],
      [76.5, 60],
      [72, 46],
      [68, 46],
    ]),
    color: '#F5C542',
    mono: 1,
  },
  { d: box(65.5, 44, 9, 3.5, 1.75), color: '#D9A92E', mono: null },
  { d: circle(70, 39.5, 5), color: '#F5C542', mono: 1 },
  { d: box(29, 56, 50, 7, 2.5), color: '#E09B4F', mono: 1 },
  { d: box(31, 61, 46, 20, 3.5), color: '#C8833B', mono: 1 },
  { d: box(33, 69.5, 42, 1.6, 0.8), color: '#A96A2C', mono: null },
  { d: box(50, 61, 8, 7, 1.5), color: '#7A4A1F', mono: null },
]

// A faint board of squares behind the box.
function squares() {
  const out: string[] = []
  for (let row = 0; row < 9; row++)
    for (let col = 0; col < 9; col++)
      if ((row + col) % 2 === 1) out.push(`M${col * 12},${row * 12} h12 v12 h-12 Z`)
  return out.join(' ')
}

const header = `<?xml version="1.0" encoding="utf-8"?>
<!-- Made by tools/icons.ts: change it there and run pnpm icons. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">`

const vectorPath = (d: string, color: string) => `
    <path
        android:fillColor="${color}"
        android:pathData="${d}" />`

function alpha(color: string, a: number) {
  const hex = Math.round(a * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()
  return `#${hex}${color.slice(1)}`
}

function write(path: string, text: string | Buffer) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
  console.log(path.slice(root.length + 1))
}

write(
  join(res, 'drawable/ic_launcher_foreground.xml'),
  `${header}${shapes.map((s) => vectorPath(s.d, s.color)).join('')}\n</vector>\n`,
)
write(
  join(res, 'drawable/ic_launcher_monochrome.xml'),
  `${header}${shapes
    .flatMap((s) => (s.mono === null ? [] : [vectorPath(s.d, alpha('#FFFFFF', s.mono))]))
    .join('')}\n</vector>\n`,
)
write(
  join(res, 'drawable/ic_launcher_background.xml'),
  `${header}${vectorPath('M0,0h108v108h-108z', BACKGROUND)}${vectorPath(squares(), SQUARE)}\n</vector>\n`,
)

// The same drawing as SVG, for the website and the PNGs.
function svg(clip: 'square' | 'round' | 'none', viewBox: string) {
  const inner = [
    `<path fill="${BACKGROUND}" d="M0,0h108v108h-108z"/>`,
    `<path fill="${SQUARE}" d="${squares()}"/>`,
    ...shapes.map((s) => `<path fill="${s.color}" d="${s.d}"/>`),
  ].join('\n    ')
  const mask =
    clip === 'round'
      ? '<clipPath id="c"><circle cx="54" cy="54" r="36"/></clipPath>'
      : clip === 'square'
        ? '<clipPath id="c"><rect x="18" y="18" width="72" height="72" rx="14"/></clipPath>'
        : ''
  const group = clip === 'none' ? '<g>' : '<g clip-path="url(#c)">'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
  <title>Spielekiste</title>
  ${mask}
  ${group}
    ${inner}
  </g>
</svg>
`
}

write(join(root, 'public/icon.svg'), svg('square', '18 18 72 72'))

// Android 7 has no adaptive icons and takes these instead.
const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  for (const [density, size] of Object.entries(densities)) {
    for (const [name, clip] of [
      ['ic_launcher', 'square'],
      ['ic_launcher_round', 'round'],
    ] as const) {
      await page.setViewportSize({ width: size, height: size })
      await page.setContent(
        `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg(clip, '18 18 72 72')}`,
      )
      const png = await page.screenshot({ omitBackground: true })
      write(join(res, `mipmap-${density}/${name}.png`), png)
    }
  }
} finally {
  await browser.close()
}
