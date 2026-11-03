import { linkPair } from '@fionapreroll/p2p/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COUNTDOWN } from '../core/lichtrenner'
import { MAEXCHEN } from '../core/maexchen'
import { encode } from '../core/miaumiau'
import * as sea from '../core/seeschlacht'
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

  it('plays Sea Battle between two phones, each seeing only its own fleet', async () => {
    const host = new HostSeat('Ada')
    const bo = await join(host, 'Bo')
    expect(host.choose('seeschlacht')).toBe(true)
    await later(200)
    const rows = sea.FLEET.map((size, i) => ({ cell: i * 20, down: false, size }))
    const columns = sea.FLEET.map((size, i) => ({ cell: i * 2, down: true, size }))
    // Both place at once, with the same move number.
    bo.move('seeschlacht', 0, sea.encode({ kind: 'place', fleet: columns }))
    host.move('seeschlacht', 0, sea.encode({ kind: 'place', fleet: rows }))
    await later(200)
    expect(bo.state()?.sea?.placed).toEqual([true, true])
    expect(bo.state()?.sea?.fleets).toEqual([null, columns])
    expect(host.state().sea?.fleets).toEqual([rows, null])
    // Bo's phone hears nothing of where Ada's ships are.
    expect(JSON.stringify(bo.state())).not.toContain('"down":false')
    host.move('seeschlacht', 2, [0])
    await later(200)
    expect(bo.state()?.sea?.seas[1]).toEqual({ shots: [0], hits: [0], sunk: [] })
    expect(bo.state()?.last).toEqual([0])
    host.move('seeschlacht', 3, [1])
    await later(200)
    bo.move('seeschlacht', 4, [0])
    await later(200)
    expect(host.state().sea?.seas[0]).toEqual({ shots: [0], hits: [0], sunk: [] })
    host.close()
  })

  it('plays Mäxchen and Werwolf between phones, each seeing only its own dice and role', async () => {
    const host = new HostSeat('Ada')
    const players = [await join(host, 'Bo'), await join(host, 'Cy'), await join(host, 'Di')]
    const [bo, cy] = players as [GuestSeat, GuestSeat, GuestSeat]
    expect(host.choose('maexchen')).toBe(true)
    host.move('maexchen', 0, [1])
    await later(200)
    const rolled = host.state().dice?.dice
    expect(rolled).not.toBeNull()
    expect(bo.state()?.dice?.dice).toBeNull()
    host.move('maexchen', 1, [MAEXCHEN])
    await later(200)
    expect(bo.state()?.dice?.claim).toBe(MAEXCHEN)
    bo.move('maexchen', 2, [3])
    await later(200)
    expect(host.state().dice?.lives[1]).toBe(2)

    host.lobby()
    expect(host.choose('werwolf')).toBe(true)
    await later(200)
    const seats = [host, ...players]
    const roles = seats.map((seat) => seat.state()?.village?.roles[seat.id])
    expect(roles.toSorted()).toEqual(['seer', 'villager', 'villager', 'wolf'])
    // Nobody but the wolf hears of any role but their own.
    for (const seat of seats) {
      const known = seat.state()?.village?.roles.filter((role) => role !== null)
      expect(known).toHaveLength(1)
    }
    // Everyone chooses at night, with the move number they saw.
    for (const seat of seats) {
      const view = seat.state()?.village
      const target = view?.alive.findIndex((_, i) => i !== seat.id && view.roles[i] !== 'wolf')
      seat.move('werwolf', 0, [target ?? 0])
    }
    await later(200)
    expect(cy.state()?.village?.phase).toBe('day')
    expect(cy.state()?.village?.story).toHaveLength(1)
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

describe('games in real time over the network', () => {
  it('steers a player’s rider from their phone, and sends the race 30 times a second', async () => {
    const host = new HostSeat('Ada')
    const bo = await join(host, 'Bo')
    let states = 0
    bo.onChange = () => states++
    await later(1000)
    // A board game, or the lobby, goes out ten times a second.
    expect(states).toBeGreaterThanOrEqual(9)
    expect(states).toBeLessThanOrEqual(11)

    host.choose('lichtrenner')
    await later(100)
    const round = bo.state()?.round ?? 0
    const start = bo.state()?.race?.riders[1]?.path[0] ?? 0
    // Bo heads down, Ada up.
    bo.input([round, 2])
    host.input([round, 0])
    states = 0
    await later(1000)
    expect(states).toBeGreaterThanOrEqual(28)
    await later(COUNTDOWN * 1000 + 300)
    const race = bo.state()?.race
    expect(race?.steps).toBeGreaterThan(0)
    expect(race?.riders[1]?.heading).toBe(2)
    expect(race?.riders[0]?.heading).toBe(0)
    expect(race?.riders[1]?.path).toEqual([start, start + (race?.steps ?? 0) * 40])
    host.close()
  })

  it('moves a player’s mallet from their phone, on the host’s rink', async () => {
    const host = new HostSeat('Ada')
    const bo = await join(host, 'Bo')
    host.choose('airhockey')
    await later(100)
    bo.input([bo.state()?.round ?? 0, 0.25, 0.5])
    await later(1000)
    // Bo's half, seen from his end: his left is the rink's right.
    const mallet = host.state().rink?.mallets[1]
    expect(mallet?.x).toBeCloseTo(0.75)
    expect(mallet?.y).toBeCloseTo(2.5)
    expect(bo.state()?.rink?.mallets[1]?.x).toBeCloseTo(0.75)
    host.close()
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

  it('reads moves of Sea Battle only as shots and whole fleets', () => {
    const shot = { type: 'move', game: 'seeschlacht', moveNo: 4, move: [99] }
    expect(parseEvent(shot)).toEqual(shot)
    const fleet = { ...shot, move: [100, 102, 104, 106, 108] }
    expect(parseEvent(fleet)).toEqual(fleet)
    for (const move of [[], [100], [-1], [0, 1], [0, 20, 40, 60, 200], [0, 20, 40, 60, 80, 90]]) {
      expect(parseEvent({ ...shot, move })).toBeUndefined()
    }
  })

  it('reads Sea Battle only when its fleets and shots fit', () => {
    const host = new HostSeat('Ada')
    host.table.join(1, 'Bo')
    host.choose('seeschlacht')
    const rows = sea.FLEET.map((size, i) => ({ cell: i * 20, down: false, size }))
    host.move('seeschlacht', 0, sea.encode({ kind: 'place', fleet: rows }))
    host.table.move(1, 'seeschlacht', 1, sea.encode({ kind: 'place', fleet: rows }))
    host.move('seeschlacht', 2, [0])
    host.move('seeschlacht', 3, [1])
    host.move('seeschlacht', 4, [2])
    host.move('seeschlacht', 5, [3])
    host.move('seeschlacht', 6, [4])
    const state = JSON.parse(JSON.stringify(host.state()))
    expect(state.sea.seas[1].sunk).toHaveLength(1)
    expect(parseState(state)).toEqual(host.state())
    const at = (change: object) => ({ ...state, sea: { ...state.sea, ...change } })
    const side = (change: object) =>
      at({ seas: [state.sea.seas[0], { ...state.sea.seas[1], ...change }] })
    const ship = (change: object) => [{ ...rows[0], ...change }, ...rows.slice(1)]
    expect(parseState(at({ fleets: [rows] }))).toBeUndefined()
    expect(parseState(at({ fleets: [ship({ cell: 10 }), null] }))).toBeUndefined()
    expect(parseState(at({ fleets: [ship({ cell: 9 }), null] }))).toBeUndefined()
    expect(parseState(at({ fleets: [ship({ size: 6 }), null] }))).toBeUndefined()
    expect(parseState(at({ fleets: [ship({ down: 1 }), null] }))).toBeUndefined()
    expect(parseState(at({ fleets: [rows.slice(1), null] }))).toBeUndefined()
    expect(parseState(at({ placed: [true] }))).toBeUndefined()
    expect(parseState(at({ placed: [true, 'yes'] }))).toBeUndefined()
    expect(parseState(at({ seas: [state.sea.seas[0]] }))).toBeUndefined()
    expect(parseState(at({ turn: 2 }))).toBeUndefined()
    expect(parseState(at({ winner: 2 }))).toBeUndefined()
    expect(parseState(at({ winner: 1 }))?.sea?.winner).toBe(1)
    expect(parseState(side({ shots: [0, 0] }))).toBeUndefined()
    expect(parseState(side({ shots: [100] }))).toBeUndefined()
    expect(parseState(side({ hits: [5] }))).toBeUndefined()
    expect(parseState(side({ sunk: [{ cell: 0, down: false, size: 7 }] }))).toBeUndefined()
    expect(parseState(side({ sunk: 'all' }))).toBeUndefined()
    expect(parseState({ ...state, sea: null })).toBeUndefined()
    expect(parseState({ ...state, sea: 'open' })).toBeUndefined()
    host.lobby()
    host.choose('tictactoe')
    const board = JSON.parse(JSON.stringify(host.state()))
    expect(parseState({ ...board, sea: state.sea })).toBeUndefined()
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
