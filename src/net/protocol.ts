import { cleanName, inRange, isId, isObject, list, type Parse } from '@fionapreroll/p2p'
import {
  type Board,
  type BoardGame,
  EMPTY,
  type GameId,
  isBoardGame,
  isGameId,
  KIND,
  type Move,
  type Outcome,
  PHASES,
  type Position,
} from '../core/board'
import { GAMES, seatRange } from '../core/games'
import { DECK, decode, encode, isCard, isSuit, type MiauView } from '../core/miaumiau'
import type { Player, TableState } from '../core/table'

/**
 * What phones of the Spielekiste say to each other, on top of `@fionapreroll/p2p`'s room: the
 * host sends the table as the state, many times a second; players send their moves as events,
 * which arrive once each. Raise PROTOCOL whenever any of it changes, so phones of different
 * versions refuse to play together instead of misreading each other.
 */
export const PROTOCOL = 3

/** Players send no continuous input: board games need none. */
export type Input = null

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

export const parseInput: Parse<Input> = (value) => (value === null ? null : undefined)

export const parseEvent: Parse<Event> = (value) => {
  if (!isObject(value) || value.type !== 'move' || !isGameId(value.game)) return undefined
  if (!isWhole(value.moveNo, 0, MAX_MOVES)) return undefined
  const move = parseMove(value.move, value.game)
  if (!move) return undefined
  return { type: 'move', game: value.game, moveNo: value.moveNo, move }
}

/**
 * A board game's move, a path of one or more cells of its board, no longer than its longest
 * move; or a move of Miau-Miau, in numbers as `encode` makes them.
 */
function parseMove(value: unknown, game: GameId): Move | undefined {
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
    ? parsePosition(value.position, rules)
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
  return { players, game, seats, position, cards, moveNo: value.moveNo, last, outcome, scores }
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

/** A game's position: its board, of the game's size and pieces, and whose turn it is. */
function parsePosition(value: unknown, rules: BoardGame): Position | undefined {
  if (!isObject(value)) return undefined
  const board = list(value.board, rules.cells, (cell) => (isPiece(cell, rules) ? cell : undefined))
  if (!board || board.length !== rules.cells) return undefined
  if (!isWhole(value.turn, 0, rules.seats - 1)) return undefined
  const hand = list(value.hand, rules.seats, (n) => (isWhole(n, 0, MAX_HAND) ? n : undefined))
  if (!hand || (hand.length !== 0 && hand.length !== rules.seats)) return undefined
  const phase = PHASES.find((p) => p === value.phase)
  if (!phase || !isWhole(value.quiet, 0, MAX_MOVES)) return undefined
  return { board, turn: value.turn, hand, phase, quiet: value.quiet }
}

function isPiece(cell: unknown, rules: BoardGame): cell is number {
  return cell === EMPTY || (isWhole(cell, 0, KIND * rules.kinds - 1) && cell % KIND < rules.seats)
}

function parsePlayer(value: unknown): Player | undefined {
  if (!isObject(value) || !isId(value.id)) return undefined
  return { id: value.id, name: cleanName(value.name, '?'), away: value.away === true }
}

function parseOutcome(value: unknown, board: Board, seats: number): Outcome | null | undefined {
  if (value === null) return null
  if (value === 'draw') return 'draw'
  if (!isObject(value) || !isWhole(value.winner, 0, seats - 1)) return undefined
  const line = list(value.line, 4, (cell) =>
    isWhole(cell, 0, board.length - 1) ? cell : undefined,
  )
  return line ? { winner: value.winner, line } : undefined
}

function isWhole(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && inRange(value, min, max)
}
