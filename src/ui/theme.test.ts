// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { setLanguage } from '../i18n'
import { settings } from '../storage'
import { THEME_CHOICES } from '../theme'
import { colour, themeColour } from './canvas'
import { applyTheme, themeSettings } from './theme'

const root = document.documentElement
const option = (name: string) =>
  [...document.querySelectorAll<HTMLLabelElement>('.theme-option')].find((label) =>
    label.textContent?.startsWith(name),
  )

beforeEach(() => {
  setLanguage('en')
  localStorage.clear()
  delete root.dataset.theme
  document.head.innerHTML = '<meta name="theme-color" content="#1d2b3a">'
  document.body.replaceChildren()
})

describe('the themes on the page', () => {
  it('put a theme on the page, and the classic one as it always was', () => {
    expect(applyTheme('nord')).toBe('nord')
    expect(root.dataset.theme).toBe('nord')
    expect(root.style.colorScheme).toBe('dark')
    expect(applyTheme('light')).toBe('light')
    expect(root.style.colorScheme).toBe('light')
    applyTheme('spring')
    expect(root.style.colorScheme).toBe('light')
    expect(applyTheme('classic')).toBe('classic')
    expect(root.dataset.theme).toBeUndefined()
  })

  it('follow the calendar with the seasons, and decorate behind the screens', () => {
    expect(applyTheme('seasons', new Date(2026, 9, 31))).toBe('halloween')
    expect(document.querySelectorAll('.decor')).toHaveLength(1)
    expect(document.querySelector('.decor-halloween .moon')).not.toBeNull()
    expect(document.querySelector('.decor')?.getAttribute('aria-hidden')).toBe('true')
    applyTheme('winter')
    expect(document.querySelectorAll('.decor')).toHaveLength(1)
    expect(document.querySelectorAll('.decor-winter .flake').length).toBeGreaterThan(10)
    applyTheme('christmas')
    expect(document.querySelectorAll('.decor-christmas .bulb').length).toBeGreaterThan(10)
    applyTheme('newyear')
    expect(document.querySelectorAll('.decor-newyear .firework')).toHaveLength(4)
    for (const [theme, part] of [
      ['chinesenewyear', 'lantern'],
      ['spring', 'petal'],
      ['easter', 'egg'],
      ['summer', 'sun'],
      ['forest', 'firs'],
    ] as const) {
      applyTheme(theme)
      expect(document.querySelectorAll(`.decor-${theme} .${part}`).length).toBeGreaterThan(0)
    }
    applyTheme('wood')
    expect(document.querySelector('.decor')).toBeNull()
  })

  it('offer every theme in the settings, and apply and keep the one picked', () => {
    document.body.append(themeSettings())
    expect(document.querySelectorAll('.theme-option')).toHaveLength(THEME_CHOICES.length)
    expect(option('With the seasons')?.querySelector('input')?.checked).toBe(true)
    // Each shows a picture of itself.
    expect(option('Green felt')?.querySelector<HTMLElement>('.swatch')?.dataset.theme).toBe('felt')
    expect(option('Classic')?.querySelector<HTMLElement>('.swatch')?.dataset.theme).toBe('classic')

    option('Night mode, red')?.querySelector('input')?.click()
    expect(settings().theme).toBe('nightred')
    expect(root.dataset.theme).toBe('nightred')

    option('Classic')?.querySelector('input')?.click()
    expect(settings().theme).toBe('classic')
    expect(root.dataset.theme).toBeUndefined()
    option('With the seasons')?.querySelector('input')?.click()
    expect(settings().theme).toBe('seasons')
    expect(option('With the seasons')?.textContent).toMatch(/now: /)
  })

  it('give canvases the classic colours where the style sheet has none', () => {
    applyTheme('classic')
    expect(colour(0)).toBe('#e5484d')
    expect(colour(7)).toBe('#f5c542')
    expect(themeColour('rink')).toBe('#16324a')
  })
})
