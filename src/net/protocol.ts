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
import * as ludo from '../core/ludo'
import * as maex from '../core/maexchen'
import { DECK, decode, encode, isCard, isSuit, type MiauView } from '../core/miaumiau'
import * as sea from '../core/seeschlacht'
import * as words from '../core/stadtlandfluss'
import type { Player, TableState } from '../core/table'
import { cleanText } from '../core/text'
import * as wolf from '../core/werwolf'

/**
 * What phones of the Spielekiste say to each other, on top of `@fionapreroll/p2p`'s room: the
 * host sends the table as the state, many times a second; players send their moves as events,
 * which arrive once each, and in games in real time what they want now as their input, many
 * times a second. Raise PROTOCOL whenever any of it changes, so phones of different versions
 * refuse to play together instead of misreading each other.
 */
export const PROTOCOL = 10

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
 * move; a move of Ludo, Miau-Miau, Sea Battle or Mäxchen, in numbers as their `encode` makes
 * them; or the seat a player of Werwolf chooses.
 */
function parseMove(value: unknown, game: GameId): Move | undefined {
  // Games in real time have no moves, only input.
  if (isLiveGame(game)) return undefined
  if (game === 'ludo') {
    const numbers = list(value, 1, (n) => (isWhole(n, 0, ludo.ROLL) ? n : undefined))
    const move = numbers && ludo.decode(numbers)
    return move ? ludo.encode(move) : undefined
  }
  if (game === 'maexchen') {
    const numbers = list(value, 1, (n) => (isWhole(n, 0, 66) ? n : undefined))
    const move = numbers && maex.decode(numbers)
    return move ? maex.encode(move) : undefined
  }
  if (game === 'werwolf') {
    const seat = list(value, 1, (n) => (isWhole(n, 0, wolf.MAX_VILLAGE - 1) ? n : undefined))
    return seat?.length === 1 ? seat : undefined
  }
  if (game === 'stadtlandfluss') {
    // An answer is its category and its characters, after the kind of move.
    const numbers = list(value, words.MAX_ANSWER + 2, (n) =>
      isWhole(n, 0, 0x10ffff) ? n : undefined,
    )
    const move = numbers && words.decode(numbers)
    return move ? words.encode(move) : undefined
  }
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
  const ludoState =
    game === 'ludo' ? parseLudo(value.ludo, seats.length) : value.ludo === null ? null : undefined
  if (ludoState === undefined) return undefined
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
  const dice =
    game === 'maexchen'
      ? parseDice(value.dice, seats.length)
      : value.dice === null
        ? null
        : undefined
  if (dice === undefined) return undefined
  const village =
    game === 'werwolf'
      ? parseVillage(value.village, seats.length)
      : value.village === null
        ? null
        : undefined
  if (village === undefined) return undefined
  const wordsView =
    game === 'stadtlandfluss'
      ? parseWords(value.words, seats.length)
      : value.words === null
        ? null
        : undefined
  if (wordsView === undefined) return undefined
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
  // Werwolf never shows a last move: it would give away whom a player chose; nor do the party
  // games of words, which would show what a player wrote.
  const last =
    value.last === null || !game
      ? null
      : game === 'werwolf' || game === 'stadtlandfluss'
        ? undefined
        : parseMove(value.last, game)
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
    ludo: ludoState,
    cards,
    sea: seaView,
    dice,
    village,
    words: wordsView,
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
 * Ludo: four pieces for every seat, each on a step of its way, none sharing a square with
 * another; the die, and the piece moved last.
 */
function parseLudo(value: unknown, seats: number): ludo.LudoState | undefined {
  if (!isObject(value)) return undefined
  const pieces = list(value.pieces, seats, (own) => {
    const steps = list(own, ludo.PIECES, (n) => (ludo.isStep(n) ? n : undefined))
    return steps?.length === ludo.PIECES ? steps : undefined
  })
  if (!pieces || pieces.length !== seats) return undefined
  const { turn, phase, die, rolledBy, tries, stuck, winner } = value
  const seat = (n: unknown) => isWhole(n, 0, seats - 1)
  if (!seat(turn) || (phase !== 'roll' && phase !== 'move')) return undefined
  if (!isWhole(die, 0, ludo.SIX) || !isWhole(rolledBy, -1, seats - 1)) return undefined
  if (!isWhole(tries, 0, ludo.TRIES) || typeof stuck !== 'boolean') return undefined
  if (winner !== null && !seat(winner)) return undefined
  const moved = value.moved === null ? null : parseMoved(value.moved, seats)
  if (moved === undefined) return undefined
  const state = { pieces, turn, phase, die, rolledBy, tries, stuck, moved, winner } as const
  return ludo.isPossible(state) ? state : undefined
}

function parseMoved(value: unknown, seats: number): ludo.LudoMoved | undefined {
  if (!isObject(value)) return undefined
  const { seat, piece, from, to, hit } = value
  if (!isWhole(seat, 0, seats - 1) || !ludo.isPiece(piece)) return undefined
  if (!ludo.isStep(from) || !ludo.isStep(to)) return undefined
  if (hit !== null && !isWhole(hit, 0, seats - 1)) return undefined
  return { seat, piece, from, to, hit }
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

/** Mäxchen: lives for every seat, whose turn it is, what was said, and dice only if this seat's. */
function parseDice(value: unknown, seats: number): maex.MaexView | undefined {
  if (!isObject(value)) return undefined
  const seat = (n: unknown) => isWhole(n, 0, seats - 1)
  const lives = list(value.lives, seats, (n) => (isWhole(n, 0, maex.LIVES) ? n : undefined))
  if (!lives || lives.length !== seats) return undefined
  const { turn, phase, claim, claimer, winner } = value
  if (!seat(turn) || (phase !== 'roll' && phase !== 'claim')) return undefined
  if (typeof value.mine !== 'boolean') return undefined
  const dice = value.dice === null ? null : parsePair(value.dice)
  if (dice === undefined) return undefined
  if (claim !== null && !maex.isThrow(claim)) return undefined
  if ((claim === null) !== (claimer === null) || (claimer !== null && !seat(claimer))) {
    return undefined
  }
  if (winner !== null && !seat(winner)) return undefined
  const reveal = value.reveal === null ? null : parseReveal(value.reveal, seats)
  if (reveal === undefined) return undefined
  return {
    lives,
    turn: turn as number,
    phase,
    dice,
    mine: value.mine,
    claim: claim as number | null,
    claimer: claimer as number | null,
    reveal,
    winner: winner as number | null,
  }
}

function parsePair(value: unknown): maex.Dice | undefined {
  const dice = list(value, 2, (n) => (maex.isDie(n) ? n : undefined))
  const [a, b] = dice ?? []
  return a === undefined || b === undefined ? undefined : [a, b]
}

function parseReveal(value: unknown, seats: number): maex.Reveal | undefined {
  if (!isObject(value)) return undefined
  const { claimer, doubter, claim, loser, lost } = value
  if (![claimer, doubter, loser].every((n) => isWhole(n, 0, seats - 1))) return undefined
  if (!maex.isThrow(claim) || !isWhole(lost, 1, 2)) return undefined
  const dice = value.dice === null ? null : parsePair(value.dice)
  if (dice === undefined) return undefined
  return {
    claimer: claimer as number,
    doubter: doubter as number,
    claim,
    dice,
    loser: loser as number,
    lost,
  }
}

/** Werwolf: the roles this seat knows, who is in, who has chosen, and the story so far. */
function parseVillage(value: unknown, seats: number): wolf.WolfView | undefined {
  if (!isObject(value)) return undefined
  const isSeat = (n: unknown): n is number => isWhole(n, 0, seats - 1)
  const roles = list(value.roles, seats, (role) =>
    role === null ? null : wolf.ROLES.find((r) => r === role),
  )
  const flags = (v: unknown) => list(v, seats, (b) => (typeof b === 'boolean' ? b : undefined))
  const alive = flags(value.alive)
  const done = flags(value.done)
  const choices = list(value.choices, seats, (n) => (n === null ? null : isSeat(n) ? n : undefined))
  if (roles?.length !== seats || alive?.length !== seats || done?.length !== seats) return undefined
  if (choices?.length !== seats) return undefined
  const { phase, night, healed, winner } = value
  if ((phase !== 'night' && phase !== 'day') || !isWhole(night, 1, MAX_MOVES)) return undefined
  if (healed !== null && !isSeat(healed)) return undefined
  if (winner !== null && winner !== 'wolves' && winner !== 'village') return undefined
  const findings = list(value.findings, MAX_MOVES, (f) =>
    isObject(f) && isSeat(f.seat) && typeof f.wolf === 'boolean'
      ? { seat: f.seat, wolf: f.wolf }
      : undefined,
  )
  const story = list(value.story, 2 * MAX_STORY, (event) => parseStory(event, seats))
  if (!findings || !story) return undefined
  return { roles, alive, phase, night, done, choices, healed, findings, story, winner }
}

/** A text of at most `max` characters, as the rules keep it; undefined if it is not one. */
function parseText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string' || value.length > 4 * max) return undefined
  const text = cleanText(value, max)
  return text === value ? text : undefined
}

/**
 * Stadt, Land, Fluss: the round's letters, each seat's answers if this seat may see them, who
 * objects to which, who is ready, and the points so far.
 */
function parseWords(value: unknown, seats: number): words.WordsView | undefined {
  if (!isObject(value) || typeof value.together !== 'boolean') return undefined
  const isSeat = (n: unknown): n is number => isWhole(n, 0, seats - 1)
  const letters = list(value.letters, words.ROUNDS, (l) =>
    typeof l === 'string' && l.length === 1 && words.LETTERS.includes(l) ? l : undefined,
  )
  if (!letters || letters.length === 0 || new Set(letters).size !== letters.length) {
    return undefined
  }
  const count = words.CATEGORIES.length
  const answers = list(value.answers, seats, (own) => {
    if (own === null) return null
    const texts = list(own, count, (text) => parseText(text, words.MAX_ANSWER))
    return texts?.length === count ? texts : undefined
  })
  const flags = (v: unknown) => list(v, seats, (b) => (typeof b === 'boolean' ? b : undefined))
  const done = flags(value.done)
  const ready = flags(value.ready)
  const filled = list(value.filled, seats, (n) => (isWhole(n, 0, count) ? n : undefined))
  const totals = list(value.totals, seats, (n) => (isWhole(n, 0, 1_000_000) ? n : undefined))
  const objections = list(value.objections, seats, (own) => {
    const all = list(own, count, (against) => {
      const by = list(against, seats, (n) => (isSeat(n) ? n : undefined))
      return by && new Set(by).size === by.length ? by : undefined
    })
    return all?.length === count ? all : undefined
  })
  if (answers?.length !== seats || done?.length !== seats || ready?.length !== seats) {
    return undefined
  }
  if (filled?.length !== seats || totals?.length !== seats || objections?.length !== seats) {
    return undefined
  }
  const { phase, stopper, left, winner } = value
  if (phase !== 'write' && phase !== 'check') return undefined
  if (stopper !== null && !isSeat(stopper)) return undefined
  if (!isWhole(left, 0, words.WRITE_SECONDS)) return undefined
  if (winner !== null && winner !== 'draw' && !isSeat(winner)) return undefined
  return {
    together: value.together,
    letters,
    phase,
    answers,
    filled,
    done,
    stopper,
    left,
    objections,
    ready,
    totals,
    winner,
  }
}

/** The most nights a game of Werwolf lasts: one of eight players is out at least every other. */
const MAX_STORY = 2 * wolf.MAX_VILLAGE

function parseStory(value: unknown, seats: number): wolf.Story | undefined {
  if (!isObject(value) || !isWhole(value.night, 1, MAX_MOVES)) return undefined
  const seatOrNull = (n: unknown) => n === null || isWhole(n, 0, seats - 1)
  if (value.kind === 'night') {
    if (!seatOrNull(value.victim)) return undefined
    return { kind: 'night', night: value.night, victim: value.victim as number | null }
  }
  if (value.kind !== 'vote' || !seatOrNull(value.out)) return undefined
  const votes = list(value.votes, seats, (n) =>
    n === null ? null : isWhole(n, 0, seats - 1) ? n : undefined,
  )
  if (votes?.length !== seats) return undefined
  return { kind: 'vote', night: value.night, votes, out: value.out as number | null }
}

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
  // Up to a day of play: any game ends long before.
  if (!inRange(value.clock, 0, 86_400)) return undefined
  return {
    puck,
    mallets: [m0, m1],
    goals: [g0, g1],
    pause: value.pause,
    scored,
    clock: value.clock,
  }
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
