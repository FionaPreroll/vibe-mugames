import { describe, expect, it } from 'vitest'
import { GAME_IDS } from './board'
import { handsOver, seatRange } from './games'
import * as maex from './maexchen'
import { playerToMove, Table } from './table'
import * as wolf from './werwolf'

/**
 * Mäxchen and Werwolf at the table: who sits down, whose turn it is, what each player sees, and
 * whom a won game counts for.
 */

/** A table of players 0 (the host), 1, 2, … as named; the dice and roles from `random`. */
function table(names: string[], random: () => number = Math.random): Table {
  const t = new Table(random)
  names.forEach((name, id) => {
    t.join(id, name)
  })
  return t
}

/** Dice that fall as listed, a die at a time. */
function fixed(...dice: number[]): () => number {
  let i = 0
  return () => ((dice[i++ % dice.length] as number) - 1) / 6 + 0.01
}

describe('the party games', () => {
  it('seat two to eight for Mäxchen and four to eight for Werwolf, hidden on one device', () => {
    expect(seatRange('maexchen')).toEqual({ min: 2, max: 8 })
    expect(seatRange('werwolf')).toEqual({ min: 4, max: 8 })
    expect(GAME_IDS.filter(handsOver)).toEqual(
      expect.arrayContaining(['seeschlacht', 'maexchen', 'werwolf']),
    )
    expect(table(['Ada', 'Bo', 'Cy']).choose('werwolf')).toBe(false)
  })
})

describe('Mäxchen at the table', () => {
  it('takes moves in turn, and shows the dice to the roller alone', () => {
    const t = table(['Ada', 'Bo', 'Cy'], fixed(5, 4))
    expect(t.choose('maexchen')).toBe(true)
    expect(t.state().seats).toEqual([0, 1, 2])
    expect(playerToMove(t.state())).toBe(0)
    expect(t.move(1, 'maexchen', 0, maex.encode({ kind: 'roll' }))).toBe(false)
    expect(t.move(0, 'maexchen', 0, maex.encode({ kind: 'claim', value: 54 }))).toBe(false)
    expect(t.move(0, 'maexchen', 0, maex.encode({ kind: 'roll' }))).toBe(true)
    expect(t.state(0).dice?.dice).toEqual([5, 4])
    expect(t.state(1).dice?.dice).toBeNull()
    expect(t.state(-1).dice?.dice).toBeNull()
    // A move meant for an older move number does not count.
    expect(t.move(0, 'maexchen', 0, maex.encode({ kind: 'claim', value: 61 }))).toBe(false)
    expect(t.move(0, 'maexchen', 1, maex.encode({ kind: 'claim', value: 61 }))).toBe(true)
    expect(t.state().last).toEqual([61])
    expect(playerToMove(t.state())).toBe(1)
    expect(t.move(1, 'maexchen', 2, maex.encode({ kind: 'doubt' }))).toBe(true)
    expect(t.state(2).dice?.reveal).toMatchObject({ dice: [5, 4], loser: 0 })
    expect(t.state().dice?.lives).toEqual([maex.LIVES - 1, maex.LIVES, maex.LIVES])
  })

  it('counts the win of the last player in', () => {
    const t = table(['Ada', 'Bo'], fixed(3, 1))
    t.choose('maexchen')
    for (let round = 0; round < maex.LIVES; round++) {
      // Ada bluffs every time, and Bo doubts her.
      const s = t.state()
      expect(t.move(0, 'maexchen', s.moveNo, [1])).toBe(true)
      expect(t.move(0, 'maexchen', s.moveNo + 1, [66])).toBe(true)
      expect(t.move(1, 'maexchen', s.moveNo + 2, [2])).toBe(true)
    }
    expect(t.state().outcome).toEqual({ winner: 1, line: [] })
    expect(t.state().scores).toEqual({ 1: 1 })
    expect(playerToMove(t.state())).toBeNull()
    expect(t.rematch()).toBe(true)
    expect(t.state().seats).toEqual([1, 0])
    t.lobby()
    expect(t.state().dice).toBeNull()
  })
})

describe('Werwolf at the table', () => {
  /** Five players: Ada the wolf, Bo the seer, Cy the healer, Di and Ed villagers. */
  function village(): Table {
    // The shuffle of five roles takes four numbers: these leave every role in its place.
    const t = table(['Ada', 'Bo', 'Cy', 'Di', 'Ed'], () => 0.99)
    t.choose('werwolf')
    return t
  }

  it('deals each player a role only they see', () => {
    const t = village()
    expect(t.state(0).village?.roles).toEqual(['wolf', null, null, null, null])
    expect(t.state(3).village?.roles).toEqual([null, null, null, 'villager', null])
    expect(t.state(-1).village?.roles.every((role) => role === null)).toBe(true)
  })

  it('takes everyone’s choice at once, but none meant for the night or day before', () => {
    const t = village()
    expect(playerToMove(t.state())).toBe(0)
    expect(t.move(4, 'werwolf', 0, [0])).toBe(true)
    expect(t.move(4, 'werwolf', 1, [1])).toBe(false)
    expect(t.move(0, 'werwolf', 0, [0])).toBe(false)
    expect(t.move(0, 'werwolf', 0, [3, 4])).toBe(false)
    // Choices come with the move number their player saw: older ones count too, by night.
    expect(t.move(0, 'werwolf', 0, [3])).toBe(true)
    expect(t.move(1, 'werwolf', 1, [0])).toBe(true)
    expect(t.move(2, 'werwolf', 0, [4])).toBe(true)
    expect(t.state().last).toBeNull()
    expect(playerToMove(t.state())).toBe(3)
    expect(t.move(3, 'werwolf', 4, [0])).toBe(true)
    const day = t.state(1).village
    expect(day?.phase).toBe('day')
    expect(day?.alive).toEqual([true, true, true, false, true])
    expect(day?.findings).toEqual([{ seat: 0, wolf: true }])
    // Di's choice sent twice, meant for the night, does not count as her vote by day.
    expect(t.move(3, 'werwolf', 4, [0])).toBe(false)
    expect(t.move(1, 'werwolf', 4, [0])).toBe(false)
    expect(t.move(1, 'werwolf', 5, [0])).toBe(true)
    expect(t.state().village?.done).toEqual([false, true, false, false, false])
  })

  it('counts a won game for the whole team, and shows every role then', () => {
    const t = village()
    for (const [id, target] of [
      [0, 3],
      [1, 0],
      [2, 3],
      [3, 0],
      [4, 0],
    ] as const) {
      expect(t.move(id, 'werwolf', t.state().moveNo, [target])).toBe(true)
    }
    // Cy protected Di: nobody was taken, and everyone votes.
    expect(t.state().village?.alive.every(Boolean)).toBe(true)
    for (const id of [0, 1, 2, 3, 4]) {
      expect(t.move(id, 'werwolf', t.state().moveNo, [id === 0 ? 1 : 0])).toBe(true)
    }
    expect(t.state().village?.winner).toBe('village')
    expect(t.state().outcome).toEqual({ winner: 1, line: [] })
    expect(t.state().scores).toEqual({ 1: 1, 2: 1, 3: 1, 4: 1 })
    expect(t.state(-1).village?.roles).toEqual(['wolf', 'seer', 'healer', 'villager', 'villager'])
    expect(wolf.winners(t.state(-1).village ?? { roles: [], winner: null })).toEqual([1, 2, 3, 4])
    expect(t.rematch()).toBe(true)
    expect(t.state().village?.night).toBe(1)
  })
})
