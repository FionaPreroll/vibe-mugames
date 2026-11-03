import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  atLeast,
  decode,
  encode,
  LIVES,
  legal,
  MAEXCHEN,
  type MaexMove,
  type MaexState,
  moves,
  nextIn,
  outcome,
  play,
  rank,
  start,
  THROWS,
  throwOf,
  view,
} from './maexchen'

/** Dice that fall as listed, a die at a time: `fixed(5, 3)` rolls a 5 and a 3. */
function fixed(...dice: number[]): () => number {
  let i = 0
  return () => ((dice[i++ % dice.length] as number) - 1) / 6 + 0.01
}

function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

const roll: MaexMove = { kind: 'roll' }
const doubt: MaexMove = { kind: 'doubt' }
const claim = (value: number): MaexMove => ({ kind: 'claim', value })

/** Seat 0 rolled `dice` and said `said`; seat 1 is to move. */
function said(dice: [number, number], value: number, seats = 3): MaexState {
  const rolled = play(start(seats), 0, roll, fixed(...dice))
  return play(rolled, 0, claim(value), fixed(1))
}

describe('throws', () => {
  it('reads two dice with the higher one first', () => {
    expect(throwOf([3, 5])).toBe(53)
    expect(throwOf([6, 6])).toBe(66)
    expect(throwOf([1, 2])).toBe(MAEXCHEN)
  })

  it('ranks the Mäxchen over doubles, and doubles over the rest', () => {
    expect(rank(31)).toBe(0)
    expect(rank(65)).toBeLessThan(rank(11))
    expect(rank(11)).toBeLessThan(rank(22))
    expect(rank(66)).toBeLessThan(rank(MAEXCHEN))
    expect(THROWS).toHaveLength(21)
    // Every way two dice fall is one of the throws.
    for (let a = 1; a <= 6; a++) {
      for (let b = 1; b <= 6; b++) expect(THROWS).toContain(throwOf([a, b]))
    }
  })

  it('knows how often a throw is reached', () => {
    expect(atLeast(31)).toBe(36)
    expect(atLeast(MAEXCHEN)).toBe(2)
    expect(atLeast(66)).toBe(3)
    expect(atLeast(11)).toBe(8)
  })

  it('carries moves as numbers, and nothing else', () => {
    for (const move of [roll, doubt, { kind: 'yield' } as const, claim(54), claim(21)]) {
      expect(decode(encode(move))).toEqual(move)
    }
    for (const numbers of [[], [0], [4], [70], [12], [1, 1], [54.5]]) {
      expect(decode(numbers)).toBeUndefined()
    }
  })
})

describe('a round', () => {
  it('lets the first player only roll, then say any throw', () => {
    const game = start(3)
    expect(moves(game)).toEqual([roll])
    const rolled = play(game, 0, roll, fixed(4, 6))
    expect(rolled.dice).toEqual([4, 6])
    expect(rolled.phase).toBe('claim')
    expect(moves(rolled)).toHaveLength(THROWS.length)
  })

  it('shows the dice to the roller alone', () => {
    const game = said([4, 6], 64)
    expect(view(game, 0).dice).toEqual([4, 6])
    expect(view(game, 0).mine).toBe(true)
    expect(view(game, 1).dice).toBeNull()
    expect(view(game, -1).dice).toBeNull()
    expect(view(game, 1).claim).toBe(64)
  })

  it('asks the next player for more, and lets them believe or doubt', () => {
    const game = said([4, 6], 64)
    expect(game.turn).toBe(1)
    expect(moves(game)).toEqual([roll, doubt])
    expect(legal(game, 0, roll)).toBe(false)
    const rolled = play(game, 1, roll, fixed(1, 1))
    expect(legal(rolled, 1, claim(63))).toBe(false)
    expect(legal(rolled, 1, claim(64))).toBe(false)
    expect(legal(rolled, 1, claim(65))).toBe(true)
    expect(legal(rolled, 1, claim(11))).toBe(true)
    // The dice are now the new roller's.
    expect(view(rolled, 1).dice).toEqual([1, 1])
    expect(view(rolled, 0).dice).toBeNull()
  })

  it('costs the bluffer a life when the cup holds less', () => {
    const game = play(said([3, 1], 55), 1, doubt, fixed(1))
    expect(game.lives).toEqual([LIVES - 1, LIVES, LIVES])
    expect(game.reveal).toEqual({
      claimer: 0,
      doubter: 1,
      claim: 55,
      dice: [3, 1],
      loser: 0,
      lost: 1,
    })
    // The loser starts the next round, with nothing said.
    expect(game.turn).toBe(0)
    expect(game.claim).toBeNull()
    expect(game.dice).toBeNull()
  })

  it('costs the doubter a life when the cup holds as much or more', () => {
    const same = play(said([5, 4], 54), 1, doubt, fixed(1))
    expect(same.lives).toEqual([LIVES, LIVES - 1, LIVES])
    expect(same.turn).toBe(1)
    const more = play(said([6, 6], 54), 1, doubt, fixed(1))
    expect(more.reveal?.loser).toBe(1)
  })

  it('offers only doubting or giving up against a Mäxchen, which costs two if it is true', () => {
    const game = said([2, 1], MAEXCHEN)
    expect(moves(game)).toEqual([doubt, { kind: 'yield' }])
    const doubted = play(game, 1, doubt, fixed(1))
    expect(doubted.lives[1]).toBe(LIVES - 2)
    const gaveUp = play(game, 1, { kind: 'yield' }, fixed(1))
    expect(gaveUp.lives[1]).toBe(LIVES - 1)
    expect(gaveUp.reveal?.dice).toBeNull()
    const bluffed = play(said([6, 6], MAEXCHEN), 1, doubt, fixed(1))
    expect(bluffed.lives[0]).toBe(LIVES - 1)
  })

  it('skips players who are out, and ends with the last one in', () => {
    expect(nextIn([1, 0, 2], 0)).toBe(2)
    expect(nextIn([1, 0, 2], 2)).toBe(0)
    let game: MaexState = { ...said([3, 1], 65), lives: [3, 1, 1] }
    // Seat 1 bluffs after believing, seat 2 doubts.
    game = play(game, 1, roll, fixed(3, 1))
    game = play(game, 1, claim(66), fixed(1))
    expect(game.turn).toBe(2)
    game = play(game, 2, doubt, fixed(1))
    expect(game.lives).toEqual([3, 0, 1])
    // Seat 1 is out: seat 2 starts.
    expect(game.turn).toBe(2)
    game = play(game, 2, roll, fixed(1, 2))
    game = play(game, 2, claim(MAEXCHEN), fixed(1))
    expect(game.turn).toBe(0)
    game = play(game, 0, doubt, fixed(1))
    expect(game.lives).toEqual([1, 0, 1])
    game = play(game, 0, roll, fixed(3, 1))
    game = play(game, 0, claim(32), fixed(1))
    game = play(game, 2, doubt, fixed(1))
    expect(outcome(game)).toBe(2)
    expect(moves(game)).toEqual([])
  })
})

describe('whole games', () => {
  it('always end with one player left, whatever the players do', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 8 }), fc.integer(), (seats, seed) => {
        const random = seeded(seed)
        let game = start(seats)
        for (let step = 0; step < 10_000 && outcome(game) === null; step++) {
          const legalMoves = moves(game)
          expect(legalMoves.length).toBeGreaterThan(0)
          const move = legalMoves[Math.floor(random() * legalMoves.length)] as MaexMove
          const before = game.lives.reduce((a, b) => a + b, 0)
          game = play(game, game.turn, move, random)
          const after = game.lives.reduce((a, b) => a + b, 0)
          expect(before - after).toBeLessThanOrEqual(2)
          expect(game.lives[game.turn]).toBeGreaterThan(0)
        }
        const winner = outcome(game)
        expect(winner).not.toBeNull()
        expect(game.lives.filter((n) => n > 0)).toHaveLength(1)
        expect(game.lives[winner as number]).toBeGreaterThan(0)
      }),
      { numRuns: 50 },
    )
  })
})
