import { type TextKey, t } from '../i18n'
import { settings, updateSettings } from '../storage'
import { LIGHT_THEMES, resolveTheme, THEME_CHOICES, type Theme, type ThemeChoice } from '../theme'
import { forgetThemeColours } from './canvas'
import { h } from './dom'

/** Each theme's name, for the settings. */
const NAMES: Record<ThemeChoice, TextKey> = {
  classic: 'themeClassic',
  light: 'themeLight',
  black: 'themeBlack',
  amoled: 'themeAmoled',
  wood: 'themeWood',
  felt: 'themeFelt',
  nord: 'themeNord',
  gruvbox: 'themeGruvbox',
  neon: 'themeNeon',
  contrast: 'themeContrast',
  nightred: 'themeNightRed',
  halloween: 'themeHalloween',
  winter: 'themeWinter',
  christmas: 'themeChristmas',
  newyear: 'themeNewYear',
  seasons: 'themeSeasons',
}

export const themeName = (choice: ThemeChoice): string => t(NAMES[choice])

/**
 * Puts a theme on the page: its colours (on <html data-theme>), the colour of the browser's bar,
 * and the decorations of a seasonal theme behind the screens.
 */
export function applyTheme(choice: ThemeChoice, now = new Date()): Theme {
  const theme = resolveTheme(choice, now)
  const root = document.documentElement
  if (theme === 'classic') delete root.dataset.theme
  else root.dataset.theme = theme
  forgetThemeColours()
  const background = getComputedStyle(root).getPropertyValue('--bg').trim()
  const bar = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (bar && background) bar.content = background
  root.style.colorScheme = LIGHT_THEMES.includes(theme) ? 'light' : 'dark'
  decorate(theme)
  return theme
}

/** The settings' picker: every theme as a small picture of itself, applied at once. */
export function themeSettings(): HTMLElement {
  const now = new Date()
  const chosen = settings().theme
  const options = THEME_CHOICES.map((choice) => {
    const input = h('input', {
      type: 'radio',
      name: 'theme',
      value: choice,
      checked: choice === chosen,
    })
    input.addEventListener('change', () => {
      if (!input.checked) return
      updateSettings({ theme: choice })
      applyTheme(choice)
    })
    const shown = resolveTheme(choice, now)
    const swatch = h(
      'span',
      { class: 'swatch', ariaHidden: 'true' },
      h('span', { class: 'swatch-bar' }, h('span', { class: 'swatch-accent' })),
      h(
        'span',
        { class: 'swatch-seats' },
        ...[0, 1, 2, 3].map((seat) => h('span', { class: `swatch-seat seat-${seat}` })),
      ),
    )
    if (shown !== 'classic') swatch.dataset.theme = shown
    return h(
      'label',
      { class: `theme-option${choice === 'seasons' ? ' seasons' : ''}` },
      input,
      swatch,
      h(
        'span',
        { class: 'theme-name' },
        themeName(choice),
        choice === 'seasons' &&
          h('span', { class: 'muted' }, t('themeNow', { theme: themeName(shown) })),
      ),
    )
  })
  return h(
    'section',
    { class: 'theme-settings' },
    h('div', { class: 'themes', role: 'radiogroup', ariaLabel: t('themeTitle') }, ...options),
    h('p', { class: 'muted' }, t('themeNote')),
  )
}

/**
 * The seasonal decorations, behind every screen: bats round the moon at Halloween, snow in winter,
 * fairy lights at Christmas and fireworks at New Year, in the spirit of the puzzles' own. They hold
 * still for players who ask for less motion (src/themes.css).
 */
function decorate(theme: Theme): void {
  document.querySelector('.decor')?.remove()
  const make = DECORATIONS[theme]
  if (!make) return
  const layer = h('div', { class: `decor decor-${theme}` }, ...make())
  layer.setAttribute('aria-hidden', 'true')
  document.body.prepend(layer)
}

const NS = 'http://www.w3.org/2000/svg'

function svg(tag: string, attributes: Record<string, string | number>, ...children: Element[]) {
  const element = document.createElementNS(NS, tag)
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value))
  element.append(...children)
  return element
}

/** A bat, from the puzzles' Halloween. */
const BAT =
  'M44 16 L46 8 L48 14 L52 14 L54 8 L56 16 C62 10 78 6 98 12 C90 16 86 22 86 30 C82 26 76 26 72 30 C68 26 62 27 60 32 C57 30 54 32 52 38 L50 42 L48 38 C46 32 43 30 40 32 C38 27 32 26 28 30 C24 26 18 26 14 30 C14 22 10 16 2 12 C22 6 38 10 44 16 Z'

/** Spans placed by CSS variables, for snow, stars and confetti. */
function bits(className: string, count: number, place: (i: number) => Record<string, string>) {
  return Array.from({ length: count }, (_, i) => {
    const bit = h('span', { class: className })
    for (const [name, value] of Object.entries(place(i))) bit.style.setProperty(name, value)
    return bit
  })
}

const DECORATIONS: Partial<Record<Theme, () => Element[]>> = {
  halloween: () => [
    svg(
      'svg',
      { class: 'moon', viewBox: '0 0 132 132' },
      svg('circle', { cx: 66, cy: 66, r: 58, fill: '#f4ecd8' }),
      svg('circle', { cx: 46, cy: 50, r: 10, fill: '#e3d8bd' }),
      svg('circle', { cx: 82, cy: 84, r: 14, fill: '#e6dbc2' }),
      svg('circle', { cx: 86, cy: 40, r: 6, fill: '#e3d8bd' }),
      svg('circle', { cx: 40, cy: 88, r: 5, fill: '#e6dbc2' }),
    ),
    ...[0, 1, 2].map((i) =>
      svg(
        'svg',
        { class: `bat bat-${i}`, viewBox: '0 0 100 44' },
        svg('path', { class: 'wings', d: BAT }),
      ),
    ),
    svg(
      'svg',
      { class: 'cobweb', viewBox: '0 0 100 100' },
      svg('path', {
        d: 'M0 0L100 30M0 0L70 70M0 0L30 100M0 18Q14 14 18 0M0 40Q30 30 40 0M0 64Q48 48 64 0M0 90Q66 66 90 0',
      }),
    ),
    ...bits('star', 14, (i) => ({
      '--x': `${(i * 37 + 7) % 100}%`,
      '--y': `${(i * 23 + 5) % 30}%`,
      '--d': `${-((i * 0.9) % 3.5)}s`,
    })),
  ],
  winter: () =>
    bits('flake', 36, (i) => ({
      '--x': `${(i * 37 + 11) % 100}%`,
      '--s': `${[4, 6, 5, 8, 3, 7][i % 6]}px`,
      '--d': `${-((i * 1.7) % 14)}s`,
      '--t': `${11 + ((i * 3) % 8)}s`,
      '--dx': `${((i * 29) % 41) - 20}px`,
      '--o': `${[0.9, 0.6, 0.8, 0.5, 0.7][i % 5]}`,
    })),
  christmas: () => {
    const colours = ['#e0362c', '#f5c451', '#2f9e5b', '#4f8fe8']
    const bulbs = Array.from({ length: 70 }, (_, i) => ({
      x: i * 38 + 19,
      colour: colours[i % colours.length] ?? '#f5c451',
      delay: `${-((i * 0.7) % 2.4)}s`,
    }))
    return [
      svg(
        'svg',
        { class: 'lights' },
        svg('path', {
          class: 'wire',
          d: bulbs.map((b) => `M${b.x - 19} 1 Q${b.x} 9 ${b.x + 19} 1`).join(' '),
        }),
        ...bulbs.map((b) => {
          const bulb = svg(
            'g',
            { class: 'bulb', fill: b.colour },
            svg('circle', { class: 'halo', cx: b.x, cy: 12, r: 8 }),
            svg('ellipse', { cx: b.x, cy: 12, rx: 3.2, ry: 4.8 }),
          )
          bulb.style.setProperty('--d', b.delay)
          return svg(
            'g',
            {},
            svg('rect', { class: 'socket', x: b.x - 1.8, y: 4, width: 3.6, height: 3.4, rx: 0.8 }),
            bulb,
          )
        }),
      ),
      ...bits('flake', 16, (i) => ({
        '--x': `${(i * 41 + 5) % 100}%`,
        '--s': `${[3, 5, 4, 6][i % 4]}px`,
        '--d': `${-((i * 2.3) % 16)}s`,
        '--t': `${14 + ((i * 5) % 8)}s`,
        '--dx': `${((i * 17) % 31) - 15}px`,
        '--o': '0.5',
      })),
    ]
  },
  newyear: () => [
    ...[0, 1, 2, 3].map((i) =>
      svg(
        'svg',
        { class: `firework firework-${i}`, viewBox: '-50 -50 100 100' },
        ...Array.from({ length: 12 }, (_, ray) =>
          svg('path', {
            d: 'M0 -14V-40',
            transform: `rotate(${ray * 30})`,
          }),
        ),
        ...Array.from({ length: 12 }, (_, ray) =>
          svg('circle', { cx: 0, cy: -44, r: 2.4, transform: `rotate(${ray * 30 + 15})` }),
        ),
      ),
    ),
    ...bits('sparkle', 18, (i) => ({
      '--x': `${(i * 31 + 9) % 100}%`,
      '--y': `${(i * 19 + 3) % 40}%`,
      '--d': `${-((i * 0.8) % 3)}s`,
    })),
  ],
}
