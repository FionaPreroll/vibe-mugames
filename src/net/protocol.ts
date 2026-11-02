import { cleanName, inRange, isId, isObject, list, type Parse } from '@fionapreroll/p2p'
import { type Board, EMPTY, type GameId, isGameId, type Outcome } from '../core/board'
import { GAMES } from '../core/games'
import type { Player, TableState } from '../core/table'

/**
 * What phones of the Spielekiste say to each other, on top of `@fionapreroll/p2p`'s room: the
 * host sends the table as the state, many times a second; players send their moves as events,
 * which arrive once each. Raise PROTOCOL whenever any of it changes, so phones of different
 * versions refuse to play together instead of misreading each other.
 */
export const PROTOCOL = 1

/** Players send no continuous input: board games need none. */
export type Input = null

/** A move, meant as move number `moveNo` of the game on the table. */
export type Event = {
  readonly type: 'move'
  readonly game: GameId
  readonly moveNo: number
  readonly move: number
}

const MAX_PLAYERS = 8
const MAX_MOVES = 1000
const MAX_CELLS = Math.max(...Object.values(GAMES).map((g) => g.columns * g.rows))

export const parseInput: Parse<Input> = (value) => (value === null ? null : undefined)

export const parseEvent: Parse<Event> = (value) => {
  if (!isObject(value) || value.type !== 'move' || !isGameId(value.game)) return undefined
  if (!isWhole(value.moveNo, 0, MAX_MOVES) || !isWhole(value.move, 0, MAX_CELLS - 1))
    return undefined
  return { type: 'move', game: value.game, moveNo: value.moveNo, move: value.move }
}

/** The host's table, checked field by field: a phone draws nothing it cannot make sense of. */
export const parseState: Parse<TableState> = (value) => {
  if (!isObject(value)) return undefined
  const players = list(value.players, MAX_PLAYERS, parsePlayer)
  if (!players) return undefined
  const game = value.game === null ? null : isGameId(value.game) ? value.game : undefined
  if (game === undefined) return undefined
  const rules = game ? GAMES[game] : null
  const seats = list(value.seats, rules?.seats ?? 0, (id) => (isId(id) ? id : undefined))
  if (!seats || (rules && seats.length !== rules.seats)) return undefined
  const cells = rules ? rules.columns * rules.rows : 0
  const board = list(value.board, cells, (cell) =>
    isWhole(cell, EMPTY, seats.length - 1) ? cell : undefined,
  )
  if (!board || board.length !== cells) return undefined
  const turn = rules ? value.turn : 0
  if (!isWhole(turn, 0, Math.max(0, seats.length - 1))) return undefined
  if (!isWhole(value.moveNo, 0, MAX_MOVES)) return undefined
  const outcome = parseOutcome(value.outcome, board, seats.length)
  if (outcome === undefined) return undefined
  if (!isObject(value.scores)) return undefined
  const scores: Record<number, number> = {}
  for (const [id, score] of Object.entries(value.scores).slice(0, MAX_PLAYERS * 4)) {
    if (isId(Number(id)) && isWhole(score, 0, 1_000_000)) scores[Number(id)] = score
  }
  return { players, game, seats, board, turn, moveNo: value.moveNo, outcome, scores }
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
