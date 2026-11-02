import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  type Card,
  DECK,
  deal,
  deck,
  fits,
  HAND,
  legal,
  type MiauMove,
  type MiauState,
  moves,
  outcome,
  play,
  rankOf,
  shuffle,
  suitOf,
  view,
} from './miaumiau'

const RANK_NAMES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
const SUIT_NAMES = ['c', 's', 'h', 'd']

/** A card by name: '7h' is the seven of hearts, 'Jc' the jack of clubs. */
function c(name: string): Card {
  const suit = SUIT_NAMES.indexOf(name.slice(-1))
  const rank = RANK_NAMES.indexOf(name.slice(0, -1))
  if (suit < 0 || rank < 0) throw new Error(`no card ${name}`)
  return suit * 13 + rank
}

const cards = (...names: string[]) => names.map(c)

/** A game in the middle: the hands, the stock and the pile as named, seat 0 to move. */
function game(hands: string[][], pile: string[], stock: string[] = []): MiauState {
  return {
    hands: hands.map((hand) => cards(...hand)),
    stock: cards(...stock),
    pile: cards(...pile),
    turn: 0,
    wish: null,
    penalty: 0,
    drawn: null,
    passes: 0,
    winner: null,
  }
}

const playCard = (card: string, suit?: number): MiauMove =>
  suit === undefined ? { kind: 'play', card: c(card) } : { kind: 'play', card: c(card), suit }
const DRAW: MiauMove = { kind: 'draw' }
const PASS: MiauMove = { kind: 'pass' }

/** A random source that always gives the same numbers, for games that can be replayed. */
function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

/** Plays a legal move as the seat whose turn it is, and checks it was legal. */
function step(state: MiauState, move: MiauMove, random = seeded(1)): MiauState {
  expect(legal(state, state.turn, move)).toBe(true)
  return play(state, state.turn, move, random)
}

describe('Miau-Miau', () => {
  it('deals five cards to each player from a Skat deck, or a full one for five or six', () => {
    expect(deck(2)).toHaveLength(32)
    expect(deck(4).every((card) => rankOf(card) >= 5)).toBe(true)
    expect(deck(5)).toHaveLength(52)
    for (const seats of [2, 3, 4, 5, 6]) {
      const state = deal(seats, seeded(seats))
      expect(state.hands).toHaveLength(seats)
      expect(state.hands.every((hand) => hand.length === HAND)).toBe(true)
      expect(state.pile).toHaveLength(1)
      const all = [...state.hands.flat(), ...state.stock, ...state.pile].sort((a, b) => a - b)
      expect(all).toEqual(deck(seats))
      expect(state).toMatchObject({ turn: 0, wish: null, penalty: 0, winner: null })
    }
    expect(() => deal(1, Math.random)).toThrow()
    expect(() => deal(7, Math.random)).toThrow()
  })

  it('shuffles every card into some place, and keeps them all', () => {
    const shuffled = shuffle(deck(2), seeded(3))
    expect(shuffled).not.toEqual(deck(2))
    expect([...shuffled].sort((a, b) => a - b)).toEqual(deck(2))
    // Even a random source that gives 1 keeps every card.
    expect([...shuffle(deck(2), () => 1)].sort((a, b) => a - b)).toEqual(deck(2))
  })

  it('takes a card of the same suit or rank, and a jack on anything', () => {
    expect(fits(c('9h'), c('Kh'), null, 0)).toBe(true)
    expect(fits(c('Ks'), c('Kh'), null, 0)).toBe(true)
    expect(fits(c('9s'), c('Kh'), null, 0)).toBe(false)
    expect(fits(c('Js'), c('Kh'), null, 0)).toBe(true)
    // A wished suit counts, not the jack's own.
    expect(fits(c('9d'), c('Js'), 3, 0)).toBe(true)
    expect(fits(c('9s'), c('Js'), 3, 0)).toBe(false)
    expect(fits(c('Jh'), c('Js'), 3, 0)).toBe(true)
  })

  it('lets only the player whose turn it is play a card from their own hand', () => {
    const state = game(
      [
        ['9h', '8s'],
        ['Kh', 'Ah'],
      ],
      ['Qh'],
      ['7c'],
    )
    expect(legal(state, 1, playCard('Kh'))).toBe(false)
    expect(legal(state, 0, playCard('Kh'))).toBe(false)
    expect(legal(state, 0, playCard('8s'))).toBe(false)
    const after = step(state, playCard('9h'))
    expect(after).toMatchObject({ turn: 1, hands: [cards('8s'), cards('Kh', 'Ah')] })
    expect(after.pile).toEqual(cards('Qh', '9h'))
  })

  it('asks a jack for a suit, and takes no suit for another card', () => {
    const state = game(
      [
        ['Jc', '9h', 'Ad'],
        ['Kd', 'Ks'],
      ],
      ['Qh'],
    )
    expect(legal(state, 0, playCard('Jc'))).toBe(false)
    expect(legal(state, 0, playCard('Jc', 4))).toBe(false)
    expect(legal(state, 0, playCard('9h', 1))).toBe(false)
    const after = step(state, playCard('Jc', 3))
    expect(after).toMatchObject({ wish: 3, turn: 1 })
    expect(legal(after, 1, playCard('Kd'))).toBe(true)
    const answered = step(after, playCard('Kd'))
    expect(answered.wish).toBeNull()
    expect(moves(answered)).toContainEqual(playCard('Ad'))
  })

  it('makes the next player draw two for a seven, or four if they answer with a seven', () => {
    const state = game(
      [
        ['7h', 'Kc'],
        ['7s', 'Kh'],
        ['Ah', 'Qh'],
      ],
      ['9h'],
      ['8c', '8d', '9c', '9d', '10c'],
    )
    const seven = step(state, playCard('7h'))
    expect(seven).toMatchObject({ turn: 1, penalty: 2 })
    // Only a seven answers a seven, or drawing.
    expect(legal(seven, 1, playCard('Kh'))).toBe(false)
    expect(legal(seven, 1, PASS)).toBe(false)
    const answered = step(seven, playCard('7s'))
    expect(answered).toMatchObject({ turn: 2, penalty: 4 })
    expect(moves(answered)).toEqual([DRAW])
    const drawn = step(answered, DRAW)
    expect(drawn).toMatchObject({ turn: 0, penalty: 0, drawn: null })
    expect(drawn.hands[2]).toHaveLength(6)
    expect(drawn.stock).toEqual(cards('8c'))
  })

  it('skips the next player for an eight; with two players, its player goes again', () => {
    const three = game([['8h', 'Kc'], ['Kh'], ['Ah']], ['9h'])
    expect(step(three, playCard('8h')).turn).toBe(2)
    const two = game([['8h', 'Kc'], ['Kh']], ['9h'])
    expect(step(two, playCard('8h')).turn).toBe(0)
  })

  it('lets a player play the card they drew if it fits, or keep it and pass', () => {
    const state = game([['Kc'], ['Ks']], ['9h'], ['Ad', 'Ah'])
    const drew = step(state, DRAW)
    expect(drew).toMatchObject({ turn: 0, drawn: c('Ah') })
    expect(view(drew, 0).drawn).toBe(c('Ah'))
    expect(view(drew, 1).drawn).toBeNull()
    // Only the card just drawn, and no second draw.
    expect(moves(drew)).toEqual([PASS, playCard('Ah')])
    expect(step(drew, PASS)).toMatchObject({ turn: 1, drawn: null })
    expect(step(drew, playCard('Ah'))).toMatchObject({ turn: 1, drawn: null })
  })

  it('moves the turn on when the card drawn does not fit', () => {
    const state = game([['Kc'], ['Ks']], ['9h'], ['Ad'])
    expect(step(state, DRAW)).toMatchObject({
      turn: 1,
      drawn: null,
      hands: [cards('Kc', 'Ad'), cards('Ks')],
    })
  })

  it('shuffles the pile into a new stock when the stock runs out', () => {
    const state = game([['Kc'], ['Ks']], ['8h', '10h', '9h'])
    const drew = step(state, DRAW, seeded(2))
    expect(drew.pile).toEqual(cards('9h'))
    expect(drew.stock).toHaveLength(1)
    expect([...(drew.hands[0] ?? []), ...drew.stock].sort((a, b) => a - b)).toEqual(
      cards('8h', '10h', 'Kc').sort((a, b) => a - b),
    )
  })

  it('is a draw once every player in turn could neither draw nor play', () => {
    const state = game([['Kc'], ['Ks']], ['9h'])
    expect(moves(state)).toEqual([PASS])
    const once = step(state, PASS)
    expect(outcome(once)).toBeNull()
    const twice = step(once, PASS)
    expect(outcome(twice)).toBe('draw')
    expect(view(twice, 0).stuck).toBe(true)
    expect(moves(twice)).toEqual([])
  })

  it('is won by the first player to play their last card, even a seven', () => {
    const state = game([['7h'], ['Kh', 'Ah']], ['9h'], ['8c', '8d'])
    const won = step(state, playCard('7h'))
    expect(outcome(won)).toBe(0)
    expect(won.penalty).toBe(0)
    expect(legal(won, won.turn, DRAW)).toBe(false)
  })

  it('shows each player only their own hand, and how many cards the others hold', () => {
    const state = deal(3, seeded(9))
    const mine = view(state, 1)
    expect(mine.hand).toEqual(state.hands[1])
    expect(mine.counts).toEqual([5, 5, 5])
    expect(mine.top).toBe(state.pile[0])
    expect(mine.stock).toBe(state.stock.length)
    expect(JSON.stringify(mine)).not.toContain(JSON.stringify(state.hands[0]))
    expect(view(state, -1).hand).toEqual([])
  })

  it('keeps every card, and only legal moves happen, in random games to the end', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 6 }), fc.integer(), (seats, seed) => {
        const random = seeded(seed)
        let state = deal(seats, random)
        const all = deck(seats)
        for (let turn = 0; turn < 2000 && outcome(state) === null; turn++) {
          const options = moves(state)
          expect(options.length).toBeGreaterThan(0)
          const move = options[Math.floor(random() * options.length)] as MiauMove
          state = play(state, state.turn, move, random)
          const held = [...state.hands.flat(), ...state.stock, ...state.pile]
          expect(held.sort((a, b) => a - b)).toEqual(all)
          expect(state.turn).toBeGreaterThanOrEqual(0)
          expect(state.turn).toBeLessThan(seats)
        }
        const end = outcome(state)
        if (typeof end === 'number') expect(state.hands[end]).toEqual([])
      }),
      { numRuns: 60 },
    )
  })

  it('names suits and ranks the same way everywhere', () => {
    expect(suitOf(c('Ad'))).toBe(3)
    expect(rankOf(c('Ad'))).toBe(12)
    expect(DECK).toBe(52)
  })
})
