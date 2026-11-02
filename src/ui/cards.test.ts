import { describe, expect, it } from 'vitest'
import { encode, type MiauView } from '../core/miaumiau'
import { setLanguage } from '../i18n'
import { cardName, cardsHint } from './cards'

/** Three players, Bo (seat 1) to move, the queen of hearts on top. */
const view: MiauView = {
  hand: [],
  counts: [5, 4, 5],
  top: 2 * 13 + 10,
  stock: 10,
  pile: 3,
  turn: 1,
  wish: null,
  penalty: 0,
  drawn: null,
  winner: null,
  stuck: false,
}
const names = ['Ada', 'Bo', 'Cy']
const EIGHT_OF_CLUBS = 6

describe('hints on the cards', () => {
  setLanguage('en')

  it('names cards in both languages', () => {
    expect(cardName(2 * 13 + 5)).toBe('7 of hearts')
    setLanguage('de')
    expect(cardName(9)).toBe('Kreuz Bube')
    setLanguage('en')
  })

  it('says nothing about a card that does nothing', () => {
    expect(cardsHint(view, 1, encode({ kind: 'play', card: view.top }), names)).toBeNull()
  })

  it('tells who draws for sevens: the player themselves, or everyone else', () => {
    const sevens = { ...view, penalty: 4 }
    expect(cardsHint(sevens, 1, null, names)).toBe('Answer with a seven, or draw 4 cards.')
    expect(cardsHint(sevens, 0, null, names)).toBe('Bo must draw 4 cards, or answer with a seven.')
  })

  it('tells who misses a turn for an eight', () => {
    // Ada played the eight: Bo misses his turn, Cy is next.
    const eight = { ...view, top: EIGHT_OF_CLUBS, turn: 2 }
    const played = encode({ kind: 'play', card: EIGHT_OF_CLUBS })
    expect(cardsHint(eight, 0, played, names)).toBe('An eight: Bo misses a turn.')
    expect(cardsHint(eight, 1, played, names)).toBe('An eight: you miss this turn.')
    // Once someone drew since, the eight is old news.
    expect(cardsHint(eight, 0, encode({ kind: 'draw' }), names)).toBeNull()
  })

  it('tells which suit a jack wished for, and what the player just drew', () => {
    expect(cardsHint({ ...view, wish: 3 }, 0, null, names)).toBe(
      'A jack wished for ♦: play a ♦ card or a jack.',
    )
    expect(cardsHint({ ...view, drawn: 2 * 13 + 3 }, 1, null, names)).toBe(
      'You drew the 5 of hearts: play it, or keep it.',
    )
    expect(cardsHint({ ...view, winner: 0 }, 1, null, names)).toBeNull()
  })
})
