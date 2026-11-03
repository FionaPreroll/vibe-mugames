import { linkPair } from '@fionapreroll/p2p/testing'
import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GAME_IDS, isLegal, type Move } from '../core/board'
import { GAMES } from '../core/games'
import { playerToMove } from '../core/table'
import { parseState } from './protocol'
import { GuestSeat, HostSeat } from './session'

/**
 * A hostile phone at the table, made up by fast-check: once it sits down, it sends moves for any
 * game, with any number, out of turn and against the rules, input as if a game ran in real time,
 * and anything else, while honest players play. Whatever it sends, the host takes only moves the
 * rules allow from the player whose turn it is, and the table it sends stays sound.
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

/** A player who sits down honestly; the test may then speak for their phone on its channels. */
async function join(host: HostSeat, name: string) {
  const pair = linkPair()
  const attached = host.room.attach(pair.host.link)
  pair.open()
  const seat = await GuestSeat.join(pair.guest.link, name, `fuzz-token-${name}-${++tokens}`)
  await attached.joined
  await later(150)
  return { seat, pair }
}

const smallInt = fc.integer({ min: -2, max: 45 })

/**
 * A move made to measure, as an attacker who reads the table would: for the game on it, a legal
 * move or a few cells, sent as this move number or the next, whether it is the attacker's turn
 * or not.
 */
type Aimed = { readonly aimed: true; pick: number; cells: number[]; legal: boolean; ahead: number }
const aimed = fc.record({
  aimed: fc.constant(true as const),
  pick: fc.nat(),
  cells: fc.array(smallInt, { minLength: 1, maxLength: 4 }),
  legal: fc.boolean(),
  ahead: fc.constantFrom(0, 0, 0, 1, -1),
})

const hostileMessage = fc.oneof(
  // Moves shaped as the protocol wants, for any game, number and cells.
  fc
    .record({
      game: fc.constantFrom(...GAME_IDS),
      moveNo: fc.oneof(fc.integer({ min: 0, max: 12 }), fc.integer()),
      move: fc.array(smallInt, { minLength: 0, maxLength: 5 }),
    })
    .map((event) => ({
      channel: 'control' as const,
      text: JSON.stringify({ type: 'move', ...event }),
    })),
  // Moves that are not quite moves.
  fc
    .record({
      type: fc.constantFrom('move', 'Move', 'event', 'hello'),
      game: fc.oneof(fc.constantFrom(...GAME_IDS), fc.string(), fc.anything()),
      moveNo: fc.anything(),
      move: fc.anything(),
    })
    .map((data) => ({
      channel: 'control' as const,
      text: JSON.stringify({ type: 'event', data }),
    })),
  fc
    .record({
      game: fc.constantFrom(...GAME_IDS),
      moveNo: fc.integer({ min: 0, max: 12 }),
      move: fc.array(smallInt, { maxLength: 5 }),
    })
    .map((data) => ({
      channel: 'control' as const,
      text: JSON.stringify({ type: 'event', data: { type: 'move', ...data } }),
    })),
  // Input as in a game in real time, and anything else, on either channel.
  fc.array(fc.double(), { maxLength: 4 }).map((data) => ({
    channel: 'fast' as const,
    text: JSON.stringify({ type: 'input', data, ping: 5 }),
  })),
  fc.record({
    channel: fc.constantFrom('control' as const, 'fast' as const),
    text: fc.oneof(fc.string(), fc.json()),
  }),
)

const hostileStep = fc.oneof(
  { weight: 2, arbitrary: aimed },
  { weight: 3, arbitrary: hostileMessage },
)

/** What the attacker sends for a step: an aimed move is made from the table as it is now. */
function text(host: HostSeat, step: Aimed | { channel: 'control' | 'fast'; text: string }) {
  if (!('aimed' in step)) return step
  const state = host.state()
  const legal = legalMoves(host)
  const move = step.legal && legal.length > 0 ? legal[step.pick % legal.length] : step.cells
  return {
    channel: 'control' as const,
    text: JSON.stringify({
      type: 'event',
      data: {
        type: 'move',
        game: state.game ?? 'tictactoe',
        moveNo: state.moveNo + step.ahead,
        move,
      },
    }),
  }
}

/** Every legal move of the position on the table, if a board game is on. */
function legalMoves(host: HostSeat): Move[] {
  const state = host.state()
  if (!state.game || !(state.game in GAMES) || state.outcome !== null || !state.position) return []
  return GAMES[state.game as keyof typeof GAMES].moves(state.position)
}

describe('a hostile phone at the table, fuzzed', () => {
  it('cannot move for others, nor against the rules, while it watches', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(hostileStep, { maxLength: 60 }), async (messages) => {
        const host = new HostSeat('Ada')
        const bo = await join(host, 'Bo')
        const rogue = await join(host, 'Cy')
        expect(host.choose('tictactoe')).toBe(true)
        await later(150)

        // Ada and Bo play the same game every time; Cy watches and sends anything in between.
        const script: [HostSeat | GuestSeat, number][] = [
          [host, 4],
          [bo.seat, 0],
          [host, 3],
          [bo.seat, 1],
          [host, 5],
        ]
        const perStep = Math.ceil(messages.length / script.length)
        for (const [i, [seat, cell]] of script.entries()) {
          for (const step of messages.slice(i * perStep, (i + 1) * perStep)) {
            const message = text(host, step)
            rogue.pair.guest[message.channel].send(message.text)
            await later(0)
          }
          seat.move('tictactoe', i, [cell])
          await later(150)
          expect(host.state().moveNo).toBe(i + 1)
        }
        await later(1000)

        const state = host.state()
        expect(state.outcome).toEqual({ winner: 0, line: [3, 4, 5] })
        expect(state.scores).toEqual({ 0: 1 })
        // What the phones get is a table they can read, the same on every phone.
        expect(parseState(JSON.parse(JSON.stringify(state)))).toEqual(state)
        expect(bo.seat.state()?.outcome).toEqual(state.outcome)
        expect(rogue.seat.state()?.outcome).toEqual(state.outcome)
        host.close()
      }),
      { numRuns: 60 },
    )
  })

  it('makes only legal moves on its own turn, while it holds a seat', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('tictactoe', 'fourinarow', 'muehle', 'dame', 'reversi'),
        fc.array(hostileStep, { maxLength: 60 }),
        fc.array(fc.nat(), { maxLength: 30 }),
        async (game, messages, picks) => {
          const host = new HostSeat('Ada')
          const rogue = await join(host, 'Cy')
          expect(host.choose(game as (typeof GAME_IDS)[number])).toBe(true)
          await later(150)

          let pick = 0
          for (const step of messages) {
            const before = host.state()
            const message = text(host, step)
            rogue.pair.guest[message.channel].send(message.text)
            await later(20)
            const after = host.state()
            if (after.moveNo !== before.moveNo) {
              // Cy's move went through: then it was Cy's turn, and the rules allowed it.
              expect(after.moveNo).toBe(before.moveNo + 1)
              expect(playerToMove(before)).toBe(rogue.seat.id)
              const sent = JSON.parse(message.text)
              const move = (sent.type === 'move' ? sent.move : sent.data?.move) as Move
              expect(
                before.position &&
                  isLegal(GAMES[game as keyof typeof GAMES], before.position, move),
              ).toBe(true)
            }
            // Ada, honest, plays a legal move whenever it is her turn.
            const state = host.state()
            const moves = legalMoves(host)
            if (playerToMove(state) === host.id && moves.length > 0) {
              const move = moves[
                (picks[pick++ % Math.max(1, picks.length)] ?? 0) % moves.length
              ] as Move
              host.move(state.game as (typeof GAME_IDS)[number], state.moveNo, move)
              expect(host.state().moveNo).toBe(state.moveNo + 1)
            }
            const now = host.state()
            expect(parseState(JSON.parse(JSON.stringify(now)))).toEqual(now)
          }
          host.close()
        },
      ),
      { numRuns: 60 },
    )
  })
})
