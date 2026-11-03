// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { GAME_IDS } from '../../core/board'
import { setLanguage, t } from '../../i18n'
import { handleBack } from '../dom'
import { GUIDES, gameTitle, playersText, rulesButton, showRules, thumbnail } from '.'

/** Every game's thumbnail and rules, and the dialog that shows the rules. */

afterEach(() => {
  document.body.replaceChildren()
  setLanguage('en')
})

describe('the guides', () => {
  it.each(GAME_IDS)('%s has a thumbnail and illustrated rules in both languages', (game) => {
    const guide = GUIDES[game]
    const picture = thumbnail(game)
    expect(picture.tagName.toLowerCase()).toBe('svg')
    expect(picture.getAttribute('aria-hidden')).toBe('true')
    expect(picture.childElementCount).toBeGreaterThan(0)
    expect(guide.rules.length).toBeGreaterThanOrEqual(2)
    expect(guide.rules.filter((step) => step.picture).length).toBeGreaterThanOrEqual(2)
    for (const step of guide.rules) {
      setLanguage('en')
      const english = t(step.text)
      setLanguage('de')
      const german = t(step.text)
      expect(english.length).toBeGreaterThan(20)
      expect(german.length).toBeGreaterThan(20)
      expect(german).not.toBe(english)
      if (step.picture) expect(step.picture().getAttribute('viewBox')).toMatch(/^[-\d. ]+$/)
    }
  })

  it('never shows a drawing with a broken number in it', () => {
    for (const game of GAME_IDS) {
      const pictures = [
        GUIDES[game].thumbnail(),
        ...GUIDES[game].rules.flatMap((s) => s.picture?.() ?? []),
      ]
      for (const picture of pictures) expect(picture.outerHTML).not.toMatch(/NaN|undefined/)
    }
  })

  it('says how many play', () => {
    expect(playersText('tictactoe')).toBe('2 players')
    expect(playersText('miaumiau')).toBe('2 to 6 players')
    setLanguage('de')
    expect(playersText('lichtrenner')).toBe('2 bis 6 Spieler')
  })
})

describe('the rules dialog', () => {
  it('opens from a game’s button with a step for each rule, and closes', () => {
    document.body.append(gameTitle('muehle'))
    const button = document.querySelector<HTMLButtonElement>('.game-title .rules-button')
    expect(button?.ariaLabel).toBe('Rules')
    button?.click()
    const modal = document.querySelector('.modal.rules')
    expect(modal?.querySelector('h2')?.textContent).toBe('Rules of Nine Men’s Morris')
    const steps = modal?.querySelectorAll('.rule-steps li') ?? []
    expect(steps.length).toBe(GUIDES.muehle.rules.length)
    expect(modal?.querySelectorAll('.rule-steps svg').length).toBe(4)
    modal?.querySelector<HTMLButtonElement>('.buttons button')?.click()
    expect(document.querySelector('.modal.rules')).toBeNull()
  })

  it('closes with Android’s back button and with a tap beside it, and is never open twice', () => {
    showRules('dame')
    showRules('dame')
    expect(document.querySelectorAll('.modal.rules').length).toBe(1)
    handleBack(() => {})
    expect(document.querySelector('.modal.rules')).toBeNull()
    const modal = showRules('airhockey')
    modal.querySelector<HTMLElement>('.card')?.click()
    expect(document.querySelector('.modal.rules')).not.toBeNull()
    modal.click()
    expect(document.querySelector('.modal.rules')).toBeNull()
  })

  it('opens without choosing the game the button sits on', () => {
    let chosen = false
    const card = document.createElement('button')
    card.onclick = () => {
      chosen = true
    }
    card.append(rulesButton('seeschlacht', true))
    document.body.append(card)
    card.querySelector<HTMLButtonElement>('.rules-button')?.click()
    expect(chosen).toBe(false)
    expect(document.querySelector('.modal.rules h2')?.textContent).toBe('Rules of Sea Battle')
  })
})
