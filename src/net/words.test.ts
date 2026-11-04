import { MAX_MESSAGE_LENGTH } from '@fionapreroll/p2p'
import { linkPair } from '@fionapreroll/p2p/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CATEGORIES, encode, MAX_ANSWER, STOP_SECONDS, WRITE_SECONDS } from '../core/stadtlandfluss'
import { playerToMove, Table, type TableState } from '../core/table'
import { encodeText } from '../core/text'
import { parseEvent, parseState } from './protocol'
import { GuestSeat, HostSeat } from './session'

/**
 * Stadt, Land, Fluss at the table and between phones: everyone writes at once, the time runs on
 * the host, nobody sees another's answers before the round is checked, and whatever another
 * phone sends is checked.
 */

const wire = (state: unknown) => JSON.parse(JSON.stringify(state))
const write = (category: number, text: string) => encode({ kind: 'write', category, text })

function table(players: number, together = false): Table {
  const t = new Table(() => 0, { together })
  for (let id = 0; id < players; id++) t.join(id, `Player ${id}`)
  expect(t.choose('stadtlandfluss')).toBe(true)
  return t
}

describe('Stadt, Land, Fluss at the table', () => {
  it('takes everyone’s answers at once, and none meant for a round before', () => {
    const t = table(3)
    expect(t.state().words?.letters).toEqual(['A'])
    expect(t.move(1, 'stadtlandfluss', 0, write(0, 'Aachen'))).toBe(true)
    // Ada's answer was written before Bo's arrived: an older move number still counts.
    expect(t.move(0, 'stadtlandfluss', 0, write(0, 'Augsburg'))).toBe(true)
    expect(t.move(2, 'stadtlandfluss', 5, write(0, 'Ahlen'))).toBe(false)
    expect(t.state(1).words?.answers[1]?.[0]).toBe('Aachen')
    expect(t.state(1).words?.answers[0]).toBeNull()
    expect(t.state().last).toBeNull()
    expect(playerToMove(t.state())).toBeNull()

    // The time runs out on the host: the answers are checked, and old moves no longer count.
    const before = t.state().moveNo
    expect(t.tick(WRITE_SECONDS - 0.5)).toBe(true)
    expect(t.tick(0.2)).toBe(false)
    expect(t.tick(0.4)).toBe(true)
    expect(t.state(2).words?.phase).toBe('check')
    expect(t.state(2).words?.answers[0]?.[0]).toBe('Augsburg')
    expect(t.move(2, 'stadtlandfluss', before - 1, encode({ kind: 'ready' }))).toBe(false)
    expect(playerToMove(t.state())).toBe(0)
    for (const id of [0, 1, 2]) {
      expect(t.move(id, 'stadtlandfluss', t.state().moveNo, encode({ kind: 'ready' }))).toBe(true)
    }
    expect(t.state().words?.letters).toEqual(['A', 'B'])
    expect(t.state().words?.totals).toEqual([10, 10, 0])
  })

  it('counts the game for the player with the most points', () => {
    const t = table(2)
    for (let round = 0; round < 5; round++) {
      const letter = t.state().words?.letters.at(-1) ?? ''
      t.move(1, 'stadtlandfluss', t.state().moveNo, write(2, `${letter}x`))
      t.tick(WRITE_SECONDS)
      for (const id of [0, 1]) {
        t.move(id, 'stadtlandfluss', t.state().moveNo, encode({ kind: 'ready' }))
      }
    }
    expect(t.state().outcome).toEqual({ winner: 1, line: [] })
    expect(t.state().scores).toEqual({ 1: 1 })
    expect(t.tick(1)).toBe(false)
  })

  it('has players write in turn on one device, and nothing runs out there', () => {
    const t = table(2, true)
    expect(playerToMove(t.state())).toBe(0)
    expect(t.move(1, 'stadtlandfluss', 0, write(0, 'Aachen'))).toBe(false)
    expect(t.move(0, 'stadtlandfluss', 0, encode({ kind: 'stop' }))).toBe(true)
    expect(playerToMove(t.state())).toBe(1)
    expect(t.tick(10_000)).toBe(false)
    expect(t.move(1, 'stadtlandfluss', 1, encode({ kind: 'stop' }))).toBe(true)
    expect(t.state().words?.phase).toBe('check')
    expect(playerToMove(t.state())).toBeNull()
  })
})

describe('the messages of Stadt, Land, Fluss', () => {
  it('reads back the table as the host sends it, and keeps it small', () => {
    const t = table(8)
    for (let id = 0; id < 8; id++) {
      for (let c = 0; c < CATEGORIES.length; c++) {
        t.move(id, 'stadtlandfluss', 0, write(c, `A${'ö'.repeat(MAX_ANSWER - 1)}`))
      }
    }
    t.move(0, 'stadtlandfluss', 0, encode({ kind: 'stop' }))
    for (const viewer of [0, 3, -1]) {
      expect(parseState(wire(t.state(viewer)))).toEqual(wire(t.state(viewer)))
    }
    t.tick(STOP_SECONDS)
    for (let id = 1; id < 8; id++) {
      t.move(
        id,
        'stadtlandfluss',
        t.state().moveNo,
        encode({ kind: 'object', seat: 0, category: 1 }),
      )
    }
    const checked = t.state(0)
    expect(parseState(wire(checked))).toEqual(wire(checked))
    expect(JSON.stringify({ type: 'state', data: checked }).length).toBeLessThan(MAX_MESSAGE_LENGTH)
  })

  it('turns down a table that does not fit', () => {
    const t = table(3)
    t.move(0, 'stadtlandfluss', 0, write(0, 'Aachen'))
    const state: TableState = wire(t.state(0))
    const w = state.words as NonNullable<TableState['words']>
    const bad = [
      { ...state, words: null },
      { ...state, words: { ...w, letters: [] } },
      { ...state, words: { ...w, letters: ['Q'] } },
      { ...state, words: { ...w, letters: ['A', 'A'] } },
      { ...state, words: { ...w, phase: 'think' } },
      { ...state, words: { ...w, answers: [['Aachen'], null, null] } },
      { ...state, words: { ...w, answers: [['x'.repeat(25), '', '', '', '', ''], null, null] } },
      { ...state, words: { ...w, answers: [[' Aachen', '', '', '', '', ''], null, null] } },
      { ...state, words: { ...w, filled: [7, 0, 0] } },
      { ...state, words: { ...w, ready: [true, false] } },
      { ...state, words: { ...w, left: WRITE_SECONDS + 1 } },
      { ...state, words: { ...w, stopper: 3 } },
      { ...state, words: { ...w, winner: 'nobody' } },
      { ...state, words: { ...w, together: 'no' } },
      {
        ...state,
        words: { ...w, objections: [[[0, 0], [], [], [], [], []], ...w.objections.slice(1)] },
      },
      { ...state, last: [1, 0, 65] },
    ]
    for (const [i, value] of bad.entries()) expect([i, parseState(value)]).toEqual([i, undefined])
  })

  it('takes moves only as the rules make them', () => {
    const move = (m: unknown) =>
      parseEvent({ type: 'move', game: 'stadtlandfluss', moveNo: 3, move: m })
    expect(move(write(1, 'Kenia 🦒'))?.move).toEqual(write(1, 'Kenia 🦒'))
    expect(move([1, 0, ...encodeText('x'.repeat(30), 30)])).toBeUndefined()
    expect(move([1, 0, 9])).toBeUndefined()
    expect(move([1, 0, 0xd800])).toBeUndefined()
    expect(move([1, 6, 65])).toBeUndefined()
    expect(move([2])?.move).toEqual([2])
    expect(move([3, 1, 2])?.move).toEqual([3, 1, 2])
    expect(move([3, 1])).toBeUndefined()
    expect(move([4, 0])).toBeUndefined()
    expect(move('Aachen')).toBeUndefined()
  })
})

describe('Stadt, Land, Fluss between phones', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'],
    })
  })
  afterEach(() => vi.useRealTimers())

  it('runs the time on the host, and shows each phone only its own answers', async () => {
    const host = new HostSeat('Ada')
    const pair = linkPair()
    const attached = host.room.attach(pair.host.link)
    pair.open()
    const bo = await GuestSeat.join(pair.guest.link, 'Bo', 'words-token')
    await attached.joined
    await vi.advanceTimersByTimeAsync(150)
    expect(host.choose('stadtlandfluss')).toBe(true)
    await vi.advanceTimersByTimeAsync(150)
    const letter = host.state().words?.letters.at(-1) ?? ''
    bo.move('stadtlandfluss', 0, write(0, `${letter}stadt`))
    host.move('stadtlandfluss', 0, write(0, `${letter}dorf`))
    await vi.advanceTimersByTimeAsync(300)
    expect(bo.state()?.words?.answers).toEqual([null, [`${letter}stadt`, '', '', '', '', '']])
    expect(host.state().words?.answers[1]).toBeNull()

    await vi.advanceTimersByTimeAsync(60_000)
    expect(bo.state()?.words?.left).toBe(WRITE_SECONDS - 60)
    await vi.advanceTimersByTimeAsync((WRITE_SECONDS - 60) * 1000 + 500)
    expect(bo.state()?.words?.phase).toBe('check')
    expect(bo.state()?.words?.answers[0]?.[0]).toBe(`${letter}dorf`)
    host.close()
  })
})
