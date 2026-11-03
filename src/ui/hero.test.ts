// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { setLanguage } from '../i18n'
import { hero } from './hero'

describe('the start screen’s picture', () => {
  it('is one picture for screen readers, in the language chosen', () => {
    setLanguage('de')
    const picture = hero()
    expect(picture.getAttribute('role')).toBe('img')
    expect(picture.getAttribute('aria-label')).toContain('Kiste')
    setLanguage('en')
    expect(hero().getAttribute('aria-label')).toContain('box of games')
  })

  it('shows the boards of four games standing in the box', () => {
    const boards = hero().querySelectorAll(':scope > g > svg')
    expect(boards).toHaveLength(4)
    for (const board of boards) expect(board.getAttribute('aria-hidden')).toBe('true')
  })
})
