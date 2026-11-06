import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  advance,
  CHOOSE_SECONDS,
  DRAW_SECONDS,
  decode,
  drawerOf,
  encode,
  GRID,
  INKS,
  legal,
  MAX_FEED,
  MAX_INK,
  MAX_STROKE,
  matches,
  names,
  play,
  SHOW_SECONDS,
  type SketchMove,
  type SketchState,
  start,
  turnsFor,
  view,
  waitingFor,
} from './montagsmaler'
import { SKETCH_WORDS } from './sketchWords'

/** Random numbers that always pick the first word left: Haus, Baum, Sonne… */
const first = () => 0

/** A game of `seats` where seat 0 has chosen Haus and draws it. */
function drawing(seats: number, together = false): SketchState {
  return play(start(seats, first, together), 0, { kind: 'choose', option: 0 })
}

const guess = (state: SketchState, seat: number, text: string) =>
  play(state, seat, { kind: 'guess', text })

describe('a turn of Montagsmaler', () => {
  it('lets the one drawing choose from three words only they see', () => {
    const game = start(3, first)
    expect(game.phase).toBe('choose')
    expect(game.options).toEqual([0, 1, 2])
    expect(view(game, 0).options).toEqual([0, 1, 2])
    expect(view(game, 1).options).toEqual([])
    expect(waitingFor(view(game, 1))).toEqual([0])
    expect(legal(game, 1, { kind: 'choose', option: 0 })).toBe(false)
    const chosen = play(game, 0, { kind: 'choose', option: 2 })
    expect(chosen.phase).toBe('draw')
    expect(chosen.left).toBe(DRAW_SECONDS)
    expect(view(chosen, 0).word).toBe(2)
    expect(view(chosen, 1).word).toBeNull()
    expect(view(chosen, 1).hint).toEqual({ de: '_____', en: '___' })
  })

  it('chooses the first word when the one drawing takes too long', () => {
    const game = advance(start(2, first), CHOOSE_SECONDS, first)
    expect(game.phase).toBe('draw')
    expect(game.word).toBe(0)
  })

  it('takes strokes only from the one drawing, each begun by its ink', () => {
    const game = drawing(2)
    const line = { kind: 'draw', ink: [-1, 10, 11, 12] } as const
    expect(legal(game, 1, line)).toBe(false)
    expect(legal(game, 0, { kind: 'draw', ink: [10, 11] })).toBe(false)
    expect(legal(game, 0, { kind: 'undo' })).toBe(false)
    let drawn = play(game, 0, line)
    // A stroke may go on in the next move, and a new one may start.
    drawn = play(drawn, 0, { kind: 'draw', ink: [13, -3, 50] })
    expect(view(drawn, 1).ink).toEqual([-1, 10, 11, 12, 13, -3, 50])
    drawn = play(drawn, 0, { kind: 'undo' })
    expect(drawn.ink).toEqual([-1, 10, 11, 12, 13])
    drawn = play(drawn, 0, { kind: 'clear' })
    expect(drawn.ink).toEqual([])
  })

  it('keeps a drawing small enough to send', () => {
    const game = {
      ...drawing(2),
      ink: [-1, ...Array<number>(MAX_INK - 1).fill(5)],
    }
    expect(legal(game, 0, { kind: 'draw', ink: [6] })).toBe(false)
    expect(legal({ ...game, ink: game.ink.slice(1) }, 0, { kind: 'draw', ink: [6] })).toBe(true)
  })

  it('gives 3, 2 and 1 points to those who get it, and 1 to the one drawing for each', () => {
    let game = drawing(5)
    game = guess(game, 2, 'Hütte')
    expect(game.guessed).toEqual([])
    game = guess(game, 2, ' HAUS ')
    game = guess(game, 4, 'house')
    expect(legal(game, 2, { kind: 'guess', text: 'Haus' })).toBe(false)
    expect(legal(game, 0, { kind: 'guess', text: 'Haus' })).toBe(false)
    game = guess(game, 1, 'haus')
    expect(game.phase).toBe('draw')
    game = guess(game, 3, 'Haus')
    // Everyone got it: the word is shown.
    expect(game.phase).toBe('show')
    expect(game.points).toEqual([4, 1, 3, 1, 2])
    expect(game.gained).toEqual([4, 1, 3, 1, 2])
    expect(view(game, 3).word).toBe(0)
    expect(game.feed.map((g) => g.text)).toEqual(['Hütte', null, null, null, null])
  })

  it('tells only the one guessing that their guess was close', () => {
    let game = play(start(3, first), 0, { kind: 'choose', option: 2 })
    game = guess(game, 1, 'Sonen')
    expect(view(game, 1).feed[0]).toEqual({
      seat: 1,
      text: 'Sonen',
      close: true,
    })
    expect(view(game, 2).feed[0]?.close).toBe(false)
    // Short words are never close: too many guesses would be.
    game = guess(game, 2, 'sum')
    expect(view(game, 2).feed[1]?.close).toBe(false)
  })

  it('remembers only the newest guesses', () => {
    let game = drawing(2)
    for (let n = 0; n < MAX_FEED + 5; n++) game = guess(game, 1, `guess ${n}`)
    expect(game.feed).toHaveLength(MAX_FEED)
    expect(game.feed.at(-1)?.text).toBe(`guess ${MAX_FEED + 4}`)
  })

  it('shows a letter at half time and another with a quarter left, in both languages', () => {
    const game = { ...drawing(2), word: 6 }
    expect(view(game, 1).hint).toEqual({ de: '__________', en: '_______' })
    const half = advance(game, DRAW_SECONDS / 2, first)
    expect(view(half, 1).hint).toEqual({ de: 'R_________', en: 'r______' })
    const quarter = advance(half, DRAW_SECONDS / 4, first)
    expect(view(quarter, 1).hint.de.replaceAll('_', '')).toHaveLength(2)
    expect(view(quarter, 1).hint.en.replaceAll('_', '')).toHaveLength(2)
    // The one drawing has the word itself, not a hint.
    expect(view(quarter, 0).hint).toEqual({ de: '', en: '' })
  })

  it('shows at most a third of a short word, and spaces as they are', () => {
    const sun = play(start(2, first), 0, { kind: 'choose', option: 2 })
    expect(view(advance(sun, DRAW_SECONDS * 0.8, first), 1).hint.en).toBe('s__')
    const ice = SKETCH_WORDS.findIndex((w) => w.en === 'ice cream')
    const game = { ...drawing(2), word: ice }
    expect(view(game, 1).hint.en).toBe('___ _____')
  })

  it('shows the word when time is up, then passes the pen on', () => {
    let game = advance(drawing(3), DRAW_SECONDS, first)
    expect(game.phase).toBe('show')
    expect(view(game, 1).word).toBe(0)
    expect(legal(game, 1, { kind: 'guess', text: 'Haus' })).toBe(false)
    expect(waitingFor(view(game, 1))).toEqual([])
    game = advance(game, SHOW_SECONDS, first)
    expect(game.phase).toBe('choose')
    expect(drawerOf(game)).toBe(1)
    expect(game.ink).toEqual([])
    expect(game.gained).toEqual([0, 0, 0])
    // Words already offered are not offered again.
    expect(game.options).toEqual([3, 4, 5])
  })

  it('ends after everyone drew, twice with up to three players', () => {
    expect(turnsFor(2)).toBe(4)
    expect(turnsFor(3)).toBe(6)
    expect(turnsFor(4)).toBe(4)
    let game = start(2, first)
    for (let turn = 0; turn < 4; turn++) {
      game = advance(game, CHOOSE_SECONDS, first)
      game =
        turn === 1
          ? guess(game, 0, names(game.word ?? 0, 'en')[0] ?? '')
          : advance(game, DRAW_SECONDS, first)
      expect(game.phase).toBe('show')
      expect(game.winner).toBeNull()
      game = advance(game, SHOW_SECONDS, first)
    }
    expect(game.winner).toBe(0)
    expect(game.points).toEqual([3, 1])
    expect(advance(game, 100, first)).toBe(game)
    expect(legal(game, 0, { kind: 'draw', ink: [-1] })).toBe(false)
  })

  it('is a draw when the best are level', () => {
    let game = start(2, first)
    // Nobody draws: every word runs out of time.
    for (let n = 0; n < 4 * 3; n++) game = advance(game, 200, first)
    expect(game.winner).toBe('draw')
  })
})

describe('Montagsmaler on one device', () => {
  it('lets the one drawing mark who said the word aloud, and nobody type', () => {
    let game = drawing(3, true)
    expect(legal(game, 1, { kind: 'guess', text: 'Haus' })).toBe(false)
    expect(legal(game, 1, { kind: 'got', seat: 2 })).toBe(false)
    expect(legal(game, 0, { kind: 'got', seat: 0 })).toBe(false)
    game = play(game, 0, { kind: 'got', seat: 2 })
    expect(legal(game, 0, { kind: 'got', seat: 2 })).toBe(false)
    game = play(game, 0, { kind: 'got', seat: 1 })
    expect(game.phase).toBe('show')
    expect(game.points).toEqual([2, 2, 3])
  })
})

describe('words to draw', () => {
  it('count every name, in either language, without minding case or accents', () => {
    const carrot = SKETCH_WORDS.findIndex((w) => w.en === 'carrot')
    for (const said of ['Karotte', 'möhre', 'MOHRRUEBE', 'carrot']) {
      expect(matches(carrot, said.replace('UE', 'Ü'))).toBe(true)
    }
    expect(matches(carrot, 'Karotten')).toBe(false)
    expect(matches(carrot, '')).toBe(false)
    expect(names(carrot, 'de')[0]).toBe('Karotte')
  })

  it('are all different, and drawable in short words', () => {
    for (const language of ['de', 'en'] as const) {
      const all = SKETCH_WORDS.flatMap((w) => w[language].split('|').map((n) => n.toLowerCase()))
      expect(new Set(all).size).toBe(all.length)
      for (const name of all) expect(name.length).toBeLessThanOrEqual(20)
    }
  })
})

describe('Montagsmaler moves', () => {
  const moves = fc.oneof(
    fc
      .array(fc.integer({ min: -INKS, max: GRID * GRID - 1 }), {
        minLength: 1,
        maxLength: MAX_STROKE,
      })
      .map((ink): SketchMove => ({ kind: 'draw', ink })),
    fc.constant<SketchMove>({ kind: 'undo' }),
    fc.constant<SketchMove>({ kind: 'clear' }),
    fc.integer({ min: 0, max: 2 }).map((option): SketchMove => ({ kind: 'choose', option })),
    fc
      .string({ minLength: 1, maxLength: 20 })
      .filter((s) => s.trim() === s && s !== '' && !/\p{C}/u.test(s))
      .map((text): SketchMove => ({ kind: 'guess', text })),
    fc.integer({ min: 0, max: 7 }).map((seat): SketchMove => ({ kind: 'got', seat })),
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
      [1, GRID * GRID],
      [1, -INKS - 1],
      [1, 0.5],
      [1, ...Array<number>(MAX_STROKE + 1).fill(0)],
      [2, 0],
      [4, 3],
      [4, -1],
      [6],
      [6, 1, 2],
      [5],
      [9, 0],
    ]) {
      expect(decode(bad)).toBeNull()
    }
  })
})
