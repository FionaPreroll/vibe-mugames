import { linkPair } from '@fionapreroll/p2p/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { encode, OUT } from '../core/ludo'
import { Table } from '../core/table'
import { parseEvent, parseState } from './protocol'
import { GuestSeat, HostSeat } from './session'

/** Ludo between phones: the host rolls for everyone, and every phone reads what it sends. */

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'],
  })
})

afterEach(() => {
  vi.useRealTimers()
})

const later = (ms: number) => vi.advanceTimersByTimeAsync(ms)
let tokens = 0

async function join(host: HostSeat, name: string): Promise<GuestSeat> {
  const pair = linkPair()
  const attached = host.room.attach(pair.host.link)
  pair.open()
  const seat = await GuestSeat.join(pair.guest.link, name, `token-${name}-${++tokens}xx`)
  await attached.joined
  await later(200)
  return seat
}

/** A state as it travels: JSON there and back. */
const wire = (state: unknown) => JSON.parse(JSON.stringify(state))

/** A table of three at Ludo, after Ada rolled a six and brought a piece out. */
function ludoTable() {
  let rolls = 0
  const t = new Table(() => (rolls++ === 0 ? 0.99 : 0.3))
  for (const [id, name] of ['Ada', 'Bo', 'Cy'].entries()) t.join(id, name)
  t.choose('ludo')
  t.move(0, 'ludo', 0, encode({ kind: 'roll' }))
  t.move(0, 'ludo', 1, encode({ kind: 'piece', piece: 0 }))
  return t
}

describe('Ludo over the network', () => {
  it('rolls on the host for a player who asks, and shows every phone the die', async () => {
    const host = new HostSeat('Ada')
    const bo = await join(host, 'Bo')
    expect(host.choose('ludo')).toBe(true)
    await later(200)
    expect(bo.state()?.ludo?.turn).toBe(0)
    // Bo's roll before his turn is not taken; Ada's is.
    bo.move('ludo', 0, encode({ kind: 'roll' }))
    await later(200)
    expect(bo.state()?.ludo?.die).toBe(0)
    host.move('ludo', 0, encode({ kind: 'roll' }))
    await later(200)
    const seen = bo.state()?.ludo
    expect(seen?.rolledBy).toBe(0)
    expect(seen?.die).toBeGreaterThanOrEqual(1)
    expect(seen).toEqual(host.state().ludo)
    host.close()
  })

  it('reads moves of Ludo only as a roll or a piece', () => {
    for (const move of [[4], [0], [3]]) {
      const event = { type: 'move', game: 'ludo', moveNo: 2, move }
      expect(parseEvent(event)).toEqual(event)
    }
    for (const move of [[5], [-1], [1, 2], [], [0.5], 4]) {
      expect(parseEvent({ type: 'move', game: 'ludo', moveNo: 0, move })).toBeUndefined()
    }
  })

  it('reads a game of Ludo back as the host sends it, and only when it fits', () => {
    const state = wire(ludoTable().state())
    expect(state.ludo.pieces[0]).toEqual([0, OUT, OUT, OUT])
    expect(parseState(state)).toEqual(state)
    const ludo = (change: object) => ({ ...state, ludo: { ...state.ludo, ...change } })
    const pieces = state.ludo.pieces
    for (const bad of [
      { ...state, ludo: null },
      { ...state, cards: state.ludo },
      ludo({ pieces: pieces.slice(1) }),
      ludo({ pieces: [[0, OUT, OUT], ...pieces.slice(1)] }),
      ludo({ pieces: [[0, 44, OUT, OUT], ...pieces.slice(1)] }),
      // Two pieces of one player on one square, and two players on one square.
      ludo({ pieces: [[0, 0, OUT, OUT], ...pieces.slice(1)] }),
      ludo({ pieces: [pieces[0], [30, OUT, OUT, OUT], pieces[2]] }),
      ludo({ turn: 3 }),
      ludo({ phase: 'dance' }),
      ludo({ die: 7 }),
      ludo({ rolledBy: 3 }),
      ludo({ tries: 4 }),
      ludo({ stuck: 'no' }),
      ludo({ winner: 5 }),
      ludo({ moved: { ...state.ludo.moved, piece: 4 } }),
      ludo({ moved: { ...state.ludo.moved, hit: 3 } }),
      ludo({ moved: { ...state.ludo.moved, to: 50 } }),
      { ...state, last: [7] },
    ]) {
      expect(parseState(bad)).toBeUndefined()
    }
  })
})
