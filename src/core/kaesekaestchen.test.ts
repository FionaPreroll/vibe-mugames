import { describe, expect, it } from 'vitest'
import { EMPTY, isLegal, type Position } from './board'
import {
  ACROSS,
  across,
  BOXES,
  box,
  boxCounts,
  boxesBeside,
  closedBox,
  down,
  kaesekaestchen,
  LINES,
  sides,
} from './kaesekaestchen'

function playAll(lines: number[], from = kaesekaestchen.start()): Position {
  let position = from
  for (const line of lines) {
    expect(isLegal(kaesekaestchen, position, [line])).toBe(true)
    position = kaesekaestchen.play(position, [line])
  }
  return position
}

describe('Käsekästchen', () => {
  it('has 60 lines between 6 by 6 dots, and 25 boxes', () => {
    expect(LINES).toBe(60)
    expect(kaesekaestchen.cells).toBe(85)
    expect(kaesekaestchen.moves(kaesekaestchen.start())).toHaveLength(60)
    expect(sides(box(0, 0))).toEqual([0, BOXES, ACROSS, ACROSS + 1])
    expect(boxesBeside(across(2, 0))).toEqual([box(2, 0)])
    expect(boxesBeside(across(2, 3))).toEqual([box(2, 2), box(2, 3)])
    expect(boxesBeside(down(0, 4))).toEqual([box(0, 4)])
    expect(boxesBeside(down(5, 4))).toEqual([box(4, 4)])
  })

  it('passes the turn after a line that closes no box', () => {
    const after = playAll([across(0, 0)])
    expect(after.turn).toBe(1)
    expect(after.board[across(0, 0)]).toBe(0)
    expect(closedBox(after.board, [across(0, 0)])).toBe(false)
  })

  it('gives a box to whoever draws its fourth side, who draws again', () => {
    // Seat 0 top, seat 1 left, seat 0 right, seat 1 bottom: seat 1 closes it.
    const after = playAll([across(0, 0), down(0, 0), down(1, 0), across(0, 1)])
    expect(after.board[box(0, 0)]).toBe(1)
    expect(after.turn).toBe(1)
    expect(closedBox(after.board, [across(0, 1)])).toBe(true)
    expect(boxCounts(after.board)).toEqual([0, 1])
  })

  it('closes two boxes with one line', () => {
    // Two boxes side by side, all drawn but the line between them.
    const lines = [across(0, 0), across(1, 0), across(0, 1), across(1, 1), down(0, 0), down(2, 0)]
    const before = playAll(lines)
    const seat = before.turn
    const after = kaesekaestchen.play(before, [down(1, 0)])
    expect(after.board[box(0, 0)]).toBe(seat)
    expect(after.board[box(1, 0)]).toBe(seat)
    expect(after.turn).toBe(seat)
  })

  it('takes only lines not yet drawn, never a box', () => {
    const after = playAll([across(0, 0)])
    expect(isLegal(kaesekaestchen, after, [across(0, 0)])).toBe(false)
    expect(isLegal(kaesekaestchen, after, [box(0, 0)])).toBe(false)
    expect(kaesekaestchen.play(after, [across(0, 0)])).toBe(after)
    expect(kaesekaestchen.play(after, [LINES])).toBe(after)
  })

  it('ends once every line is drawn, won by more boxes', () => {
    let position = kaesekaestchen.start()
    for (let line = 0; line < LINES; line++) {
      expect(kaesekaestchen.outcome(position)).toBeNull()
      position = kaesekaestchen.play(position, [line])
    }
    const [a, b] = boxCounts(position.board)
    expect(a + b).toBe(25)
    expect(position.board.slice(LINES)).not.toContain(EMPTY)
    expect(kaesekaestchen.outcome(position)).toEqual({ winner: a > b ? 0 : 1, line: [] })
  })
})
