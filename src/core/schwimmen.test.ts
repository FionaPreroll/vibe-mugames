import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { type Card, RANKS } from './miaumiau'
import {
  bestSuit,
  COINS,
  decode,
  encode,
  KNOCK_CODE,
  legal,
  moves,
  PASS_CODE,
  play,
  playing,
  points,
  SCHNAUZ,
  SWAP_ALL_CODE,
  type SwimMove,
  type SwimState,
  score,
  start,
  THREE_OF_A_KIND,
  view,
} from './schwimmen'

/** A card by suit (0 clubs, 1 spades, 2 hearts, 3 diamonds) and its name. */
const card = (suit: number, rank: '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'): Card =>
  suit * RANKS + ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'].indexOf(rank) + 5

/** Numbers from a seed, the same on every run. */
function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 2 ** 32
  }
}

/** A round set up by hand, for seats with these hands, the middle as given, seat 0 to move. */
function table(hands: Card[][], middle: Card[], stock: Card[] = []): SwimState {
  return {
    coins: hands.map(() => COINS),
    out: hands.map(() => false),
    hands,
    middle,
    stock,
    dealer: hands.length - 1,
    turn: 0,
    knocker: null,
    passes: 0,
    turns: 0,
    reveal: null,
    winner: null,
  }
}

const never = () => 0

describe('the points of a hand', () => {
  it('count the best suit: an ace 11, tens and faces 10, the others their number', () => {
    expect(points(card(0, 'A'))).toBe(11)
    expect(points(card(1, 'K'))).toBe(10)
    expect(points(card(2, '10'))).toBe(10)
    expect(points(card(3, '7'))).toBe(7)
    expect(score([card(2, 'A'), card(2, '9'), card(0, 'K')])).toBe(20)
    expect(bestSuit([card(2, 'A'), card(2, '9'), card(0, 'K')])).toBe(2)
    expect(score([card(2, 'A'), card(1, 'K'), card(0, 'Q')])).toBe(11)
    expect(score([card(3, 'A'), card(3, 'J'), card(3, '10')])).toBe(SCHNAUZ)
  })

  it('count 30½ for three of a rank', () => {
    expect(score([card(0, '8'), card(1, '8'), card(2, '8')])).toBe(THREE_OF_A_KIND)
    expect(bestSuit([card(0, '8'), card(1, '8'), card(2, '8')])).toBeNull()
  })
})

describe('moves as numbers', () => {
  it('go there and back', () => {
    const all: SwimMove[] = [
      { kind: 'swap', card: card(0, '7'), middle: card(3, 'A') },
      { kind: 'swapAll' },
      { kind: 'pass' },
      { kind: 'knock' },
    ]
    for (const move of all) expect(decode(encode(move))).toEqual(move)
  })

  it('stand for nothing when they make no move', () => {
    for (const numbers of [[], [51], [55], [SWAP_ALL_CODE, 1], [1, 1], [1, 2, 3], [-1, 2]]) {
      expect(decode(numbers)).toBeUndefined()
    }
    expect(decode([PASS_CODE])).toEqual({ kind: 'pass' })
    expect(decode([KNOCK_CODE])).toEqual({ kind: 'knock' })
  })
})

describe('a game of Schwimmen', () => {
  it('deals three cards to each, three to the middle, from 32 cards, seat 0 first', () => {
    const state = start(4, seeded(1))
    const all = [...state.hands.flat(), ...state.middle, ...state.stock]
    expect(state.hands.every((hand) => hand.length === 3)).toBe(true)
    expect(state.middle).toHaveLength(3)
    expect(new Set(all).size).toBe(32)
    expect(all.every((c) => c % RANKS >= 5)).toBe(true)
    expect(state.coins).toEqual([3, 3, 3, 3])
    // Unless a hand was dealt 31, which ends the round at once.
    if (state.reveal === null) expect(state.turn).toBe(0)
  })

  it('swaps one card with the middle, or all three', () => {
    const state = table(
      [
        [card(0, '7'), card(1, '8'), card(2, '9')],
        [card(3, '7'), card(3, '8'), card(0, '9')],
      ],
      [card(0, 'K'), card(1, 'Q'), card(2, 'J')],
    )
    const one = play(state, 0, { kind: 'swap', card: card(0, '7'), middle: card(2, 'J') }, never)
    expect(one.hands[0]).toEqual([card(2, 'J'), card(1, '8'), card(2, '9')])
    expect(one.middle).toEqual([card(0, 'K'), card(1, 'Q'), card(0, '7')])
    expect(one.turn).toBe(1)
    const all = play(one, 1, { kind: 'swapAll' }, never)
    expect(all.hands[1]).toEqual(one.middle)
    expect(all.middle).toEqual(one.hands[1])
    expect(all.turn).toBe(0)
  })

  it('takes moves only from the seat to move, and swaps only cards that are there', () => {
    const state = table(
      [
        [card(0, '7'), card(1, '8'), card(2, '9')],
        [card(3, '7'), card(3, '8'), card(0, '9')],
      ],
      [card(0, 'K'), card(1, 'Q'), card(2, 'J')],
    )
    expect(legal(state, 1, { kind: 'pass' })).toBe(false)
    expect(legal(state, 0, { kind: 'swap', card: card(3, '7'), middle: card(0, 'K') })).toBe(false)
    expect(legal(state, 0, { kind: 'swap', card: card(0, '7'), middle: card(3, 'A') })).toBe(false)
    expect(moves(state)).toHaveLength(3 + 9)
  })

  it('gives everyone else one more turn after a knock, then the fewest points lose a coin', () => {
    const state = table(
      [
        [card(0, 'A'), card(0, 'K'), card(1, '7')],
        [card(2, '7'), card(3, '8'), card(1, '9')],
        [card(2, 'A'), card(2, 'K'), card(3, '7')],
      ],
      [card(0, '8'), card(1, '8'), card(2, '8')],
    )
    const knocked = play(state, 0, { kind: 'knock' }, seeded(2))
    expect(knocked.knocker).toBe(0)
    expect(moves(knocked).some((m) => m.kind === 'knock')).toBe(false)
    const second = play(knocked, 1, { kind: 'pass' }, seeded(2))
    expect(second.turn).toBe(2)
    expect(second.reveal).toBeNull()
    const shown = play(second, 2, { kind: 'pass' }, seeded(2))
    expect(shown.reveal).toMatchObject({ why: 'knock', by: 0, losers: [1] })
    expect(shown.reveal?.hands[1]).toEqual(state.hands[1])
    expect(shown.coins).toEqual([3, 2, 3])
    // The next round is dealt by the next seat, and the one after it starts.
    expect(shown.dealer).toBe(0)
    expect(shown.knocker).toBeNull()
  })

  it('ends the round at once when a swap makes 31', () => {
    const state = table(
      [
        [card(3, 'A'), card(3, 'J'), card(1, '7')],
        [card(2, '7'), card(3, '8'), card(1, '9')],
      ],
      [card(3, '10'), card(1, '8'), card(2, '8')],
    )
    const after = play(state, 0, { kind: 'swap', card: card(1, '7'), middle: card(3, '10') }, never)
    expect(after.reveal).toMatchObject({ why: 'schnauz', by: 0, losers: [1] })
    expect(after.coins).toEqual([3, 2])
  })

  it('lays out a new middle when everyone passed, and shows the hands when the stock is out', () => {
    const hands = [
      [card(0, 'A'), card(0, 'K'), card(1, '7')],
      [card(2, '7'), card(3, '8'), card(1, '9')],
    ]
    const fresh = [card(2, 'K'), card(2, 'Q'), card(2, 'J')]
    const state = table(hands, [card(0, '8'), card(1, '8'), card(2, '8')], fresh)
    const once = play(state, 0, { kind: 'pass' }, never)
    const twice = play(once, 1, { kind: 'pass' }, never)
    expect(twice.middle).toEqual(fresh)
    expect(twice.stock).toEqual([])
    expect(twice.passes).toBe(0)
    const thrice = play(play(twice, 0, { kind: 'pass' }, seeded(3)), 1, { kind: 'pass' }, seeded(3))
    expect(thrice.reveal).toMatchObject({ why: 'passes', by: null, losers: [1] })
  })

  it('takes nobody’s coin when all hold as many points', () => {
    const state = table(
      [
        [card(0, 'A'), card(0, '9'), card(1, '7')],
        [card(2, 'A'), card(2, '9'), card(3, '7')],
      ],
      [card(0, '8'), card(1, '8'), card(2, '8')],
    )
    const knocked = play(state, 0, { kind: 'knock' }, seeded(4))
    const shown = play(knocked, 1, { kind: 'pass' }, seeded(4))
    expect(shown.reveal?.losers).toEqual([])
    expect(shown.coins).toEqual([3, 3])
  })

  it('lets a player without coins swim, and puts them out when they lose again', () => {
    const state: SwimState = {
      ...table(
        [
          [card(0, '7'), card(1, '8'), card(2, '9')],
          [card(2, 'A'), card(2, 'K'), card(3, '7')],
          [card(0, 'A'), card(0, 'K'), card(1, '7')],
        ],
        [card(0, '8'), card(1, '8'), card(2, '8')],
      ),
      coins: [0, 1, 2],
    }
    const knocked = play(state, 0, { kind: 'knock' }, seeded(5))
    const shown = play(
      play(knocked, 1, { kind: 'pass' }, seeded(5)),
      2,
      { kind: 'pass' },
      seeded(5),
    )
    expect(shown.reveal?.losers).toEqual([0])
    expect(shown.out).toEqual([true, false, false])
    expect(playing(shown)).toEqual([1, 2])
    expect(shown.hands[0]).toEqual([])
    expect(shown.turn).not.toBe(0)
  })

  it('is won by the last player still in', () => {
    const state: SwimState = {
      ...table(
        [
          [card(0, '7'), card(1, '8'), card(2, '9')],
          [card(2, 'A'), card(2, 'K'), card(3, '7')],
        ],
        [card(0, '8'), card(1, '8'), card(2, '8')],
      ),
      coins: [0, 0],
    }
    const shown = play(play(state, 0, { kind: 'knock' }, never), 1, { kind: 'pass' }, never)
    expect(shown.winner).toBe(1)
    expect(moves(shown)).toEqual([])
  })

  it('shows each seat only its own hand', () => {
    const state = start(3, seeded(6))
    const seen = view(state, 1)
    expect(seen.hand).toEqual(state.hands[1])
    expect(JSON.stringify(seen)).not.toContain(JSON.stringify(state.hands[0]))
    expect(view(state, -1).hand).toEqual([])
  })

  it('always ends with one winner, whatever legal moves are played', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 8 }),
        fc.integer(),
        fc.array(fc.nat(1000), { minLength: 2000, maxLength: 2000 }),
        (seats, seed, picks) => {
          const random = seeded(seed)
          let state = start(seats, random)
          for (const pick of picks) {
            if (state.winner !== null) break
            const all = moves(state)
            expect(all.length).toBeGreaterThan(0)
            // Knocking now and then, so that rounds end.
            const move = pick % 5 === 0 ? { kind: 'knock' as const } : all[pick % all.length]
            const chosen = move && legal(state, state.turn, move) ? move : all[0]
            if (!chosen) break
            state = play(state, state.turn, chosen, random)
            const cards = [...state.hands.flat(), ...state.middle, ...state.stock]
            expect(new Set(cards).size).toBe(cards.length)
            if (state.winner === null) expect(state.out[state.turn]).toBe(false)
          }
          expect(state.winner).not.toBeNull()
        },
      ),
      { numRuns: 40 },
    )
  })
})
