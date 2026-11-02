import { describe, expect, it } from 'vitest'
import { decode, encode, moves } from './miaumiau'
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
    const id = s.seats[s.position?.turn ?? -1]
    if (id === undefined) throw new Error('nobody to move')
    expect(t.move(id, 'tictactoe', s.moveNo, [cell])).toBe(true)
  }
}

describe('the table', () => {
  it('seats the first two players and lets them move in turn', () => {
    const t = table('Ada', 'Bo')
    expect(t.choose('tictactoe')).toBe(true)
    expect(t.state()).toMatchObject({ game: 'tictactoe', seats: [0, 1], moveNo: 0, last: null })
    expect(t.state().position?.turn).toBe(0)
    // Not Bo's turn, nor a move meant for later.
    expect(t.move(1, 'tictactoe', 0, [4])).toBe(false)
    expect(t.move(0, 'tictactoe', 1, [4])).toBe(false)
    expect(t.move(0, 'tictactoe', 0, [4])).toBe(true)
    // The same move again, as a phone might resend it: taken once.
    expect(t.move(0, 'tictactoe', 0, [4])).toBe(false)
    expect(t.state()).toMatchObject({ moveNo: 1, last: [4] })
    expect(t.state().position?.turn).toBe(1)
    // Another game's move, or an illegal one, is not taken.
    expect(t.move(1, 'fourinarow', 1, [3])).toBe(false)
    expect(t.move(1, 'tictactoe', 1, [4])).toBe(false)
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
    expect(t.move(1, 'tictactoe', 5, [5])).toBe(false)
  })

  it('lets two players take turns in starting', () => {
    const t = table('Ada', 'Bo')
    expect(t.rematch()).toBe(false)
    t.choose('tictactoe')
    play(t, 0, 3, 1, 4, 2)
    expect(t.rematch()).toBe(true)
    expect(t.state()).toMatchObject({ seats: [1, 0], moveNo: 0, outcome: null, last: null })
    expect(t.state().position?.turn).toBe(0)
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

  it('lets the rules decide whose turn it is: a mill in Mühle takes a piece first', () => {
    const t = table('Ada', 'Bo')
    t.choose('muehle')
    for (const [id, point] of [
      [0, 0],
      [1, 8],
      [0, 1],
      [1, 9],
      [0, 2],
    ] as const) {
      expect(t.move(id, 'muehle', t.state().moveNo, [point])).toBe(true)
    }
    // Ada closed a mill: still her turn, to take one of Bo's pieces.
    expect(t.state().position).toMatchObject({ turn: 0, phase: 'remove' })
    expect(t.move(1, 'muehle', 5, [10])).toBe(false)
    expect(t.move(0, 'muehle', 5, [3])).toBe(false)
    expect(t.move(0, 'muehle', 5, [8])).toBe(true)
    expect(t.state().position).toMatchObject({ turn: 1, phase: 'move' })
    expect(t.state().last).toEqual([8])
  })

  it('takes a jump of several squares in Dame as one move', () => {
    const t = table('Ada', 'Bo')
    t.choose('dame')
    // Ada c3-d4, Bo f6-e5, Ada d4xf6 (a jump), …: here only the first steps.
    expect(t.move(0, 'dame', 0, [42, 35])).toBe(true)
    expect(t.move(1, 'dame', 1, [21, 28])).toBe(true)
    expect(t.move(0, 'dame', 2, [35, 28])).toBe(false)
    expect(t.move(0, 'dame', 2, [35, 21])).toBe(true)
    expect(t.state().position?.board[28]).toBe(-1)
  })

  it('seats two to six players at Miau-Miau, and shows each only their own hand', () => {
    const t = table('Ada')
    expect(t.choose('miaumiau')).toBe(false)
    for (const [id, name] of ['Bo', 'Cy', 'Di', 'Ed', 'Fy', 'Gu'].entries()) t.join(id + 1, name)
    expect(t.choose('miaumiau')).toBe(true)
    const all = t.state()
    expect(all.seats).toEqual([0, 1, 2, 3, 4, 5])
    expect(all.position).toBeNull()
    // Gu watches, as anyone does without an id: no cards at all.
    expect(t.state(6).cards?.hand).toEqual([])
    expect(all.cards?.hand).toEqual([])
    const ada = t.state(0).cards
    const bo = t.state(1).cards
    expect(ada?.hand).toHaveLength(5)
    expect(ada?.counts).toEqual([5, 5, 5, 5, 5, 5])
    expect(ada?.hand.some((card) => bo?.hand.includes(card))).toBe(false)
  })

  it('takes a move of Miau-Miau only from the player whose turn it is, if the rules allow it', () => {
    const t = new Table(() => 0.5)
    t.join(0, 'Ada')
    t.join(1, 'Bo')
    t.choose('miaumiau')
    expect(t.move(1, 'miaumiau', 0, encode({ kind: 'draw' }))).toBe(false)
    // A card Ada does not hold, and numbers that stand for no move.
    const theirs = t.state(1).cards?.hand[0] ?? -1
    expect(t.move(0, 'miaumiau', 0, encode({ kind: 'play', card: theirs }))).toBe(false)
    expect(t.move(0, 'miaumiau', 0, [99])).toBe(false)
    expect(t.move(0, 'miaumiau', 0, encode({ kind: 'draw' }))).toBe(true)
    expect(t.state(0).cards?.counts[0]).toBe(6)
    expect(t.state().last).toEqual(encode({ kind: 'draw' }))
  })

  it('plays Miau-Miau to its end and counts the win', () => {
    const t = new Table(() => 0.3)
    for (const [id, name] of ['Ada', 'Bo', 'Cy'].entries()) t.join(id, name)
    t.choose('miaumiau')
    let random = 7
    // Each player in turn makes a legal move, as their phone would offer it.
    for (let i = 0; i < 3000 && t.state().outcome === null; i++) {
      const s = t.state()
      const turn = s.cards?.turn ?? 0
      const id = s.seats[turn] ?? -1
      const cards = (t as unknown as { cards: Parameters<typeof moves>[0] }).cards
      const options = moves(cards)
      random = (random * 31 + 11) % 1009
      const move = options[random % options.length]
      if (!move) throw new Error('no move')
      expect(decode(encode(move))).toEqual(move)
      expect(t.move(id, 'miaumiau', s.moveNo, encode(move))).toBe(true)
    }
    const end = t.state().outcome
    expect(end).not.toBeNull()
    if (end !== null && end !== 'draw') {
      expect(end.line).toEqual([])
      const winner = t.state().seats[end.winner] ?? -1
      expect(t.state().scores[winner]).toBe(1)
      expect(t.state(winner).cards?.hand).toEqual([])
    }
  })

  it('keeps the winner of a game for more than two, and sends the others to the back', () => {
    const t = new Table()
    for (const [id, name] of ['Ada', 'Bo', 'Cy', 'Di'].entries()) t.join(id, name)
    t.choose('miaumiau')
    // Only three are here when the game starts: Di is away and waits.
    t.lobby()
    t.leave(3)
    t.choose('miaumiau')
    expect(t.state().seats).toEqual([0, 1, 2])
    t.join(3, 'Di')
    const won = t as unknown as { outcome: unknown }
    won.outcome = { winner: 1, line: [] }
    expect(t.rematch()).toBe(true)
    expect(t.state().seats).toEqual([1, 3, 0, 2])
    // Nobody waits: the next one starts.
    won.outcome = 'draw'
    expect(t.rematch()).toBe(true)
    expect(t.state().seats).toEqual([3, 0, 2, 1])
  })

  it('goes back to the lobby', () => {
    const t = table('Ada', 'Bo')
    t.choose('fourinarow')
    t.lobby()
    expect(t.state()).toMatchObject({ game: null, seats: [], position: null, outcome: null })
  })
})
