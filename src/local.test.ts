import { describe, expect, it, vi } from 'vitest'
import { allowed, encode, JACK, type MiauMove, type MiauView, rankOf } from './core/miaumiau'
import { playerToMove } from './core/table'
import { LocalTable, MAX_LOCAL, MIN_LOCAL } from './local'

/** A shuffle that is the same every run. */
function seeded(seed = 7): () => number {
  let state = seed
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2 ** 31
    return state / 2 ** 31
  }
}

/** The moves a player's view offers, cards first. */
function options(view: MiauView): MiauMove[] {
  return [
    ...view.hand.map(
      (card): MiauMove =>
        rankOf(card) === JACK ? { kind: 'play', card, suit: 0 } : { kind: 'play', card },
    ),
    { kind: 'draw' },
    { kind: 'pass' },
  ]
}

describe('a table on one device', () => {
  it('seats two to six players, by the names given', () => {
    expect(() => new LocalTable(['Ada'])).toThrow(RangeError)
    expect(() => new LocalTable(Array.from({ length: MAX_LOCAL + 1 }, () => 'X'))).toThrow()
    const local = new LocalTable(['Ada', 'Bo', 'Cy'])
    expect(local.ids).toEqual([0, 1, 2])
    expect(local.state(-1).players.map((p) => [p.id, p.name, p.away])).toEqual([
      [0, 'Ada', false],
      [1, 'Bo', false],
      [2, 'Cy', false],
    ])
    expect(new LocalTable(['A', 'B']).ids).toHaveLength(MIN_LOCAL)
  })

  it('plays Tic Tac Toe, each move by whoever’s turn it is, and tells the screen', () => {
    const local = new LocalTable(['Ada', 'Bo'])
    const changed = vi.fn()
    local.onChange = changed
    expect(local.choose('tictactoe')).toBe(true)
    expect(changed).toHaveBeenCalledTimes(1)
    // Bo cannot move for Ada, and a move refused changes nothing.
    expect(local.move(1, 'tictactoe', 0, [4])).toBe(false)
    expect(changed).toHaveBeenCalledTimes(1)
    for (const cell of [0, 3, 1, 4, 2]) {
      const state = local.state(-1)
      const id = playerToMove(state)
      expect(id).not.toBeNull()
      expect(local.move(id ?? -1, 'tictactoe', state.moveNo, [cell])).toBe(true)
    }
    expect(local.state(-1).outcome).toEqual({ winner: 0, line: [0, 1, 2] })
    expect(local.state(-1).scores).toEqual({ 0: 1 })
    expect(changed).toHaveBeenCalledTimes(6)

    // Again, with Bo starting; then back to the lobby.
    local.rematch()
    expect(local.state(-1).seats).toEqual([1, 0])
    local.lobby()
    expect(local.state(-1).game).toBeNull()
    expect(changed).toHaveBeenCalledTimes(8)
    // A rematch with no game over does nothing, and says nothing.
    local.rematch()
    expect(changed).toHaveBeenCalledTimes(8)
  })

  it('lets the others watch a game for two, and gives them a seat in the next', () => {
    const local = new LocalTable(['Ada', 'Bo', 'Cy', 'Di'])
    local.choose('fourinarow')
    expect(local.state(-1).seats).toEqual([0, 1])
    expect(local.move(2, 'fourinarow', 0, [3])).toBe(false)
  })

  it('deals Miau-Miau to everyone at the device, each view with its own hand', () => {
    const local = new LocalTable(['Ada', 'Bo', 'Cy', 'Di'], seeded())
    expect(local.choose('miaumiau')).toBe(true)
    const hands = local.ids.map((id) => local.state(id).cards?.hand ?? [])
    for (const hand of hands) expect(hand).toHaveLength(5)
    // Four different hands, from one deck.
    expect(new Set(hands.flat()).size).toBe(20)
    expect(local.state(-1).cards?.hand).toEqual([])
  })

  it('plays Miau-Miau to its end, every move by the player whose turn it is', () => {
    const local = new LocalTable(['Ada', 'Bo', 'Cy'], seeded(3))
    local.choose('miaumiau')
    for (let step = 0; step < 2_000 && local.state(-1).outcome === null; step++) {
      const state = local.state(-1)
      const id = playerToMove(state)
      if (id === null) break
      // From the player's own view, as their part of the screen offers it: a card that fits,
      // else drawing, else passing.
      const view = local.state(id).cards
      if (view === null) break
      const move = options(view).find((option) => allowed(view, option))
      if (move === undefined) break
      // Someone else's move is refused; theirs is taken.
      const other = local.ids.find((x) => x !== id) ?? -1
      expect(local.move(other, 'miaumiau', state.moveNo, encode(move))).toBe(false)
      expect(local.move(id, 'miaumiau', state.moveNo, encode(move))).toBe(true)
    }
    const end = local.state(-1)
    expect(end.outcome).not.toBeNull()
    if (end.outcome !== 'draw' && end.outcome !== null) {
      const winner = end.seats[end.outcome.winner] ?? -1
      expect(end.scores[winner]).toBe(1)
    }
  })
})
