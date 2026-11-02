import { linkPair } from '@fionapreroll/p2p/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseEvent, parseState } from './protocol'
import { GuestSeat, HostSeat } from './session'

/**
 * The host's and players' seats over connections in memory, with the library's rooms and the
 * Spielekiste's rules: a whole game of Tic Tac Toe in milliseconds.
 */

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

describe('a table over the network', () => {
  it('plays a game of Tic Tac Toe between the host and a player', async () => {
    const host = new HostSeat('Ada')
    const bo = await join(host, 'Bo')
    expect(bo.id).toBe(1)
    expect(bo.host).toBe('Ada')
    expect(bo.state()?.players.map((p) => p.name)).toEqual(['Ada', 'Bo'])

    expect(host.choose('tictactoe')).toBe(true)
    host.move('tictactoe', 0, 4)
    await later(200)
    // Bo's move arrives once, even if Bo's phone sends it twice.
    bo.move('tictactoe', 1, 0)
    bo.move('tictactoe', 1, 0)
    await later(200)
    expect(host.state().moveNo).toBe(2)
    host.move('tictactoe', 2, 3)
    bo.move('tictactoe', 3, 1)
    await later(100)
    host.move('tictactoe', 4, 5)
    await later(200)
    expect(bo.state()?.outcome).toEqual({ winner: 0, line: [3, 4, 5] })
    expect(bo.state()?.scores).toEqual({ 0: 1 })

    host.rematch()
    await later(200)
    expect(bo.state()?.seats).toEqual([1, 0])
    host.close()
  })

  it('lets a player watch while two others play, and ignores the watcher’s moves', async () => {
    const host = new HostSeat('Ada')
    await join(host, 'Bo')
    const cy = await join(host, 'Cy')
    host.choose('fourinarow')
    cy.move('fourinarow', 0, 3)
    await later(200)
    expect(cy.state()).toMatchObject({ seats: [0, 1], moveNo: 0 })
    host.close()
  })

  it('tells a player when the host closes the table', async () => {
    const host = new HostSeat('Ada')
    const bo = await join(host, 'Bo')
    const lost = vi.fn()
    bo.onLost = lost
    host.close()
    await later(1000)
    expect(lost).toHaveBeenCalledWith(true)
  })
})

describe('the protocol', () => {
  it('reads only moves of known games, in range', () => {
    expect(parseEvent({ type: 'move', game: 'tictactoe', moveNo: 3, move: 4 })).toEqual({
      type: 'move',
      game: 'tictactoe',
      moveNo: 3,
      move: 4,
    })
    for (const bad of [
      null,
      { type: 'move', game: 'chess', moveNo: 0, move: 0 },
      { type: 'move', game: 'tictactoe', moveNo: -1, move: 0 },
      { type: 'move', game: 'tictactoe', moveNo: 0, move: 1.5 },
      { type: 'move', game: 'tictactoe', moveNo: 0, move: 99 },
      { type: 'other' },
    ]) {
      expect(parseEvent(bad)).toBeUndefined()
    }
  })

  it('reads a table only when every part of it fits', () => {
    const host = new HostSeat('Ada')
    host.table.join(1, 'Bo')
    host.choose('fourinarow')
    const state = JSON.parse(JSON.stringify(host.state()))
    expect(parseState(state)).toEqual(host.state())
    expect(parseState({ ...state, board: state.board.slice(1) })).toBeUndefined()
    expect(parseState({ ...state, board: [...state.board.slice(1), 5] })).toBeUndefined()
    expect(parseState({ ...state, seats: [0] })).toBeUndefined()
    expect(parseState({ ...state, game: 'chess' })).toBeUndefined()
    expect(parseState({ ...state, turn: 2 })).toBeUndefined()
    expect(parseState({ ...state, outcome: { winner: 0, line: [99] } })).toBeUndefined()
    expect(parseState({ ...state, players: 'everyone' })).toBeUndefined()
    // Names are cleaned like the library's.
    const named = parseState({ ...state, players: [{ id: 0, name: 'A\u0000da', away: 1 }] })
    expect(named?.players).toEqual([{ id: 0, name: 'Ada', away: false }])
    host.close()
  })
})
