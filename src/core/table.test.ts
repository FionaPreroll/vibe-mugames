import { describe, expect, it } from 'vitest'
import { Table } from './table'

/** A table with players 0 (the host), 1 and 2 as given. */
function table(...names: string[]): Table {
  const t = new Table()
  names.forEach((name, id) => {
    t.join(id, name)
  })
  return t
}

/** Plays Tic Tac Toe moves in turn, each as the player whose turn it is. */
function play(t: Table, ...cells: number[]): void {
  for (const cell of cells) {
    const s = t.state()
    const id = s.seats[s.turn]
    if (id === undefined) throw new Error('nobody to move')
    expect(t.move(id, 'tictactoe', s.moveNo, cell)).toBe(true)
  }
}

describe('the table', () => {
  it('seats the first two players and lets them move in turn', () => {
    const t = table('Ada', 'Bo')
    expect(t.choose('tictactoe')).toBe(true)
    expect(t.state()).toMatchObject({ game: 'tictactoe', seats: [0, 1], turn: 0, moveNo: 0 })
    // Not Bo's turn, nor a move meant for later.
    expect(t.move(1, 'tictactoe', 0, 4)).toBe(false)
    expect(t.move(0, 'tictactoe', 1, 4)).toBe(false)
    expect(t.move(0, 'tictactoe', 0, 4)).toBe(true)
    // The same move again, as a phone might resend it: taken once.
    expect(t.move(0, 'tictactoe', 0, 4)).toBe(false)
    expect(t.state()).toMatchObject({ turn: 1, moveNo: 1 })
    // Another game's move, or an illegal one, is not taken.
    expect(t.move(1, 'fourinarow', 1, 3)).toBe(false)
    expect(t.move(1, 'tictactoe', 1, 4)).toBe(false)
  })

  it('needs enough players who are here to start', () => {
    const t = table('Ada')
    expect(t.choose('tictactoe')).toBe(false)
    t.join(1, 'Bo')
    t.leave(1)
    expect(t.choose('tictactoe')).toBe(false)
    t.join(1, 'Bo')
    expect(t.choose('fourinarow')).toBe(true)
  })

  it('counts a win, and takes no move after the end', () => {
    const t = table('Ada', 'Bo')
    t.choose('tictactoe')
    play(t, 0, 3, 1, 4, 2)
    expect(t.state().outcome).toEqual({ winner: 0, line: [0, 1, 2] })
    expect(t.state().scores).toEqual({ 0: 1 })
    expect(t.move(1, 'tictactoe', 5, 5)).toBe(false)
  })

  it('lets two players take turns in starting', () => {
    const t = table('Ada', 'Bo')
    expect(t.rematch()).toBe(false)
    t.choose('tictactoe')
    play(t, 0, 3, 1, 4, 2)
    expect(t.rematch()).toBe(true)
    expect(t.state()).toMatchObject({ seats: [1, 0], turn: 0, moveNo: 0, outcome: null })
  })

  it('keeps the winner at the board and sends the loser to the back of the queue', () => {
    const t = table('Ada', 'Bo', 'Cy')
    t.choose('tictactoe')
    expect(t.state().seats).toEqual([0, 1])
    // Bo wins.
    play(t, 0, 3, 1, 4, 8, 5)
    expect(t.state().outcome).toMatchObject({ winner: 1 })
    t.rematch()
    expect(t.state().seats).toEqual([1, 2])
  })

  it('sends both players to the back after a draw', () => {
    const t = table('Ada', 'Bo', 'Cy', 'Di')
    t.choose('tictactoe')
    play(t, 0, 1, 2, 4, 3, 5, 7, 6, 8)
    expect(t.state().outcome).toBe('draw')
    t.rematch()
    expect(t.state().seats).toEqual([2, 3])
  })

  it('keeps a player’s place and score while they are away', () => {
    const t = table('Ada', 'Bo')
    t.choose('tictactoe')
    play(t, 3, 0, 4, 1, 8, 2)
    t.leave(1)
    expect(t.state().players).toEqual([
      { id: 0, name: 'Ada', away: false },
      { id: 1, name: 'Bo', away: true },
    ])
    t.join(1, 'Bo')
    expect(t.state().players[1]?.away).toBe(false)
    expect(t.state().scores).toEqual({ 1: 1 })
  })

  it('goes back to the lobby', () => {
    const t = table('Ada', 'Bo')
    t.choose('fourinarow')
    t.lobby()
    expect(t.state()).toMatchObject({ game: null, seats: [], board: [], outcome: null })
  })
})
