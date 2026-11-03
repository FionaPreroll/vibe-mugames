import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  corners,
  decode,
  encode,
  isPossible,
  LAST,
  type LudoMove,
  type LudoState,
  legal,
  movable,
  moves,
  OUT,
  outcome,
  PIECES,
  play,
  ROLL,
  rollDie,
  square,
  start,
  TRACK,
} from './ludo'

const ROLL_MOVE: LudoMove = { kind: 'roll' }
const piece = (n: number): LudoMove => ({ kind: 'piece', piece: n })

/** A random source that rolls the given numbers, in order. */
function dice(...rolls: number[]): () => number {
  let i = 0
  return () => ((rolls[i++ % rolls.length] ?? 1) - 0.5) / 6
}

/** A random source that always gives the same numbers, for games that can be replayed. */
function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

/** A game with the seats' pieces on these steps, `seat` to move after rolling `die`. */
function at(pieces: number[][], seat = 0, die = 0): LudoState {
  return {
    ...start(pieces.length),
    pieces,
    turn: seat,
    phase: die > 0 ? 'move' : 'roll',
    die,
    rolledBy: die > 0 ? seat : -1,
  }
}

/** Plays a legal move as the seat whose turn it is, and checks it was legal. */
function step(state: LudoState, move: LudoMove, random = dice(1)): LudoState {
  expect(legal(state, state.turn, move)).toBe(true)
  return play(state, state.turn, move, random)
}

describe('Ludo', () => {
  it('starts with every piece in its corner, the first seat to roll', () => {
    for (const seats of [2, 3, 4]) {
      const state = start(seats)
      expect(state.pieces).toHaveLength(seats)
      expect(state.pieces.flat().every((s) => s === OUT)).toBe(true)
      expect(moves(state)).toEqual([ROLL_MOVE])
    }
    expect(() => start(1)).toThrow(RangeError)
    expect(() => start(5)).toThrow(RangeError)
  })

  it('seats two players in opposite corners, with start squares ten apart', () => {
    expect(corners(2)).toEqual([0, 2])
    expect(corners(4)).toEqual([0, 1, 2, 3])
    expect(square(2, 1, 0)).toBe(20)
    expect(square(4, 3, 0)).toBe(30)
    expect(square(4, 3, 15)).toBe(5)
    expect(square(4, 0, OUT)).toBeNull()
    expect(square(4, 0, TRACK)).toBeNull()
  })

  it('rolls a die from 1 to 6', () => {
    expect(rollDie(() => 0)).toBe(1)
    expect(rollDie(() => 0.999_999)).toBe(6)
    expect(rollDie(dice(4))).toBe(4)
  })

  it('gives a player with no piece out three tries for a six', () => {
    let state = start(2)
    state = step(state, ROLL_MOVE, dice(3))
    expect(state).toMatchObject({ turn: 0, phase: 'roll', die: 3, stuck: true, tries: 1 })
    state = step(state, ROLL_MOVE, dice(2))
    expect(state).toMatchObject({ turn: 0, tries: 2 })
    state = step(state, ROLL_MOVE, dice(5))
    expect(state).toMatchObject({ turn: 1, phase: 'roll', die: 5, rolledBy: 0, tries: 0 })
  })

  it('brings a piece out on a six, which rolls again', () => {
    let state = step(start(2), ROLL_MOVE, dice(6))
    expect(state.phase).toBe('move')
    expect(movable(state)).toEqual([0, 1, 2, 3])
    state = step(state, piece(2))
    expect(state.pieces[0]).toEqual([OUT, OUT, 0, OUT])
    expect(state).toMatchObject({ turn: 0, phase: 'roll' })
    state = step(state, ROLL_MOVE, dice(4))
    // Only the piece out can move by four.
    expect(movable(state)).toEqual([2])
    state = step(state, piece(2))
    expect(state.pieces[0]).toEqual([OUT, OUT, 4, OUT])
    expect(state).toMatchObject({ turn: 1, phase: 'roll', moved: { from: 0, to: 4, hit: null } })
  })

  it('rolls only once with a piece on the track', () => {
    const state = step(
      at(
        [
          [5, OUT, OUT, OUT],
          [OUT, OUT, OUT, OUT],
        ],
        0,
      ),
      ROLL_MOVE,
      dice(3),
    )
    expect(state.phase).toBe('move')
    const blocked = step(
      at([
        [5, 8, OUT, OUT],
        [OUT, OUT, OUT, OUT],
      ]),
      ROLL_MOVE,
      dice(3),
    )
    // 5 + 3 is taken by the seat's own piece, but 8 + 3 is free.
    expect(movable(blocked)).toEqual([1])
  })

  it('passes the turn when no piece can move', () => {
    // 38 + 5 is the last home square, which the seat's own piece holds already.
    const near = [LAST, 38, LAST - 1, LAST - 2]
    const stuck = step(at([near, [OUT, OUT, OUT, OUT]]), ROLL_MOVE, dice(5))
    expect(stuck).toMatchObject({ turn: 1, phase: 'roll', die: 5, rolledBy: 0, stuck: true })
    const six = step(at([near, [OUT, OUT, OUT, OUT]]), ROLL_MOVE, dice(6))
    // Six squares on is past home, and no piece is in the corner: but a six still rolls again.
    expect(six).toMatchObject({ turn: 0, phase: 'roll', stuck: true, tries: 0 })
  })

  it('sends a piece it lands on back to its corner', () => {
    // Seat 0's step 12 is square 12; seat 1 (corner 2) is there at its step 32.
    let state = at(
      [
        [9, OUT, OUT, OUT],
        [32, 1, OUT, OUT],
      ],
      0,
      3,
    )
    expect(square(2, 1, 32)).toBe(12)
    state = step(state, piece(0))
    expect(state.pieces[1]).toEqual([OUT, 1, OUT, OUT])
    expect(state.moved).toEqual({ seat: 0, piece: 0, from: 9, to: 12, hit: 1 })
  })

  it('sends a piece on its start square back too, when another comes out onto it', () => {
    let state = at(
      [
        [OUT, OUT, OUT, OUT],
        [20, OUT, OUT, OUT],
      ],
      0,
      6,
    )
    expect(square(2, 1, 20)).toBe(0)
    state = step(state, piece(0))
    expect(state.pieces).toEqual([
      [0, OUT, OUT, OUT],
      [OUT, OUT, OUT, OUT],
    ])
  })

  it('goes home by the exact number, never past the last home square', () => {
    const state = at(
      [
        [38, OUT, OUT, OUT],
        [OUT, OUT, OUT, OUT],
      ],
      0,
      5,
    )
    expect(movable(state)).toEqual([0])
    expect(step(state, piece(0)).pieces[0]?.[0]).toBe(LAST)
    expect(
      movable(
        at(
          [
            [39, OUT, OUT, OUT],
            [OUT, OUT, OUT, OUT],
          ],
          0,
          5,
        ),
      ),
    ).toEqual([])
    // Home pieces move on inside, but not onto each other.
    const home = at(
      [
        [TRACK, TRACK + 2, OUT, OUT],
        [OUT, OUT, OUT, OUT],
      ],
      0,
      2,
    )
    expect(movable(home)).toEqual([])
    expect(
      movable(
        at(
          [
            [TRACK, TRACK + 2, OUT, OUT],
            [OUT, OUT, OUT, OUT],
          ],
          0,
          1,
        ),
      ),
    ).toEqual([0, 1])
  })

  it('ends when one player has all four pieces home', () => {
    let state = at(
      [
        [TRACK, TRACK + 1, TRACK + 2, 37],
        [OUT, OUT, OUT, OUT],
      ],
      0,
      6,
    )
    state = step(state, piece(3))
    expect(outcome(state)).toBe(0)
    expect(moves(state)).toEqual([])
    expect(legal(state, 0, ROLL_MOVE)).toBe(false)
  })

  it('takes moves only from the seat whose turn it is, and only the move it is for', () => {
    const state = start(3)
    expect(legal(state, 1, ROLL_MOVE)).toBe(false)
    expect(legal(state, 0, piece(0))).toBe(false)
    const rolled = step(state, ROLL_MOVE, dice(6))
    expect(legal(rolled, 0, ROLL_MOVE)).toBe(false)
    expect(legal(rolled, 0, piece(0))).toBe(true)
  })

  it('carries moves as numbers', () => {
    expect(encode(ROLL_MOVE)).toEqual([ROLL])
    expect(encode(piece(3))).toEqual([3])
    expect(decode([ROLL])).toEqual(ROLL_MOVE)
    expect(decode([2])).toEqual(piece(2))
    for (const bad of [[], [5], [-1], [1.5], [1, 2]]) expect(decode(bad)).toBeUndefined()
  })

  it('tells a game that could come about from one that could not', () => {
    expect(isPossible(start(4))).toBe(true)
    expect(
      isPossible(
        at([
          [3, 3, OUT, OUT],
          [OUT, OUT, OUT, OUT],
        ]),
      ),
    ).toBe(false)
    expect(
      isPossible(
        at([
          [12, OUT, OUT, OUT],
          [32, OUT, OUT, OUT],
        ]),
      ),
    ).toBe(false)
    expect(
      isPossible(
        at([
          [TRACK, OUT, OUT, OUT],
          [TRACK, OUT, OUT, OUT],
        ]),
      ),
    ).toBe(true)
  })

  it('plays whole games that always end, with pieces never sharing a square', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 4 }), fc.integer(), (seats, seed) => {
        const random = seeded(seed)
        let state = start(seats)
        let turns = 0
        while (outcome(state) === null) {
          const legalMoves = moves(state)
          expect(legalMoves.length).toBeGreaterThan(0)
          const move = legalMoves[Math.floor(random() * legalMoves.length)] as LudoMove
          state = play(state, state.turn, move, random)
          expect(isPossible(state)).toBe(true)
          expect(state.pieces.flat().length).toBe(seats * PIECES)
          turns++
          expect(turns).toBeLessThan(20_000)
        }
        expect(state.pieces[state.winner ?? -1]?.every((s) => s >= TRACK)).toBe(true)
      }),
      { numRuns: 40 },
    )
  })
})
