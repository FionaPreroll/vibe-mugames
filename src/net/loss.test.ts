import { type Conditions, linkPair, seededRandom } from '@fionapreroll/p2p/testing'
import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BOARD_GAME_IDS, type GameId, isBoardGame, LIVE_GAME_IDS, type Move } from '../core/board'
import { GAMES, seatRange } from '../core/games'
import * as ludo from '../core/ludo'
import * as maex from '../core/maexchen'
import * as miau from '../core/miaumiau'
import * as sea from '../core/seeschlacht'
import { playerToMove, type TableState } from '../core/table'
import * as wolf from '../core/werwolf'
import { GuestSeat, HostSeat, type Seat } from './session'

/**
 * Every game over a weak connection, as on a hotspot at the edge of its range: the library's
 * connections in memory lose a share of the `fast` channel's messages (the table, input, pings)
 * and delay and reorder them, while `control` (the moves) only arrives late, as a reliable
 * channel would. Every phone plays as an honest player would, from the table as it last heard
 * of it: whatever is lost, every move arrives once, and in the end every phone shows the table
 * the host keeps for it. Games in real time keep going, each phone only a few ticks behind, as many as the loss makes likely.
 */

/** The host's dice and shuffles, by seed, so that a run that fails fails again. */
const dice = vi.hoisted(() => ({ next: Math.random }))
vi.mock('../random', () => ({ random: () => dice.next() }))

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

/** A table of `phones` phones, the host's included, each player's over a weak connection. */
async function table(phones: number, conditions: Conditions) {
  const host = new HostSeat('Ada')
  const guests: GuestSeat[] = []
  for (let i = 1; i < phones; i++) {
    const pair = linkPair({ conditions: { ...conditions, seed: (conditions.seed ?? 1) + i * 10 } })
    const attached = host.room.attach(pair.host.link)
    pair.open()
    const joining = GuestSeat.join(pair.guest.link, `P${i}`, `loss-token-${++tokens}-xxxx`)
    // Hello and welcome take their time on the way too.
    await later(500)
    guests.push(await joining)
    await attached.joined
  }
  // Every event that reaches the host, by player, and every table each player was sent.
  const events = new Map<number, number>()
  const onEvent = host.room.onEvent
  host.room.onEvent = (player, event) => {
    events.set(player.id, (events.get(player.id) ?? 0) + 1)
    onEvent(player, event)
  }
  const sent = new Map<number, string[]>()
  const stateFor = host.room.stateFor
  host.room.stateFor = (player, state) => {
    const mine = stateFor ? stateFor(player, state) : state
    const list = sent.get(player.id) ?? []
    list.push(JSON.stringify(mine))
    if (list.length > 60) list.shift()
    sent.set(player.id, list)
    return mine
  }
  return { host, guests, events, sent }
}

/** A move from `choices`, by the run's own random numbers. */
const pick = <T>(choices: readonly T[], random: () => number): T | undefined =>
  choices[Math.floor(random() * choices.length)]

/**
 * What an honest player at this phone may do now, from the table as the phone knows it: every
 * move the rules allow them, or none if it is not their turn.
 */
function movesFor(state: TableState, viewer: number, random: () => number): Move[] {
  const game = state.game
  if (game === null || state.outcome !== null) return []
  const seat = state.seats.indexOf(viewer)
  if (seat < 0) return []
  const toMove = playerToMove(state) === viewer
  if (isBoardGame(game)) return toMove && state.position ? GAMES[game].moves(state.position) : []
  if (state.ludo) return toMove ? ludo.moves(state.ludo).map(ludo.encode) : []
  if (state.cards) {
    const view = state.cards
    const all: miau.MiauMove[] = [{ kind: 'draw' }, { kind: 'pass' }]
    for (const card of view.hand) {
      if (miau.rankOf(card) === miau.JACK)
        for (let suit = 0; suit < miau.SUITS; suit++) all.push({ kind: 'play', card, suit })
      else all.push({ kind: 'play', card })
    }
    return toMove ? all.filter((m) => miau.allowed(view, m)).map(miau.encode) : []
  }
  if (state.dice) {
    const view = state.dice
    const all: maex.MaexMove[] = [
      { kind: 'roll' },
      { kind: 'doubt' },
      { kind: 'yield' },
      ...maex.THROWS.map((value) => ({ kind: 'claim' as const, value })),
    ]
    return all.filter((m) => maex.allowed(view, seat, m)).map(maex.encode)
  }
  if (state.sea) {
    const view = state.sea
    if (view.placed[seat] === false)
      return [sea.encode({ kind: 'place', fleet: sea.randomFleet(random) })]
    const cells = Array.from({ length: sea.SEA_CELLS }, (_, cell) => cell)
    return cells
      .filter((cell) => sea.allowed(view, seat, { kind: 'shoot', cell }))
      .map((cell) => [cell])
  }
  if (state.village) return wolf.choices(state.village, seat).map((target) => [target])
  return []
}

/** Every phone takes its turn from what it knows, a few times a second, until the game ends. */
async function play(
  phones: readonly Seat[],
  host: HostSeat,
  random: () => number,
  steps: number,
): Promise<number[]> {
  const sentMoves = phones.map(() => 0)
  for (let step = 0; step < steps && host.state().outcome === null; step++) {
    for (const [i, phone] of phones.entries()) {
      const state = phone.state()
      if (!state?.game) continue
      const move = pick(movesFor(state, phone.id, random), random)
      if (!move) continue
      phone.move(state.game, state.moveNo, move)
      sentMoves[i] = (sentMoves[i] ?? 0) + 1
    }
    await later(50 + Math.floor(random() * 250))
  }
  return sentMoves
}

/** Once the table rests, every player's phone shows exactly what the host keeps for them. */
async function agree(host: HostSeat, guests: readonly GuestSeat[]): Promise<void> {
  await later(3000)
  for (const guest of guests) expect(guest.state()).toEqual(host.table.state(guest.id))
}

const LOSSES = [0.1, 0.3, 0.5] as const

/** The longest the weak connections below hold a message back, in ticks of 1/30 s. */
const IN_FLIGHT = Math.ceil(150 / (1000 / 30))

/**
 * How many of the newest states sent a phone's table may be from, at a share `loss` of them
 * lost: those still on their way, and enough before them that all of them lost is less likely
 * than one in a billion. Every message is lost on its own, so at 50 % ten in a row go now and
 * then: a window of 15 for every loss, as at first, failed in CI (50 %, seed 644748).
 */
function window(loss: number): number {
  return IN_FLIGHT + Math.ceil(Math.log(1e-9) / Math.log(loss))
}
const TURN_GAMES: GameId[] = [
  ...BOARD_GAME_IDS,
  'ludo',
  'miaumiau',
  'seeschlacht',
  'maexchen',
  'werwolf',
]

describe('every game over a weak connection', () => {
  for (const game of TURN_GAMES) {
    it(`plays ${game} to the same table on every phone, every move once`, async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...LOSSES),
          fc.integer({ min: 1, max: 1_000_000 }),
          async (loss, seed) => {
            dice.next = seededRandom(seed)
            const random = seededRandom(seed + 1)
            const { min } = seatRange(game)
            const phones = Math.max(2, min)
            const { host, guests, events } = await table(phones, {
              loss,
              delayMs: [10, 150],
              seed,
            })
            expect(host.choose(game)).toBe(true)
            await later(500)
            const sent = await play([host, ...guests], host, random, 300)
            await agree(host, guests)
            // Every move a player's phone sent reached the host once: none lost, none twice.
            for (const [i, guest] of guests.entries())
              expect(events.get(guest.id) ?? 0).toBe(sent[i + 1])
            // And the game went on: to its end, or at least ten moves.
            const end = host.state()
            expect(end.outcome !== null || end.moveNo >= 10).toBe(true)
            host.close()
          },
        ),
        { numRuns: 4 },
      )
    })
  }

  for (const game of LIVE_GAME_IDS) {
    it(`keeps ${game} going in real time, every phone only a few ticks behind`, async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...LOSSES),
          fc.integer({ min: 1, max: 1_000_000 }),
          async (loss, seed) => {
            dice.next = seededRandom(seed)
            const random = seededRandom(seed + 1)
            const { host, guests, sent } = await table(2, { loss, delayMs: [10, 150], seed })
            expect(host.choose(game)).toBe(true)
            const phones: Seat[] = [host, ...guests]
            for (let step = 0; step < 60 && host.state().outcome === null; step++) {
              for (const phone of phones) {
                const round = phone.state()?.round ?? 0
                // Lichtrenner: a heading; air hockey: where the mallet should go.
                phone.input(
                  game === 'lichtrenner'
                    ? [round, Math.floor(random() * 4)]
                    : [round, random() - 0.5, random() * 1.4],
                )
              }
              await later(100 + Math.floor(random() * 200))
              const state = host.state()
              if (state.outcome !== null) break
              // From the second second on: the first states may still be on their way.
              if (step < 5) continue
              for (const guest of guests) {
                // The newest table this phone heard of is among the last few sent, as long as
                // the game is on: 14 at 10 % lost, 23 at 30 %, 35 at 50 %.
                const recent = (sent.get(guest.id) ?? []).slice(-window(loss))
                expect(recent).toContain(JSON.stringify(guest.state()))
              }
            }
            // Both players' input got through: the host's game moved for both.
            const state = host.state()
            if (game === 'lichtrenner')
              for (const rider of state.race?.riders ?? [])
                expect(rider.path.length).toBeGreaterThan(1)
            else expect(state.rink?.mallets.every((m) => m.x !== 0 || m.y !== 0)).toBe(true)
            host.lobby()
            await agree(host, guests)
            host.close()
          },
        ),
        { numRuns: 6 },
      )
    })
  }
})
