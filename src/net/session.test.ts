import { linkPair } from '@fionapreroll/p2p/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { encode } from '../core/miaumiau'
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
    host.move('tictactoe', 0, [4])
    await later(200)
    // Bo's move arrives once, even if Bo's phone sends it twice.
    bo.move('tictactoe', 1, [0])
    bo.move('tictactoe', 1, [0])
    await later(200)
    expect(host.state().moveNo).toBe(2)
    host.move('tictactoe', 2, [3])
    bo.move('tictactoe', 3, [1])
    await later(100)
    host.move('tictactoe', 4, [5])
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
    cy.move('fourinarow', 0, [3])
    await later(200)
    expect(cy.state()).toMatchObject({ seats: [0, 1], moveNo: 0 })
    host.close()
  })

  it('plays Mühle and Dame moves of several cells over the network', async () => {
    const host = new HostSeat('Ada')
    const bo = await join(host, 'Bo')
    host.choose('dame')
    host.move('dame', 0, [42, 35])
    await later(200)
    bo.move('dame', 1, [21, 28])
    await later(200)
    host.move('dame', 2, [35, 21])
    await later(200)
    expect(bo.state()?.last).toEqual([35, 21])
    expect(bo.state()?.position?.board[28]).toBe(-1)
    host.lobby()
    host.choose('muehle')
    await later(200)
    expect(bo.state()?.position?.hand).toEqual([9, 9])
    host.close()
  })

  it('deals Miau-Miau to three phones, each seeing only its own cards', async () => {
    const host = new HostSeat('Ada')
    const bo = await join(host, 'Bo')
    const cy = await join(host, 'Cy')
    expect(host.choose('miaumiau')).toBe(true)
    await later(200)
    const hands = [host.state(), bo.state(), cy.state()].map((s) => s?.cards?.hand ?? [])
    expect(hands.map((hand) => hand.length)).toEqual([5, 5, 5])
    expect(new Set(hands.flat()).size).toBe(15)
    expect(bo.state()?.cards?.counts).toEqual([5, 5, 5])
    // Bo's phone hears nothing of Ada's cards.
    expect(JSON.stringify(bo.state())).not.toContain(JSON.stringify(hands[0]))

    // Ada draws; Bo's draw before his turn is not taken.
    bo.move('miaumiau', 0, encode({ kind: 'draw' }))
    host.move('miaumiau', 0, encode({ kind: 'draw' }))
    await later(200)
    expect(bo.state()?.cards?.counts[0]).toBe(6)
    expect(bo.state()?.cards?.counts[1]).toBe(5)
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
    expect(parseEvent({ type: 'move', game: 'tictactoe', moveNo: 3, move: [4] })).toEqual({
      type: 'move',
      game: 'tictactoe',
      moveNo: 3,
      move: [4],
    })
    const jump = { type: 'move', game: 'dame', moveNo: 9, move: [40, 26, 12] }
    expect(parseEvent(jump)).toEqual(jump)
    for (const bad of [
      null,
      { type: 'move', game: 'chess', moveNo: 0, move: [0] },
      { type: 'move', game: 'tictactoe', moveNo: -1, move: [0] },
      { type: 'move', game: 'tictactoe', moveNo: 0, move: [1.5] },
      { type: 'move', game: 'tictactoe', moveNo: 0, move: [99] },
      { type: 'move', game: 'tictactoe', moveNo: 0, move: 4 },
      { type: 'move', game: 'tictactoe', moveNo: 0, move: [] },
      { type: 'move', game: 'tictactoe', moveNo: 0, move: [1, 2] },
      { type: 'move', game: 'muehle', moveNo: 0, move: [24] },
      { type: 'move', game: 'dame', moveNo: 0, move: Array(14).fill(1) },
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
    const at = (change: object) => ({ ...state, position: { ...state.position, ...change } })
    const board = state.position.board
    expect(parseState(at({ board: board.slice(1) }))).toBeUndefined()
    expect(parseState(at({ board: [...board.slice(1), 5] }))).toBeUndefined()
    // Four in a Row has no crowned pieces.
    expect(parseState(at({ board: [...board.slice(1), 11] }))).toBeUndefined()
    expect(parseState(at({ turn: 2 }))).toBeUndefined()
    expect(parseState(at({ hand: [1] }))).toBeUndefined()
    expect(parseState(at({ phase: 'dance' }))).toBeUndefined()
    expect(parseState(at({ quiet: -1 }))).toBeUndefined()
    expect(parseState({ ...state, position: null })).toBeUndefined()
    expect(parseState({ ...state, last: [42] })).toBeUndefined()
    expect(parseState({ ...state, last: [6] })).toEqual({ ...host.state(), last: [6] })
    expect(parseState({ ...state, seats: [0] })).toBeUndefined()
    expect(parseState({ ...state, game: 'chess' })).toBeUndefined()
    expect(parseState({ ...state, outcome: { winner: 0, line: [99] } })).toBeUndefined()
    expect(parseState({ ...state, players: 'everyone' })).toBeUndefined()
    // Names are cleaned like the library's.
    const named = parseState({ ...state, players: [{ id: 0, name: 'A\u0000da', away: 1 }] })
    expect(named?.players).toEqual([{ id: 0, name: 'Ada', away: false }])
    host.close()
  })

  it('reads moves of Miau-Miau only as cards, draws and passes', () => {
    const play = { type: 'move', game: 'miaumiau', moveNo: 2, move: [9, 3] }
    expect(parseEvent(play)).toEqual(play)
    expect(parseEvent({ ...play, move: [52] })).toEqual({ ...play, move: [52] })
    expect(parseEvent({ ...play, move: [53] })).toEqual({ ...play, move: [53] })
    for (const move of [[], [54], [52, 1], [9, 4], [9, 1, 1], [-1], ['9']]) {
      expect(parseEvent({ ...play, move })).toBeUndefined()
    }
  })

  it('reads the cards of Miau-Miau only when they fit', () => {
    const host = new HostSeat('Ada')
    host.table.join(1, 'Bo')
    host.table.join(2, 'Cy')
    host.choose('miaumiau')
    const state = JSON.parse(JSON.stringify(host.state()))
    expect(parseState(state)).toEqual(host.state())
    const cards = (change: object) => ({ ...state, cards: { ...state.cards, ...change } })
    const hand: number[] = state.cards.hand
    expect(parseState(cards({ hand: [...hand, hand[0]] }))).toBeUndefined()
    expect(parseState(cards({ hand: [...hand, 52] }))).toBeUndefined()
    expect(parseState(cards({ counts: [5, 5] }))).toBeUndefined()
    expect(parseState(cards({ top: 52 }))).toBeUndefined()
    expect(parseState(cards({ pile: 0 }))).toBeUndefined()
    expect(parseState(cards({ turn: 3 }))).toBeUndefined()
    expect(parseState(cards({ wish: 4 }))).toBeUndefined()
    expect(parseState(cards({ wish: 2 }))?.cards?.wish).toBe(2)
    expect(parseState(cards({ penalty: -2 }))).toBeUndefined()
    // A card drawn must be one in the hand.
    expect(parseState(cards({ drawn: hand[0] }))?.cards?.drawn).toBe(hand[0])
    expect(parseState(cards({ drawn: 52 }))).toBeUndefined()
    expect(parseState(cards({ winner: 5 }))).toBeUndefined()
    expect(parseState(cards({ stuck: 'no' }))).toBeUndefined()
    expect(parseState({ ...state, cards: null })).toBeUndefined()
    expect(parseState({ ...state, position: state.cards })).toBeUndefined()
    expect(parseState({ ...state, seats: [0] })).toBeUndefined()
    expect(parseState({ ...state, seats: [0, 1, 2, 3, 4, 5, 6] })).toBeUndefined()
    expect(parseState({ ...state, outcome: { winner: 2, line: [] } })?.outcome).toEqual({
      winner: 2,
      line: [],
    })
    expect(parseState({ ...state, outcome: { winner: 2, line: [0] } })).toBeUndefined()
    host.lobby()
    host.choose('tictactoe')
    const board = JSON.parse(JSON.stringify(host.state()))
    expect(parseState({ ...board, cards: state.cards })).toBeUndefined()
    host.close()
  })

  it('reads crowned pieces and the pieces in hand where the game has them', () => {
    const host = new HostSeat('Ada')
    host.table.join(1, 'Bo')
    host.choose('dame')
    const dame = JSON.parse(JSON.stringify(host.state()))
    const crowned = [...dame.position.board.slice(0, 63), 11]
    expect(parseState({ ...dame, position: { ...dame.position, board: crowned } })).toBeDefined()
    expect(
      parseState({ ...dame, position: { ...dame.position, board: [...crowned.slice(0, 63), 21] } }),
    ).toBeUndefined()
    host.lobby()
    host.choose('muehle')
    const muehle = JSON.parse(JSON.stringify(host.state()))
    expect(parseState(muehle)?.position?.hand).toEqual([9, 9])
    expect(
      parseState({ ...muehle, position: { ...muehle.position, hand: [9, 99] } }),
    ).toBeUndefined()
    host.lobby()
    expect(parseState(JSON.parse(JSON.stringify(host.state())))?.position).toBeNull()
    host.close()
  })
})
