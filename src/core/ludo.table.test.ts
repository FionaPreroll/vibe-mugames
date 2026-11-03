import { describe, expect, it } from 'vitest'
import { encode, type LudoMove, moves, OUT, TRACK } from './ludo'
import { playerToMove, Table } from './table'

/** A table with players 0 (the host), 1, 2 … as named, and dice from `random`. */
function table(random: () => number, ...names: string[]): Table {
  const t = new Table(random)
  names.forEach((name, id) => {
    t.join(id, name)
  })
  return t
}

/** A random source that rolls the given numbers, in order, over and over. */
function dice(...rolls: number[]): () => number {
  let i = 0
  return () => ((rolls[i++ % rolls.length] ?? 1) - 0.5) / 6
}

function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

/** Makes a move as the player to move, and says whether the table took it. */
function act(t: Table, move: LudoMove): boolean {
  const s = t.state()
  const id = playerToMove(s)
  if (id === null) throw new Error('nobody to move')
  return t.move(id, 'ludo', s.moveNo, encode(move))
}

describe('Ludo at the table', () => {
  it('seats two to four players, and leaves the fifth to watch', () => {
    expect(table(dice(1), 'Ada').choose('ludo')).toBe(false)
    const t = table(dice(1), 'Ada', 'Bo', 'Cy', 'Di', 'Ed')
    expect(t.choose('ludo')).toBe(true)
    const s = t.state()
    expect(s.seats).toEqual([0, 1, 2, 3])
    expect(s.ludo?.pieces).toHaveLength(4)
    expect(s.position).toBeNull()
    expect(playerToMove(s)).toBe(0)
    t.lobby()
    expect(t.state().ludo).toBeNull()
  })

  it('rolls the die for the player to move, and takes their piece by the number rolled', () => {
    const t = table(dice(6, 4), 'Ada', 'Bo')
    t.choose('ludo')
    // Bo may not roll on Ada's turn, nor Ada move a piece before rolling.
    expect(t.move(1, 'ludo', 0, encode({ kind: 'roll' }))).toBe(false)
    expect(act(t, { kind: 'piece', piece: 0 })).toBe(false)
    expect(act(t, { kind: 'roll' })).toBe(true)
    expect(t.state().ludo).toMatchObject({ die: 6, phase: 'move' })
    // A roll sent twice counts once.
    expect(t.move(0, 'ludo', 0, encode({ kind: 'roll' }))).toBe(false)
    expect(act(t, { kind: 'piece', piece: 1 })).toBe(true)
    expect(t.state().ludo?.pieces[0]).toEqual([OUT, 0, OUT, OUT])
    expect(act(t, { kind: 'roll' })).toBe(true)
    expect(act(t, { kind: 'piece', piece: 1 })).toBe(true)
    expect(t.state()).toMatchObject({ moveNo: 4, ludo: { turn: 1, moved: { to: 4 } } })
    expect(playerToMove(t.state())).toBe(1)
  })

  it('plays whole games to their end and counts the win', () => {
    for (const seed of [1, 2, 3]) {
      const random = seeded(seed)
      const t = table(random, 'Ada', 'Bo', 'Cy')
      t.choose('ludo')
      for (let i = 0; i < 20_000 && t.state().outcome === null; i++) {
        const game = t.state().ludo
        if (!game) throw new Error('no game')
        const legal = moves(game)
        expect(act(t, legal[Math.floor(random() * legal.length)] as LudoMove)).toBe(true)
      }
      const s = t.state()
      const winner = s.outcome === null || s.outcome === 'draw' ? -1 : s.outcome.winner
      expect(s.ludo?.pieces[winner]?.every((step) => step >= TRACK)).toBe(true)
      expect(s.scores[s.seats[winner] ?? -1]).toBe(1)
      expect(playerToMove(s)).toBeNull()
      expect(t.rematch()).toBe(true)
      expect(
        t
          .state()
          .ludo?.pieces.flat()
          .every((step) => step === OUT),
      ).toBe(true)
    }
  })
})
