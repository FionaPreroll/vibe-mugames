import { cleanName, inRange, isId, isNumber, isObject, list, type Parse } from '@fionapreroll/p2p'
import * as hockey from '../core/airhockey'
import {
  type Board,
  type BoardGame,
  EMPTY,
  type GameId,
  isBoardGame,
  isGameId,
  isLiveGame,
  KIND,
  type Move,
  type Outcome,
  PHASES,
  type Position,
} from '../core/board'
import { GAMES, seatRange } from '../core/games'
import * as licht from '../core/lichtrenner'
import { DECK, decode, encode, isCard, isSuit, type MiauView } from '../core/miaumiau'
import * as sea from '../core/seeschlacht'
import type { Player, TableState } from '../core/table'

/**
 * What phones of the Spielekiste say to each other, on top of `@fionapreroll/p2p`'s room: the
 * host sends the table as the state, many times a second; players send their moves as events,
 * which arrive once each, and in games in real time what they want now as their input, many
 * times a second. Raise PROTOCOL whenever any of it changes, so phones of different versions
 * refuse to play together instead of misreading each other.
 */
export const PROTOCOL = 6

/**
 * What a player at the board of a game in real time wants now, sent many times a second, of
 * which only the newest counts: the round it is meant for, then the game's numbers (see
 * `Table.input`). Null in every other game.
 */
export type Input = readonly number[] | null

/** A move, meant as move number `moveNo` of the game on the table. */
export type Event = {
  readonly type: 'move'
  readonly game: GameId
  readonly moveNo: number
  readonly move: Move
}

const MAX_PLAYERS = 8
const MAX_MOVES = 100_000
/** More pieces than any game has in hand. */
const MAX_HAND = 12

/** The most numbers an input has: the round, and a mallet's two. */
const MAX_INPUT = 3

export const parseInput: Parse<Input> = (value) => {
  if (value === null) return null
  const numbers = list(value, MAX_INPUT, (n) => (isNumber(n) ? n : undefined))
  return numbers && numbers.length > 0 ? numbers : undefined
}

export const parseEvent: Parse<Event> = (value) => {
  if (!isObject(value) || value.type !== 'move' || !isGameId(value.game)) return undefined
  if (!isWhole(value.moveNo, 0, MAX_MOVES)) return undefined
  const move = parseMove(value.move, value.game)
  if (!move) return undefined
  return { type: 'move', game: value.game, moveNo: value.moveNo, move }
}

/**
 * A board game's move, a path of one or more cells of its board, no longer than its longest
 * move; or a move of Miau-Miau or Sea Battle, in numbers as their `encode` makes them.
 */
function parseMove(value: unknown, game: GameId): Move | undefined {
  // Games in real time have no moves, only input.
  if (isLiveGame(game)) return undefined
  if (game === 'seeschlacht') {
    const numbers = list(value, sea.FLEET.length, (n) =>
      isWhole(n, 0, 2 * sea.SEA_CELLS - 1) ? n : undefined,
    )
    const move = numbers && sea.decode(numbers)
    return move ? sea.encode(move) : undefined
  }
  if (!isBoardGame(game)) {
    const numbers = list(value, 2, (n) => (isWhole(n, 0, DECK + 1) ? n : undefined))
    const move = numbers && decode(numbers)
    return move ? encode(move) : undefined
  }
  const rules = GAMES[game]
  const move = list(value, rules.steps, (cell) =>
    isWhole(cell, 0, rules.cells - 1) ? cell : undefined,
  )
  return move && move.length > 0 ? move : undefined
}

/** The host's table, checked field by field: a phone draws nothing it cannot make sense of. */
export const parseState: Parse<TableState> = (value) => {
  if (!isObject(value)) return undefined
  const players = list(value.players, MAX_PLAYERS, parsePlayer)
  if (!players) return undefined
  const game = value.game === null ? null : isGameId(value.game) ? value.game : undefined
  if (game === undefined) return undefined
  const range = game ? seatRange(game) : { min: 0, max: 0 }
  const seats = list(value.seats, range.max, (id) => (isId(id) ? id : undefined))
  if (!seats || seats.length < range.min) return undefined
  const rules = game && isBoardGame(game) ? GAMES[game] : null
  const position = rules
    ? parsePosition(value.position, rules, seats.length)
    : value.position === null
      ? null
      : undefined
  if (position === undefined) return undefined
  const cards =
    game === 'miaumiau'
      ? parseCards(value.cards, seats.length)
      : value.cards === null
        ? null
        : undefined
  if (cards === undefined) return undefined
  const seaView =
    game === 'seeschlacht' ? parseSea(value.sea) : value.sea === null ? null : undefined
  if (seaView === undefined) return undefined
  const race =
    game === 'lichtrenner'
      ? parseRace(value.race, seats.length)
      : value.race === null
        ? null
        : undefined
  if (race === undefined) return undefined
  const rink = game === 'airhockey' ? parseRink(value.rink) : value.rink === null ? null : undefined
  if (rink === undefined) return undefined
  if (!isWhole(value.round, 0, MAX_ROUNDS)) return undefined
  if (!isWhole(value.moveNo, 0, MAX_MOVES)) return undefined
  const last = value.last === null || !game ? null : parseMove(value.last, game)
  if (last === undefined) return undefined
  const outcome = parseOutcome(value.outcome, position?.board ?? [], seats.length)
  if (outcome === undefined) return undefined
  if (!isObject(value.scores)) return undefined
  const scores: Record<number, number> = {}
  for (const [id, score] of Object.entries(value.scores).slice(0, MAX_PLAYERS * 4)) {
    if (isId(Number(id)) && isWhole(score, 0, 1_000_000)) scores[Number(id)] = score
  }
  return {
    players,
    game,
    seats,
    position,
    cards,
    sea: seaView,
    race,
    rink,
    round: value.round,
    moveNo: value.moveNo,
    last,
    outcome,
    scores,
  }
}

/**
 * Sea Battle as the host shows it to this phone: fleets that are whole, and for each sea the
 * shots that fell on it, the hits among them, and the ships sunk there, all on the sea.
 */
function parseSea(value: unknown): sea.SeaView | undefined {
  if (!isObject(value)) return undefined
  const fleets = list(value.fleets, sea.SEA_SEATS, (fleet) =>
    fleet === null ? null : parseFleet(fleet, sea.FLEET.length),
  )
  if (
    !fleets ||
    fleets.length !== sea.SEA_SEATS ||
    !fleets.every((f) => f === null || sea.isFleet(f))
  )
    return undefined
  const placed = list(value.placed, sea.SEA_SEATS, (p) => (typeof p === 'boolean' ? p : undefined))
  if (!placed || placed.length !== sea.SEA_SEATS) return undefined
  const seas = list(value.seas, sea.SEA_SEATS, parseSide)
  if (!seas || seas.length !== sea.SEA_SEATS) return undefined
  const { turn, winner } = value
  if (!isWhole(turn, 0, sea.SEA_SEATS - 1)) return undefined
  if (winner !== null && !isWhole(winner, 0, sea.SEA_SEATS - 1)) return undefined
  return { fleets, placed, seas, turn, winner }
}

function parseSide(value: unknown): sea.SeaSide | undefined {
  if (!isObject(value)) return undefined
  const cell = (n: unknown) => (sea.isCell(n) ? n : undefined)
  const shots = list(value.shots, sea.SEA_CELLS, cell)
  if (!shots || new Set(shots).size !== shots.length) return undefined
  const hits = list(value.hits, sea.SEA_CELLS, cell)
  if (!hits?.every((hit) => shots.includes(hit))) return undefined
  const sunk = parseFleet(value.sunk, sea.FLEET.length)
  if (!sunk) return undefined
  return { shots, hits, sunk }
}

/** Ships, each on the sea and of a size a fleet has. */
function parseFleet(value: unknown, max: number): sea.Ship[] | undefined {
  return list(value, max, (ship) => {
    if (!isObject(ship) || typeof ship.down !== 'boolean') return undefined
    if (!sea.isCell(ship.cell) || !(sea.FLEET as readonly unknown[]).includes(ship.size)) {
      return undefined
    }
    const parsed = { cell: ship.cell, down: ship.down, size: ship.size as number }
    return sea.shipCells(parsed) ? parsed : undefined
  })
}

const MAX_ROUNDS = 1_000_000

/** Lichtrenner: a rider for every seat, each with a path of straight walls on the grid. */
function parseRace(value: unknown, seats: number): licht.LichtView | undefined {
  if (!isObject(value)) return undefined
  const riders = list(value.riders, seats, parseRider)
  if (!riders || riders.length !== seats) return undefined
  if (!inRange(value.countdown, 0, licht.COUNTDOWN)) return undefined
  if (!isWhole(value.steps, 0, licht.CELLS)) return undefined
  return { riders, countdown: value.countdown, steps: value.steps }
}

function parseRider(value: unknown): licht.Rider | undefined {
  if (!isObject(value) || typeof value.alive !== 'boolean') return undefined
  if (!isWhole(value.heading, 0, 3)) return undefined
  const path = list(value.path, licht.CELLS, (cell) =>
    isWhole(cell, 0, licht.CELLS - 1) ? cell : undefined,
  )
  if (!path || !licht.isPath(path)) return undefined
  return { path, heading: value.heading, alive: value.alive }
}

/** Air hockey: the puck and both mallets on or near the rink, the goals and the pause. */
function parseRink(value: unknown): hockey.HockeyView | undefined {
  if (!isObject(value)) return undefined
  const puck = parseDisc(value.puck)
  const mallets = list(value.mallets, 2, parseDisc)
  const goals = list(value.goals, 2, (n) => (isWhole(n, 0, hockey.GOALS_TO_WIN) ? n : undefined))
  if (!puck || mallets?.length !== 2 || goals?.length !== 2) return undefined
  const [m0, m1] = mallets
  const [g0, g1] = goals
  if (!m0 || !m1 || g0 === undefined || g1 === undefined) return undefined
  if (!inRange(value.pause, 0, hockey.COUNTDOWN)) return undefined
  const scored =
    value.scored === null ? null : isWhole(value.scored, 0, 1) ? value.scored : undefined
  if (scored === undefined) return undefined
  return { puck, mallets: [m0, m1], goals: [g0, g1], pause: value.pause, scored }
}

function parseDisc(value: unknown): hockey.Disc | undefined {
  if (!isObject(value)) return undefined
  const { x, y, vx, vy } = value
  const speed = 2 * hockey.MALLET_SPEED
  if (!inRange(x, -1, hockey.WIDTH + 1) || !inRange(y, -1, hockey.LENGTH + 1)) return undefined
  if (!inRange(vx, -speed, speed) || !inRange(vy, -speed, speed)) return undefined
  return { x, y, vx, vy }
}

/** Miau-Miau as the host shows it to this phone: cards of one deck, counts for every seat. */
function parseCards(value: unknown, seats: number): MiauView | undefined {
  if (!isObject(value)) return undefined
  const hand = list(value.hand, DECK, (card) => (isCard(card) ? card : undefined))
  if (!hand || new Set(hand).size !== hand.length) return undefined
  const counts = list(value.counts, seats, (n) => (isWhole(n, 0, DECK) ? n : undefined))
  if (!counts || counts.length !== seats) return undefined
  const { top, stock, pile, turn, wish, penalty, drawn, winner } = value
  if (!isCard(top) || !isWhole(stock, 0, DECK) || !isWhole(pile, 1, DECK)) return undefined
  if (!isWhole(turn, 0, seats - 1) || !isWhole(penalty, 0, DECK)) return undefined
  if (wish !== null && !isSuit(wish)) return undefined
  if (drawn !== null && !(isCard(drawn) && hand.includes(drawn))) return undefined
  if (winner !== null && !isWhole(winner, 0, seats - 1)) return undefined
  if (typeof value.stuck !== 'boolean') return undefined
  return { hand, counts, top, stock, pile, turn, wish, penalty, drawn, winner, stuck: value.stuck }
}

/**
 * A game's position: its board, of the game's size and with pieces of the `seats` players at
 * it, and whose turn it is.
 */
function parsePosition(value: unknown, rules: BoardGame, seats: number): Position | undefined {
  if (!isObject(value)) return undefined
  const board = list(value.board, rules.cells, (cell) =>
    isPiece(cell, rules, seats) ? cell : undefined,
  )
  if (!board || board.length !== rules.cells) return undefined
  if (!isWhole(value.turn, 0, seats - 1)) return undefined
  const hand = list(value.hand, seats, (n) => (isWhole(n, 0, MAX_HAND) ? n : undefined))
  if (!hand || (hand.length !== 0 && hand.length !== seats)) return undefined
  const phase = PHASES.find((p) => p === value.phase)
  if (!phase || !isWhole(value.quiet, 0, MAX_MOVES)) return undefined
  return { board, turn: value.turn, hand, phase, quiet: value.quiet }
}

function isPiece(cell: unknown, rules: BoardGame, seats: number): cell is number {
  return cell === EMPTY || (isWhole(cell, 0, KIND * rules.kinds - 1) && cell % KIND < seats)
}

function parsePlayer(value: unknown): Player | undefined {
  if (!isObject(value) || !isId(value.id)) return undefined
  return { id: value.id, name: cleanName(value.name, '?'), away: value.away === true }
}

function parseOutcome(value: unknown, board: Board, seats: number): Outcome | null | undefined {
  if (value === null) return null
  if (value === 'draw') return 'draw'
  if (!isObject(value) || !isWhole(value.winner, 0, seats - 1)) return undefined
  // The cells that won: a line of a few, or the pieces in a triangle of Sternhalma.
  const line = list(value.line, Math.max(4, board.length), (cell) =>
    isWhole(cell, 0, board.length - 1) ? cell : undefined,
  )
  return line ? { winner: value.winner, line } : undefined
}

function isWhole(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && inRange(value, min, max)
}
