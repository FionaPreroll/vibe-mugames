import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  advance,
  CATEGORIES,
  decode,
  encode,
  fits,
  LETTERS,
  legal,
  letterOf,
  play,
  points,
  ROUNDS,
  STOP_SECONDS,
  start,
  view,
  type WordsMove,
  type WordsState,
  WRITE_SECONDS,
  waitingFor,
  writer,
} from './stadtlandfluss'

/** Random numbers that always pick the first letter left: A, then B, D, E… */
const first = () => 0

/** A round of `seats` players with the letter K. */
function round(seats: number, together = false): WordsState {
  return { ...start(seats, first, together), letters: ['K'] }
}

/** Every answer of a seat, as moves. */
function write(state: WordsState, seat: number, answers: readonly string[]): WordsState {
  return answers.reduce(
    (game, text, category) => play(game, seat, { kind: 'write', category, text }, first),
    state,
  )
}

const KS = ['Köln', 'Kenia', 'Kocher', 'Karl', 'Katze', 'Koch']

describe('a round of Stadt, Land, Fluss', () => {
  it('draws a new letter every round, never C, Q, X or Y', () => {
    for (const bad of 'CQXY') expect(LETTERS).not.toContain(bad)
    const letters = new Set<string>()
    let game = start(2, Math.random)
    for (let n = 0; n < ROUNDS; n++) {
      letters.add(letterOf(game))
      game = { ...game, phase: 'check' }
      game = play(play(game, 0, { kind: 'ready' }, Math.random), 1, { kind: 'ready' }, Math.random)
    }
    expect(letters.size).toBe(ROUNDS)
  })

  it('counts a word that starts with the letter, Ä as A and in any case', () => {
    expect(fits('Ägypten', 'A')).toBe(true)
    expect(fits('  köln', 'K')).toBe(true)
    expect(fits('Berlin', 'K')).toBe(false)
    expect(fits('', 'K')).toBe(false)
  })

  it('lets a player call Stop only with a word for every category, then ten seconds run', () => {
    let game = write(round(3), 0, KS.slice(0, 5))
    expect(legal(game, 0, { kind: 'stop' })).toBe(false)
    game = write(game, 0, KS)
    expect(legal(game, 0, { kind: 'stop' })).toBe(true)
    game = play(game, 0, { kind: 'stop' }, first)
    expect(game.stopper).toBe(0)
    expect(game.left).toBe(STOP_SECONDS)
    // The one who stopped writes no more, the others do, and nobody stops twice.
    expect(legal(game, 0, { kind: 'write', category: 0, text: 'Kiel' })).toBe(false)
    expect(legal(game, 1, { kind: 'write', category: 0, text: 'Kiel' })).toBe(true)
    expect(legal(write(game, 1, KS), 1, { kind: 'stop' })).toBe(false)
    game = advance(game, STOP_SECONDS - 0.5)
    expect(game.phase).toBe('write')
    expect(view(game, 1).left).toBe(1)
    game = advance(game, 1)
    expect(game.phase).toBe('check')
    expect(legal(game, 1, { kind: 'write', category: 0, text: 'Kiel' })).toBe(false)
  })

  it('ends after three minutes without Stop', () => {
    const game = advance(round(2), WRITE_SECONDS)
    expect(game.phase).toBe('check')
    expect(game.left).toBe(0)
  })

  it('shows each player only their own answers while writing, everyone’s once checked', () => {
    let game = write(write(round(2), 0, KS), 1, ['Kiel'])
    expect(view(game, 0).answers).toEqual([KS, null])
    expect(view(game, 1).answers[0]).toBeNull()
    expect(view(game, -1).answers).toEqual([null, null])
    expect(view(game, 1).filled).toEqual([6, 1])
    game = advance(game, WRITE_SECONDS)
    expect(view(game, -1).answers).toEqual([KS, ['Kiel', '', '', '', '', '']])
  })

  it('counts 20 alone, 10 for a word nobody else has, 5 for one someone has, 0 for a misfit', () => {
    let game = write(round(3), 0, ['Köln', 'Kenia', 'Kocher', 'Karl', 'Katze', 'Koch'])
    game = write(game, 1, ['koeln', 'Kuba', '', 'Karl', 'Berlin', ''])
    game = write(game, 2, ['Kiel', 'Kuba', '', '', '', ''])
    game = advance(game, WRITE_SECONDS)
    expect(points(game)).toEqual([
      [10, 10, 20, 5, 20, 20],
      // "koeln" is not "Köln": players may object to such a spelling, not the rules.
      [10, 5, 0, 5, 0, 0],
      [10, 5, 0, 0, 0, 0],
    ])
  })

  it('strikes an answer when more than half of the others object', () => {
    let game = write(write(write(round(4), 0, KS), 1, KS), 2, KS)
    game = advance(game, WRITE_SECONDS)
    const object: WordsMove = { kind: 'object', seat: 0, category: 0 }
    expect(legal(game, 0, object)).toBe(false)
    // Seat 3 wrote nothing: there is nothing to object to.
    expect(legal(game, 0, { kind: 'object', seat: 3, category: 0 })).toBe(false)
    game = play(game, 1, object, first)
    expect(points(game)[0]?.[0]).toBe(5)
    game = play(game, 2, object, first)
    expect(game.objections[0]?.[0]).toEqual([1, 2])
    expect(points(game)[0]?.[0]).toBe(0)
    // Seats 1 and 2 are now alone with Köln: shared between them.
    expect(points(game)[1]?.[0]).toBe(5)
    // An objection taken back.
    game = play(game, 2, object, first)
    expect(points(game)[0]?.[0]).toBe(5)
  })

  it('goes on once everyone is ready, and adds the round to the totals', () => {
    let game = advance(write(round(2), 0, KS), WRITE_SECONDS)
    game = play(game, 0, { kind: 'ready' }, first)
    expect(legal(game, 0, { kind: 'ready' })).toBe(false)
    expect(legal(game, 0, { kind: 'object', seat: 1, category: 0 })).toBe(false)
    expect(waitingFor(view(game, 0))).toEqual([1])
    game = play(game, 1, { kind: 'ready' }, first)
    expect(game.phase).toBe('write')
    expect(game.letters).toEqual(['K', 'A'])
    expect(game.totals).toEqual([120, 0])
    expect(game.answers).toEqual([CATEGORIES.map(() => ''), CATEGORIES.map(() => '')])
  })

  it('ends after five rounds with the most points, or a draw', () => {
    let game = start(2, first)
    for (let n = 0; n < ROUNDS; n++) {
      const letter = letterOf(game)
      game = write(game, 0, [`${letter}x`])
      if (n === 0) game = write(game, 1, [`${letter}y`, `${letter}z`])
      game = advance(game, WRITE_SECONDS)
      game = play(play(game, 0, { kind: 'ready' }, first), 1, { kind: 'ready' }, first)
    }
    expect(game.winner).toBe(0)
    expect(game.totals).toEqual([10 + 4 * 20, 10 + 20])
    expect(legal(game, 0, { kind: 'write', category: 0, text: 'x' })).toBe(false)

    let tie = start(2, first)
    for (let n = 0; n < ROUNDS; n++) {
      tie = advance(tie, WRITE_SECONDS)
      tie = play(play(tie, 0, { kind: 'ready' }, first), 1, { kind: 'ready' }, first)
    }
    expect(tie.winner).toBe('draw')
  })
})

describe('Stadt, Land, Fluss on one device', () => {
  it('lets players write one after the other, as long as they like', () => {
    let game = round(3, true)
    expect(writer(game)).toBe(0)
    expect(advance(game, 1000)).toBe(game)
    expect(legal(game, 1, { kind: 'write', category: 0, text: 'Kiel' })).toBe(false)
    game = write(game, 0, ['Kiel'])
    // Done without a word for every category.
    expect(legal(game, 0, { kind: 'stop' })).toBe(true)
    game = play(game, 0, { kind: 'stop' }, first)
    expect(writer(game)).toBe(1)
    expect(view(game, 1).answers).toEqual([null, CATEGORIES.map(() => ''), null])
    expect(waitingFor(view(game, 1))).toEqual([1])
    game = play(play(game, 1, { kind: 'stop' }, first), 2, { kind: 'stop' }, first)
    expect(game.phase).toBe('check')
    expect(waitingFor(view(game, 2))).toEqual([])
  })

  it('strikes an answer at a tap, and goes on at one', () => {
    let game = write(round(2, true), 0, KS)
    game = play(play(game, 0, { kind: 'stop' }, first), 1, { kind: 'stop' }, first)
    // Anyone may strike, even their own answer.
    game = play(game, 0, { kind: 'object', seat: 0, category: 1 }, first)
    expect(points(game)[0]).toEqual([20, 0, 20, 20, 20, 20])
    game = play(game, 1, { kind: 'object', seat: 0, category: 1 }, first)
    expect(points(game)[0]?.[1]).toBe(20)
    game = play(game, 1, { kind: 'ready' }, first)
    expect(game.letters).toHaveLength(2)
    expect(game.totals).toEqual([120, 0])
  })
})

describe('moves of Stadt, Land, Fluss', () => {
  it('travel as numbers and back', () => {
    const moves: WordsMove[] = [
      { kind: 'write', category: 3, text: 'Ölaf 🦊' },
      { kind: 'stop' },
      { kind: 'object', seat: 2, category: 5 },
      { kind: 'ready' },
    ]
    for (const move of moves) expect(decode(encode(move))).toEqual(move)
  })

  it('turn down anything else', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -3, max: 0x110000 }), { maxLength: 40 }),
        (numbers) => {
          const move = decode(numbers)
          if (move) expect(decode(encode(move))).toEqual(move)
        },
      ),
    )
    expect(decode([1, 6, 65])).toBeNull()
    expect(decode([1, 0, 10])).toBeNull()
    expect(decode([1, 0, ...Array.from({ length: 25 }, () => 65)])).toBeNull()
    expect(decode([2, 0])).toBeNull()
    expect(decode([3, 0, 6])).toBeNull()
    expect(decode([5])).toBeNull()
  })
})
