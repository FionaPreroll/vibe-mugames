import { MAX_MESSAGE_LENGTH } from '@fionapreroll/p2p'
import { linkPair } from '@fionapreroll/p2p/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { playerToMove, Table, type TableState } from '../core/table'
import { encodeText } from '../core/text'
import {
  encode,
  MAX_LOG,
  MAX_QUESTION,
  NO,
  termNames,
  VOTE_SECONDS,
  type WhoMove,
  YES,
} from '../core/werbinich'
import { parseEvent, parseState } from './protocol'
import { GuestSeat, HostSeat } from './session'

/**
 * Wer bin ich? at the table and between phones: the one asking asks, the others answer at once,
 * the time to answer runs on the host, nobody's phone gets their own term, and whatever another
 * phone sends is checked.
 */

const wire = (state: unknown) => JSON.parse(JSON.stringify(state))

function table(players: number, together = false): Table {
  const t = new Table(() => 0, { together })
  for (let id = 0; id < players; id++) t.join(id, `Player ${id}`)
  expect(t.choose('werbinich')).toBe(true)
  return t
}

/** Plays a move at the table's own move number. */
const play = (t: Table, id: number, move: WhoMove) =>
  t.move(id, 'werbinich', t.state().moveNo, encode(move))

describe('Wer bin ich? at the table', () => {
  it('takes everyone’s answers at once, and none meant for a question before', () => {
    const t = table(3)
    expect(t.state(1).who?.terms).toEqual([0, null, 2])
    expect(playerToMove(t.state())).toBe(0)
    expect(play(t, 1, { kind: 'ask', text: 'Can I fly?' })).toBe(false)
    expect(play(t, 0, { kind: 'ask', text: 'Can I fly?' })).toBe(true)
    const asked = t.state().moveNo
    expect(playerToMove(t.state())).toBe(1)
    expect(play(t, 2, { kind: 'vote', vote: YES })).toBe(true)
    // Bo answered before Cy's answer arrived: an older move number still counts.
    expect(t.move(1, 'werbinich', asked, encode({ kind: 'vote', vote: YES }))).toBe(true)
    expect(t.state().who?.log.at(-1)?.answer).toBe('yes')
    expect(t.state().last).toBeNull()

    // The next question: answers meant for the last one no longer count.
    expect(play(t, 0, { kind: 'ask', text: 'Do I bark?' })).toBe(true)
    expect(t.move(1, 'werbinich', asked, encode({ kind: 'vote', vote: NO }))).toBe(false)
  })

  it('runs the time to answer on the host, and sends the table when a second has passed', () => {
    const t = table(2)
    expect(t.tick(5)).toBe(false)
    play(t, 0, { kind: 'ask', text: 'Do I bark?' })
    expect(t.tick(0.4)).toBe(false)
    expect(t.tick(0.7)).toBe(true)
    expect(t.tick(VOTE_SECONDS)).toBe(true)
    expect(t.state().who?.phase).toBe('ask')
    expect(t.state().who?.asker).toBe(0)
  })

  it('counts the game for the first to know their term', () => {
    const t = table(3)
    play(t, 0, { kind: 'pass' })
    play(t, 1, { kind: 'guess', text: termNames(1, 'de')[0] ?? '' })
    play(t, 2, { kind: 'giveUp' })
    expect(t.state().outcome).toEqual({ winner: 1, line: [] })
    expect(t.state().scores).toEqual({ 1: 1 })
    expect(t.state(1).who?.terms).toEqual([0, 1, 2])
  })

  it('has the one asking tap what was said aloud on one device, where nobody types', () => {
    const t = table(2, true)
    expect(t.state(0).who?.terms).toEqual([0, 1])
    expect(play(t, 0, { kind: 'ask', text: 'Do I bark?' })).toBe(false)
    expect(play(t, 0, { kind: 'said', said: NO })).toBe(true)
    expect(playerToMove(t.state())).toBe(1)
  })
})

describe('the messages of Wer bin ich?', () => {
  it('reads back the table as the host sends it, and keeps it small', () => {
    const t = table(8)
    const long = `${'ö'.repeat(MAX_QUESTION - 2)} ?`
    for (let n = 0; n < MAX_LOG; n++) {
      play(t, 0, { kind: 'ask', text: long })
      for (let id = 1; id < 8; id++) play(t, id, { kind: 'vote', vote: YES })
    }
    play(t, 0, { kind: 'guess', text: long })
    play(t, 3, { kind: 'vote', vote: NO })
    for (const viewer of [0, 3, -1]) {
      const state = t.state(viewer)
      expect(parseState(wire(state))).toEqual(wire(state))
      expect(JSON.stringify({ type: 'state', data: state }).length).toBeLessThan(MAX_MESSAGE_LENGTH)
    }
  })

  it('turns down a table that does not fit', () => {
    const t = table(3)
    play(t, 0, { kind: 'ask', text: 'Can I fly?' })
    play(t, 1, { kind: 'vote', vote: NO })
    const state: TableState = wire(t.state(1))
    expect(parseState(state)).toEqual(state)
    const w = state.who as NonNullable<TableState['who']>
    const entry = { seat: 0, text: 'Can I fly?', guess: false, answer: 'no', counts: [0, 2, 0] }
    const bad = [
      { ...state, who: null },
      { ...state, who: { ...w, asker: 3 } },
      { ...state, who: { ...w, phase: 'think' } },
      { ...state, who: { ...w, phase: 'ask' } },
      { ...state, who: { ...w, question: null } },
      { ...state, who: { ...w, question: { text: ' x', guess: false } } },
      { ...state, who: { ...w, left: VOTE_SECONDS + 1 } },
      { ...state, who: { ...w, terms: [0, 1] } },
      { ...state, who: { ...w, terms: [0, 10_000, 2] } },
      { ...state, who: { ...w, kinds: ['animal', 'animal', 'plant'] } },
      { ...state, who: { ...w, votes: [null, 3, null] } },
      { ...state, who: { ...w, solved: [1], gaveUp: [1] } },
      { ...state, who: { ...w, log: [{ ...entry, answer: 'perhaps' }] } },
      { ...state, who: { ...w, log: [{ ...entry, counts: [0, 2] }] } },
      { ...state, who: { ...w, log: [{ ...entry, text: 'x'.repeat(61) }] } },
      { ...state, who: { ...w, winner: 'nobody' } },
      { ...state, who: { ...w, together: 'no' } },
      { ...state, words: w },
      { ...state, last: [3, 1] },
    ]
    for (const [i, value] of bad.entries()) expect([i, parseState(value)]).toEqual([i, undefined])
  })

  it('takes moves only as the rules make them', () => {
    const move = (m: unknown) => parseEvent({ type: 'move', game: 'werbinich', moveNo: 3, move: m })
    const question = encode({ kind: 'ask', text: 'Bin ich ein 🐘?' })
    expect(move(question)?.move).toEqual(question)
    expect(move([1, ...encodeText('x'.repeat(MAX_QUESTION + 1), MAX_QUESTION + 1)])).toBeUndefined()
    expect(move([2, 0xd800])).toBeUndefined()
    expect(move([3, 2])?.move).toEqual([3, 2])
    expect(move([3, 3])).toBeUndefined()
    expect(move([4])?.move).toEqual([4])
    expect(move([6, 2])?.move).toEqual([6, 2])
    expect(move('Bin ich ein Hund?')).toBeUndefined()
  })
})

describe('Wer bin ich? between phones', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'],
    })
  })
  afterEach(() => vi.useRealTimers())

  it('never sends a phone its own term, and runs the time to answer on the host', async () => {
    const host = new HostSeat('Ada')
    const pair = linkPair()
    const attached = host.room.attach(pair.host.link)
    pair.open()
    const bo = await GuestSeat.join(pair.guest.link, 'Bo', 'who-token')
    await attached.joined
    await vi.advanceTimersByTimeAsync(150)
    expect(host.choose('werbinich')).toBe(true)
    await vi.advanceTimersByTimeAsync(150)
    const terms = bo.state()?.who?.terms ?? []
    expect(terms[1]).toBeNull()
    expect(terms[0]).toEqual(expect.any(Number))
    expect(host.state().who?.terms[0]).toBeNull()
    host.move('werbinich', host.state().moveNo, encode({ kind: 'ask', text: 'Can I fly?' }))
    await vi.advanceTimersByTimeAsync(300)
    expect(bo.state()?.who?.question?.text).toBe('Can I fly?')
    await vi.advanceTimersByTimeAsync(10_000)
    expect(bo.state()?.who?.left).toBe(VOTE_SECONDS - 10)
    bo.move('werbinich', bo.state()?.moveNo ?? 0, encode({ kind: 'vote', vote: NO }))
    await vi.advanceTimersByTimeAsync(300)
    expect(bo.state()?.who?.asker).toBe(1)
    expect(bo.state()?.who?.log.at(-1)?.answer).toBe('no')
    host.close()
  })
})
