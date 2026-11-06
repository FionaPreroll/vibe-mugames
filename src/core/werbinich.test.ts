import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  advance,
  decode,
  encode,
  kindOf,
  legal,
  MAX_LOG,
  MAX_QUESTION,
  MAYBE,
  NO,
  names,
  play,
  RIGHT,
  start,
  termNames,
  VOTE_SECONDS,
  view,
  type WhoMove,
  type WhoState,
  waitingFor,
  YES,
} from './werbinich'
import { TERMS } from './whoTerms'

/** Random numbers that always deal the first term left: dog, cat, horse… */
const first = () => 0

const DOG = TERMS.findIndex((term) => term.en === 'dog')
const WITCH = TERMS.findIndex((term) => term.en === 'witch')

/** A game of `seats` with the first terms dealt: seat 0 is the dog, seat 1 the cat… */
const game = (seats: number, together = false) => start(seats, first, together)

const ask = (state: WhoState, seat: number, text: string) =>
  play(state, seat, { kind: 'ask', text })
const guess = (state: WhoState, seat: number, text: string) =>
  play(state, seat, { kind: 'guess', text })
const vote = (state: WhoState, seat: number, v: typeof YES | typeof NO | typeof MAYBE) =>
  play(state, seat, { kind: 'vote', vote: v })

describe('a game of Wer bin ich?', () => {
  it('deals everyone a different term, which all but they see', () => {
    const state = start(8, Math.random)
    expect(new Set(state.terms).size).toBe(8)
    const dealt = game(3)
    expect(dealt.terms).toEqual([0, 1, 2])
    expect(view(dealt, 1).terms).toEqual([0, null, 2])
    expect(view(dealt, -1).terms).toEqual([0, 1, 2])
    expect(view(dealt, 1).kinds).toEqual(['animal', 'animal', 'animal'])
    expect(waitingFor(view(dealt, 1))).toEqual([0])
  })

  it('lets only the one asking ask, and the others answer', () => {
    let state = game(4)
    expect(legal(state, 1, { kind: 'ask', text: 'Can I fly?' })).toBe(false)
    expect(legal(state, 1, { kind: 'vote', vote: YES })).toBe(false)
    state = ask(state, 0, 'Can I fly?')
    expect(state.phase).toBe('vote')
    expect(state.left).toBe(VOTE_SECONDS)
    expect(legal(state, 0, { kind: 'vote', vote: YES })).toBe(false)
    expect(legal(state, 0, { kind: 'ask', text: 'Do I bark?' })).toBe(false)
    expect(waitingFor(view(state, 0))).toEqual([1, 2, 3])
    state = vote(state, 1, NO)
    expect(legal(state, 1, { kind: 'vote', vote: YES })).toBe(false)
    expect(waitingFor(view(state, 0))).toEqual([2, 3])
    state = vote(vote(state, 2, NO), 3, YES)
    // The most said no: the next player asks.
    expect(state.phase).toBe('ask')
    expect(state.asker).toBe(1)
    expect(state.turn).toBe(1)
    expect(state.log).toEqual([
      { seat: 0, text: 'Can I fly?', guess: false, answer: 'no', counts: [1, 2, 0] },
    ])
  })

  it('lets the one asking ask again after a yes, or when the answers are even', () => {
    let state = vote(vote(ask(game(3), 0, 'Do I bark?'), 1, YES), 2, MAYBE)
    expect(state.asker).toBe(0)
    expect(state.log.at(-1)?.answer).toBe('yes')
    state = vote(vote(ask(state, 0, 'Am I big?'), 1, YES), 2, NO)
    expect(state.asker).toBe(0)
    expect(state.log.at(-1)?.answer).toBe('maybe')
  })

  it('counts only the answers given when the time is up', () => {
    let state = vote(ask(game(3), 0, 'Do I bark?'), 1, NO)
    expect(advance(state, VOTE_SECONDS - 1).phase).toBe('vote')
    state = advance(state, VOTE_SECONDS)
    expect(state.log.at(-1)).toMatchObject({ answer: 'no', counts: [0, 1, 0] })
    expect(state.asker).toBe(1)
    // Without a question, no time runs.
    expect(advance(state, 1000)).toBe(state)
  })

  it('solves a guess that names the term, without minding capitals or how it is asked', () => {
    for (const said of ['dog', 'Hund', 'Am I a DOG?', 'Bin ich ein Hund?', 'der Hund']) {
      expect(names(DOG, said)).toBe(true)
    }
    for (const said of ['a', 'Am I', 'Hunde', 'cat', '']) expect(names(DOG, said)).toBe(false)
    expect(
      names(
        TERMS.findIndex((t) => t.en === 'Puss in Boots'),
        'der gestiefelte Kater',
      ),
    ).toBe(true)
    expect(names(WITCH, 'Bin ich die Hexe?')).toBe(true)

    const state = guess(game(3), 0, 'Am I a dog?')
    expect(state.solved).toEqual([0])
    expect(state.asker).toBe(1)
    expect(state.log.at(-1)).toMatchObject({ seat: 0, guess: true, answer: 'right' })
    expect(view(state, 0).terms[0]).toBe(0)
  })

  it('has the others judge any other guess', () => {
    let state = guess(game(3), 0, 'a wolf')
    expect(state.phase).toBe('vote')
    expect(state.question).toEqual({ text: 'a wolf', guess: true })
    state = vote(vote(state, 1, YES), 2, YES)
    expect(state.solved).toEqual([0])
    state = vote(vote(guess(state, 1, 'a tiger'), 0, NO), 2, MAYBE)
    expect(state.log.at(-1)?.answer).toBe('wrong')
    expect(state.solved).toEqual([0])
    // The next who still guesses asks: seat 0 knows theirs.
    expect(state.asker).toBe(2)
  })

  it('passes, and puts out whoever gives up, showing them their term', () => {
    let state = play(game(3), 0, { kind: 'pass' })
    expect(state.asker).toBe(1)
    expect(state.log.at(-1)?.answer).toBe('pass')
    state = play(state, 1, { kind: 'giveUp' })
    expect(state.gaveUp).toEqual([1])
    expect(view(state, 1).terms[1]).toBe(1)
    expect(state.asker).toBe(2)
    state = play(state, 2, { kind: 'pass' })
    expect(state.asker).toBe(0)
  })

  it('ends once all but one know their terms: the first to know wins', () => {
    let state = play(game(3), 0, { kind: 'pass' })
    state = guess(state, 1, 'cat')
    expect(state.solved).toEqual([1])
    expect(state.winner).toBeNull()
    state = guess(state, 2, 'horse')
    expect(state.winner).toBe(1)
    expect(view(state, 0).terms).toEqual([0, 1, 2])
    expect(waitingFor(view(state, 0))).toEqual([])
    expect(legal(state, 0, { kind: 'pass' })).toBe(false)
  })

  it('is a draw when nobody knew theirs', () => {
    expect(play(game(2), 0, { kind: 'giveUp' }).winner).toBe('draw')
  })

  it('remembers only the newest questions', () => {
    let state = game(2)
    for (let n = 0; n < MAX_LOG + 5; n++) state = vote(ask(state, 0, `Question ${n}?`), 1, YES)
    expect(state.log).toHaveLength(MAX_LOG)
    expect(state.asked).toBe(MAX_LOG + 5)
    expect(state.log.at(-1)?.text).toBe(`Question ${MAX_LOG + 4}?`)
  })
})

describe('Wer bin ich? on one device', () => {
  it('shows every term, and has the one asking tap what was said aloud', () => {
    let state = game(3, true)
    expect(view(state, 0).terms).toEqual([0, 1, 2])
    expect(legal(state, 0, { kind: 'ask', text: 'Do I bark?' })).toBe(false)
    expect(legal(state, 1, { kind: 'said', said: YES })).toBe(false)
    state = play(state, 0, { kind: 'said', said: YES })
    expect(state.asker).toBe(0)
    expect(state.log.at(-1)).toMatchObject({ text: null, answer: 'yes' })
    state = play(state, 0, { kind: 'said', said: NO })
    expect(state.asker).toBe(1)
    state = play(state, 1, { kind: 'said', said: RIGHT })
    expect(state.solved).toEqual([1])
    expect(state.asker).toBe(2)
  })
})

describe('terms', () => {
  it('are all different, in either language, and of every kind', () => {
    for (const language of ['de', 'en'] as const) {
      const all = TERMS.flatMap((_, i) => termNames(i, language).map((n) => n.toLowerCase()))
      expect(new Set(all).size).toBe(all.length)
      for (const name of all) expect(name.length).toBeLessThanOrEqual(MAX_QUESTION)
    }
    expect(new Set(TERMS.map((_, i) => kindOf(i)))).toEqual(
      new Set(['animal', 'job', 'figure', 'thing']),
    )
  })
})

describe('Wer bin ich? moves', () => {
  const text = fc
    .string({ minLength: 1, maxLength: 30 })
    .filter((s) => s.trim() === s && s !== '' && !/\p{C}|\s\s/u.test(s))
  const answer = fc.constantFrom(YES, NO, MAYBE)
  const moves = fc.oneof(
    text.map((t): WhoMove => ({ kind: 'ask', text: t })),
    text.map((t): WhoMove => ({ kind: 'guess', text: t })),
    answer.map((v): WhoMove => ({ kind: 'vote', vote: v })),
    answer.map((v): WhoMove => ({ kind: 'said', said: v })),
    fc.constant<WhoMove>({ kind: 'pass' }),
    fc.constant<WhoMove>({ kind: 'giveUp' }),
  )

  it('decode as they were encoded', () => {
    fc.assert(
      fc.property(moves, (move) => {
        expect(decode(encode(move))).toEqual(move)
      }),
    )
  })

  it('refuse anything else', () => {
    for (const bad of [
      [],
      [1],
      [1, 9],
      [2, 0xd800],
      [3],
      [3, 3],
      [3, 0, 0],
      [4, 0],
      [5, 1],
      [6, -1],
      [7],
    ]) {
      expect(decode(bad)).toBeNull()
    }
    expect(decode([1, ...Array<number>(MAX_QUESTION + 1).fill(65)])).toBeNull()
  })
})
