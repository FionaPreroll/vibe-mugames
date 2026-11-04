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

describe('the stickers on the box', () => {
  const stickers = (now: Date) =>
    [...hero(now).querySelectorAll('.sticker')].map((sticker) => sticker.classList[1])

  it('stay off the box on ordinary days', () => {
    expect(stickers(new Date(2026, 2, 10))).toEqual([])
  })

  it('mark Pride Month, and the trans days of November, several at once', () => {
    expect(stickers(new Date(2026, 5, 28))).toEqual(['sticker-pride'])
    expect(stickers(new Date(2026, 10, 4))).toEqual(['sticker-transMonth'])
    expect(stickers(new Date(2026, 10, 15))).toEqual(['sticker-transMonth', 'sticker-transWeek'])
    expect(stickers(new Date(2026, 10, 20))).toEqual(['sticker-transMonth', 'sticker-tdor'])
  })

  it('say what they are for, on hover, to screen readers and on a tap', () => {
    setLanguage('en')
    const picture = hero(new Date(2026, 10, 20))
    document.body.replaceChildren(picture)
    const tdor = picture.querySelector('.sticker-tdor')
    expect(tdor?.querySelector('title')?.textContent).toContain('Day of Remembrance')
    expect(picture.getAttribute('aria-label')).toContain('Trans Awareness Month')
    // The day of remembrance glows quietly; the others sparkle.
    expect(tdor?.querySelector('.sparkle')).toBeNull()
    expect(picture.querySelectorAll('.sticker-transMonth .sparkle')).toHaveLength(3)
    tdor?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(document.querySelector('.toast')?.textContent).toContain('20 November')
  })
})
