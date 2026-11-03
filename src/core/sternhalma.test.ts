import { describe, expect, it } from 'vitest'
import { EMPTY, isLegal, plain } from './board'
import {
  home,
  STERN_HOLES,
  STERN_QUIET_ROUNDS,
  STERN_TRIANGLE,
  sternArrived,
  sternhalma,
  sternSeats,
  target,
  triangle,
} from './sternhalma'

const holeAt = (x: number, y: number) => {
  const hole = STERN_HOLES.findIndex(([hx, hy]) => hx === x && hy === y)
  expect(hole).toBeGreaterThanOrEqual(0)
  return hole
}

const empty = () => Array(STERN_HOLES.length).fill(EMPTY) as number[]

describe('Sternhalma', () => {
  it('has a star of 121 holes, ten in each of six triangles', () => {
    expect(STERN_HOLES).toHaveLength(121)
    for (let t = 0; t < 6; t++) expect(triangle(t)).toHaveLength(10)
    expect(STERN_TRIANGLE.filter((t) => t === -1)).toHaveLength(61)
    // The tip at the top, and the bottom, are each other's opposites.
    expect(STERN_TRIANGLE[0]).toBe(3)
    expect(STERN_TRIANGLE[120]).toBe(0)
  })

  it('seats every player across from another, or from an empty triangle', () => {
    expect([0, 1].map((s) => home(s, 2))).toEqual([0, 3])
    expect([0, 1].map((s) => target(s, 2))).toEqual([3, 0])
    expect([0, 1, 2].map((s) => target(s, 3))).toEqual([3, 5, 1])
    expect([0, 1, 2, 3].map((s) => home(s, 4))).toEqual([0, 1, 3, 4])
    for (let seats = 2; seats <= 6; seats++) {
      const start = sternhalma.start(seats)
      expect(sternSeats(start.board)).toBe(seats)
      for (let seat = 0; seat < seats; seat++) {
        expect(start.board.filter((cell) => cell === seat)).toHaveLength(10)
        expect(triangle(home(seat, seats)).every((hole) => start.board[hole] === seat)).toBe(true)
      }
    }
  })

  it('steps to a free neighbouring hole', () => {
    const board = empty()
    const from = holeAt(12, 8)
    board[from] = 0
    board[holeAt(0, 16 - 4)] = 1
    const moves = sternhalma.moves(plain(board, 0))
    expect(moves).toHaveLength(6)
    expect(moves).toContainEqual([from, holeAt(14, 8)])
    expect(moves).toContainEqual([from, holeAt(11, 7)])
  })

  it('jumps over pieces, anyone’s, again and again, by the shortest way to each hole', () => {
    const board = empty()
    const from = holeAt(12, 8)
    board[from] = 0
    board[holeAt(13, 9)] = 1 // over it to (14, 10)
    board[holeAt(15, 9)] = 0 // then from (14, 10) over it to (16, 8)
    board[holeAt(16, 10)] = 1 // and from (14, 10) to (18, 10)
    const moves = sternhalma.moves(plain(board, 0)).filter((move) => move[0] === from)
    expect(moves).toContainEqual([from, holeAt(14, 10)])
    expect(moves).toContainEqual([from, holeAt(14, 10), holeAt(16, 8)])
    expect(moves).toContainEqual([from, holeAt(14, 10), holeAt(18, 10)])
    // Each hole is reached once, by one way.
    const ends = moves.map((move) => move[move.length - 1])
    expect(new Set(ends).size).toBe(ends.length)
    expect(ends).not.toContain(from)

    const after = sternhalma.play(plain(board, 0), [from, holeAt(14, 10), holeAt(18, 10)])
    expect(after.board[from]).toBe(EMPTY)
    expect(after.board[holeAt(18, 10)]).toBe(0)
    // Nothing is taken.
    expect(after.board[holeAt(13, 9)]).toBe(1)
    expect(after.turn).toBe(1)
  })

  it('opens with a step or a jump out of the triangle', () => {
    const start = sternhalma.start(2)
    const moves = sternhalma.moves(start)
    expect(moves.length).toBeGreaterThan(0)
    for (const move of moves) {
      expect(start.board[move[0] ?? -1]).toBe(0)
      expect(start.board[move[move.length - 1] ?? -1]).toBe(EMPTY)
    }
    expect(isLegal(sternhalma, start, [holeAt(12, 16), holeAt(12, 14)])).toBe(false)
  })

  it('is won by filling the opposite triangle', () => {
    const board = empty()
    const goal = triangle(target(0, 2))
    const last = holeAt(9, 3)
    const from = holeAt(10, 4)
    for (const hole of goal) board[hole] = hole === last ? EMPTY : 0
    board[from] = 0
    board[holeAt(12, 16)] = 1
    const before = plain(board, 0)
    expect(sternhalma.outcome(before)).toBeNull()
    expect(sternArrived(before)).toBe(9)
    const after = sternhalma.play(before, [from, last])
    expect(sternhalma.outcome(after)).toEqual({ winner: 0, line: [...goal] })
  })

  it('cannot be spoiled by a piece that never leaves its own triangle', () => {
    const board = empty()
    const goal = triangle(target(0, 2))
    // Seat 1 keeps a piece at home, in seat 0's goal: the rest of it full is enough.
    board[goal[0] ?? 0] = 1
    for (const hole of goal.slice(1)) board[hole] = 0
    expect(sternhalma.outcome(plain(board, 1))).toMatchObject({ winner: 0 })
    // In a game of three, the goal is nobody's home: a piece passing through holds it up.
    const three = empty()
    const goal3 = triangle(target(0, 3))
    three[goal3[0] ?? 0] = 1
    for (const hole of goal3.slice(1)) three[hole] = 0
    three[triangle(home(2, 3))[0] ?? 0] = 2
    expect(sternhalma.outcome(plain(three, 2))).toBeNull()
  })

  it('is a draw after many rounds in which no piece arrives', () => {
    const start = sternhalma.start(3)
    expect(sternhalma.outcome({ ...start, quiet: STERN_QUIET_ROUNDS * 3 - 1 })).toBeNull()
    expect(sternhalma.outcome({ ...start, quiet: STERN_QUIET_ROUNDS * 3 })).toBe('draw')
  })

  it('passes over a player who cannot move', () => {
    // Seat 1's only piece sits at the tip, boxed in by seat 0's: seat 0 moves, then seat 0 again.
    const board = empty()
    const tip = holeAt(12, 0)
    board[tip] = 1
    for (const hole of [holeAt(11, 1), holeAt(13, 1), holeAt(10, 2), holeAt(14, 2)]) board[hole] = 0
    board[holeAt(12, 2)] = 0
    board[holeAt(12, 8)] = 0
    const after = sternhalma.play(plain(board, 0), [holeAt(12, 8), holeAt(14, 8)])
    expect(after.turn).toBe(0)
  })
})
