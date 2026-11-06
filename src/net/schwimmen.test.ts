import { describe, expect, it } from 'vitest'
import { GAME_IDS } from '../core/board'
import { GAME_GROUPS, handsOver, hasHiddenCards, seatRange } from '../core/games'
import * as swim from '../core/schwimmen'
import { playerToMove, Table } from '../core/table'
import { parseEvent, parseState } from './protocol'

/** Schwimmen at the table: who sits down, whose turn it is, and what each player sees. */

/** Numbers from a seed, the same on every run. */
function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 2 ** 32
  }
}

function table(names: string[], seed = 1): Table {
  const t = new Table(seeded(seed))
  names.forEach((name, id) => {
    t.join(id, name)
  })
  return t
}

const wire = (value: unknown) => JSON.parse(JSON.stringify(value))

describe('Schwimmen at the table', () => {
  it('seats two to eight, among the games of luck, hidden on one device by handing it over', () => {
    expect(seatRange('schwimmen')).toEqual({ min: 2, max: 8 })
    expect(GAME_IDS).toContain('schwimmen')
    expect(GAME_GROUPS.find((g) => g.group === 'luck')?.games).toContain('schwimmen')
    expect(handsOver('schwimmen')).toBe(true)
    expect(hasHiddenCards('schwimmen')).toBe(false)
    expect(table(['Ada']).choose('schwimmen')).toBe(false)
  })

  it('shows each player their own hand alone, and the middle to everyone', () => {
    const t = table(['Ada', 'Bo', 'Cy'])
    expect(t.choose('schwimmen')).toBe(true)
    const views = [0, 1, 2].map((id) => t.state(id).swim)
    const watcher = t.state(-1).swim
    expect(watcher?.hand).toEqual([])
    for (const view of views) {
      expect(view?.hand).toHaveLength(3)
      expect(view?.middle).toEqual(watcher?.middle)
    }
    const all = views.flatMap((view) => view?.hand ?? [])
    expect(new Set(all).size).toBe(9)
    // What a phone gets reads back as it was sent.
    for (const id of [-1, 0, 1, 2]) {
      expect(parseState(wire(t.state(id)))).toEqual(wire(t.state(id)))
    }
  })

  it('takes moves in turn, and passes the turn on', () => {
    const t = table(['Ada', 'Bo'])
    t.choose('schwimmen')
    let state = t.state(0)
    const turn = playerToMove(state)
    expect(turn).toBe(0)
    expect(t.move(1, 'schwimmen', 0, swim.encode({ kind: 'pass' }))).toBe(false)
    const hand = state.swim?.hand ?? []
    const middle = state.swim?.middle ?? []
    const move = swim.encode({ kind: 'swap', card: hand[0] ?? 0, middle: middle[1] ?? 0 })
    expect(t.move(0, 'schwimmen', 0, move)).toBe(true)
    state = t.state(0)
    // Unless that swap made 31, Bo is to move, and everyone saw what was swapped.
    if (state.swim?.reveal === null) {
      expect(playerToMove(state)).toBe(1)
      expect(state.swim?.hand).toContain(middle[1])
      expect(state.swim?.middle).toContain(hand[0])
      expect(state.last).toEqual(move)
    }
    expect(parseState(wire(state))).toEqual(wire(state))
  })

  it('plays whole games to a winner, each state readable by every phone', () => {
    for (const seed of [1, 2, 3]) {
      const t = table(['Ada', 'Bo', 'Cy', 'Di'], seed)
      t.choose('schwimmen')
      const pick = seeded(seed + 10)
      for (let i = 0; i < 2000 && t.state().outcome === null; i++) {
        const state = t.state()
        const id = playerToMove(state)
        const view = t.state(id ?? -1).swim
        if (id === null || !view) break
        const seat = state.seats.indexOf(id)
        const plain: swim.SwimMove[] = [{ kind: 'knock' }, { kind: 'pass' }, { kind: 'swapAll' }]
        const swaps = view.hand.flatMap((card) =>
          view.middle.map((middle): swim.SwimMove => ({ kind: 'swap', card, middle })),
        )
        const options = [...plain, ...swaps].filter((move) => swim.allowed(view, seat, move))
        const move: swim.SwimMove = options[Math.floor(pick() * options.length)] ?? { kind: 'pass' }
        expect(t.move(id, 'schwimmen', state.moveNo, swim.encode(move))).toBe(true)
        expect(parseState(wire(t.state(id)))).toEqual(wire(t.state(id)))
      }
      const outcome = t.state().outcome
      expect(outcome).not.toBeNull()
      expect(outcome).not.toBe('draw')
      // The winner is the only one still in.
      if (outcome && outcome !== 'draw') {
        expect(t.state().swim?.out.filter((out) => !out)).toHaveLength(1)
        expect(t.state().swim?.out[outcome.winner]).toBe(false)
      }
    }
  })

  it('reads moves from other phones, and turns down what is none', () => {
    expect(parseEvent({ type: 'move', game: 'schwimmen', moveNo: 2, move: [5, 18] })).toEqual({
      type: 'move',
      game: 'schwimmen',
      moveNo: 2,
      move: [5, 18],
    })
    expect(parseEvent({ type: 'move', game: 'schwimmen', moveNo: 2, move: [54] })).toBeDefined()
    for (const move of [[5, 5], [55], [1, 2, 3], [], [-1]]) {
      expect(parseEvent({ type: 'move', game: 'schwimmen', moveNo: 2, move })).toBeUndefined()
    }
  })

  it('turns down hands that are not of the deck, or show a card twice', () => {
    const t = table(['Ada', 'Bo'])
    t.choose('schwimmen')
    const state = wire(t.state(0))
    const view = state.swim
    const bad = [
      { ...state, swim: null },
      { ...state, swim: { ...view, hand: [0, 1, 2] } },
      { ...state, swim: { ...view, hand: [view.middle[0], view.hand[1], view.hand[2]] } },
      { ...state, swim: { ...view, middle: view.middle.slice(1) } },
      { ...state, swim: { ...view, coins: [4, 3] } },
      { ...state, swim: { ...view, turn: 2 } },
      {
        ...state,
        swim: { ...view, reveal: { hands: [[], []], why: 'luck', by: null, losers: [] } },
      },
      { ...state, cards: view },
    ]
    for (const value of bad) expect(parseState(value)).toBeUndefined()
  })
})
