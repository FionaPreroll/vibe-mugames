import { describe, expect, it } from 'vitest'
import { Table, type TableState } from '../core/table'
import { parseEvent, parseState } from './protocol'

/**
 * Mäxchen's and Werwolf's messages, as another phone may send them: what the host sends is read
 * back as it was, and anything else is turned down.
 */

/** A state as it travels: JSON there and back. */
const wire = (state: unknown) => JSON.parse(JSON.stringify(state))

function table(game: 'maexchen' | 'werwolf', players: number): Table {
  const t = new Table(() => 0.5)
  for (let id = 0; id < players; id++) t.join(id, `Player ${id}`)
  t.choose(game)
  return t
}

/** Mäxchen after a round: seat 0 rolled and said 54, seat 1 doubted; then seat 0 rolled again. */
function dice(viewer: number): TableState {
  const t = table('maexchen', 3)
  t.move(0, 'maexchen', 0, [1])
  t.move(0, 'maexchen', 1, [54])
  t.move(1, 'maexchen', 2, [2])
  const s = t.state()
  const starter = s.seats[s.dice?.turn ?? 0] ?? 0
  t.move(starter, 'maexchen', 3, [1])
  return t.state(viewer)
}

/** Werwolf of six after the first night and day. */
function village(viewer: number): TableState {
  const t = table('werwolf', 6)
  for (let phase = 0; phase < 2; phase++) {
    for (let id = 0; id < 6; id++) {
      const view = t.state(id).village
      const seat = t.state(id).seats.indexOf(id)
      if (!view?.alive[seat]) continue
      const target = view.alive.findIndex(
        (alive, i) =>
          alive && i !== seat && !(view.roles[seat] === 'wolf' && view.roles[i] === 'wolf'),
      )
      t.move(id, 'werwolf', t.state().moveNo, [target])
    }
  }
  return t.state(viewer)
}

describe('the protocol of the party games', () => {
  it('reads back Mäxchen and Werwolf as the host sends them, to players and to onlookers', () => {
    for (const state of [dice(0), dice(1), dice(-1), village(0), village(3), village(-1)]) {
      expect(parseState(wire(state))).toEqual(wire(state))
    }
    expect(village(0).village?.story.length).toBe(2)
  })

  it('turns down Mäxchen that does not fit the table', () => {
    const state = wire(dice(0))
    const d = state.dice
    const bad = [
      { ...state, dice: null },
      { ...state, village: village(0).village },
      { ...state, dice: { ...d, lives: [3, 3] } },
      { ...state, dice: { ...d, lives: [4, 3, 3] } },
      { ...state, dice: { ...d, turn: 3 } },
      { ...state, dice: { ...d, phase: 'shake' } },
      { ...state, dice: { ...d, dice: [0, 3] } },
      { ...state, dice: { ...d, dice: [7, 3] } },
      { ...state, dice: { ...d, claim: 12, claimer: 0 } },
      { ...state, dice: { ...d, claim: 54, claimer: null } },
      { ...state, dice: { ...d, mine: 'yes' } },
      { ...state, dice: { ...d, winner: 5 } },
      { ...state, dice: { ...d, reveal: { ...d.reveal, lost: 3 } } },
      { ...state, dice: { ...d, reveal: { ...d.reveal, loser: 7 } } },
    ]
    for (const [i, value] of bad.entries()) expect([i, parseState(value)]).toEqual([i, undefined])
  })

  it('turns down Werwolf that does not fit the table', () => {
    const state = wire(village(0))
    const v = state.village
    const bad = [
      { ...state, village: null },
      { ...state, dice: dice(0).dice },
      { ...state, village: { ...v, roles: [...v.roles.slice(1), 'vampire'] } },
      { ...state, village: { ...v, alive: v.alive.slice(1) } },
      { ...state, village: { ...v, done: [...v.done.slice(1), 1] } },
      { ...state, village: { ...v, choices: [...v.choices.slice(1), 6] } },
      { ...state, village: { ...v, phase: 'dusk' } },
      { ...state, village: { ...v, night: 0 } },
      { ...state, village: { ...v, healed: 9 } },
      { ...state, village: { ...v, winner: 'nobody' } },
      { ...state, village: { ...v, findings: [{ seat: 8, wolf: true }] } },
      { ...state, village: { ...v, story: [{ kind: 'night', night: 1, victim: 6 }] } },
      { ...state, village: { ...v, story: [{ kind: 'vote', night: 1, votes: [], out: null }] } },
      { ...state, village: { ...v, story: [{ kind: 'storm', night: 1 }] } },
      { ...state, last: [1] },
    ]
    for (const [i, value] of bad.entries()) expect([i, parseState(value)]).toEqual([i, undefined])
  })

  it('reads moves of both, and nothing else', () => {
    const move = (game: string, numbers: unknown) =>
      parseEvent({ type: 'move', game, moveNo: 0, move: numbers })
    for (const numbers of [[1], [2], [3], [31], [66], [21]]) {
      expect(move('maexchen', numbers)?.move).toEqual(numbers)
    }
    for (const numbers of [[], [0], [4], [12], [67], [1, 2], ['1']]) {
      expect(move('maexchen', numbers)).toBeUndefined()
    }
    expect(move('werwolf', [7])?.move).toEqual([7])
    for (const numbers of [[], [8], [-1], [1, 2], [0.5]]) {
      expect(move('werwolf', numbers)).toBeUndefined()
    }
  })
})
