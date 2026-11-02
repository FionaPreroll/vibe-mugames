import { type GameId, isBoardGame, isLegal, type Move, type Outcome, type Position } from './board'
import { GAMES, seatRange } from './games'
import * as miau from './miaumiau'

/**
 * The table everyone sits at: who is there, which game is on, the board, whose turn it is, and
 * the scores. The host keeps it; players see it as the host sends it. Pure TypeScript, so the
 * rules can be tested without phones.
 *
 * With more players than a game has seats, the others watch, in a queue: after a game, the
 * winner stays and the others who played go to the back, after a draw all of them do. When
 * nobody waits, the next player in turn starts the next game.
 *
 * In Miau-Miau, the host alone knows every hand: `state(id)` shows each player only their own.
 */

export interface Player {
  readonly id: number
  readonly name: string
  /** Dropped out, and may rejoin in their place. */
  readonly away: boolean
}

export interface TableState {
  readonly players: readonly Player[]
  /** The game on the table, or null in the lobby. */
  readonly game: GameId | null
  /** The ids of the players at the board, in seat order: seat 0 starts. */
  readonly seats: readonly number[]
  /** Where a board game stands, with whose turn it is; null in the lobby and in Miau-Miau. */
  readonly position: Position | null
  /** Miau-Miau as the player this state is for sees it; null in every other game. */
  readonly cards: miau.MiauView | null
  /** Moves made so far: a move names the number it is meant to be, so none counts twice. */
  readonly moveNo: number
  /** The move made last, for every phone to show; null before the first. */
  readonly last: Move | null
  readonly outcome: Outcome | null
  /** Games won, by player id. */
  readonly scores: Readonly<Record<number, number>>
}

export class Table {
  /** `random` shuffles the cards: numbers from 0 up to, not including, 1. */
  constructor(private readonly random: () => number = Math.random) {}

  private players: Player[] = []
  /** Player ids in the order they get a seat: those seated first. */
  private queue: number[] = []
  private game: GameId | null = null
  private seats: number[] = []
  private position: Position | null = null
  private cards: miau.MiauState | null = null
  private moveNo = 0
  private last: Move | null = null
  private outcome: Outcome | null = null
  private readonly scores = new Map<number, number>()

  /** A player sits down, or comes back to their place. */
  join(id: number, name: string): void {
    const known = this.players.find((p) => p.id === id)
    if (known) this.players = this.players.map((p) => (p.id === id ? { id, name, away: false } : p))
    else {
      this.players.push({ id, name, away: false })
      this.queue.push(id)
    }
  }

  /** A player dropped out: their place, seat and score wait for them. */
  leave(id: number): void {
    this.players = this.players.map((p) => (p.id === id ? { ...p, away: true } : p))
  }

  /** Starts a game with the first players in the queue who are here; false if too few are. */
  choose(game: GameId): boolean {
    const here = this.queue.filter((id) => this.players.some((p) => p.id === id && !p.away))
    const { min, max } = seatRange(game)
    const seats = here.slice(0, max)
    if (seats.length < min) return false
    this.game = game
    this.seats = seats
    this.begin()
    return true
  }

  /**
   * A move by a player: taken only from the player whose turn it is, in the game on the table,
   * as the move it is meant to be, and if the rules allow it. Returns whether it was taken.
   */
  move(id: number, game: GameId, moveNo: number, move: Move): boolean {
    if (this.game !== game || this.outcome !== null || moveNo !== this.moveNo) return false
    const seat = this.seats.indexOf(id)
    if (seat < 0 || seat !== this.turn()) return false
    if (isBoardGame(game)) {
      const rules = GAMES[game]
      const position = this.position
      if (position === null || !isLegal(rules, position, move)) return false
      this.position = rules.play(position, move)
      this.outcome = rules.outcome(this.position)
    } else {
      const cards = this.cards
      const decoded = miau.decode(move)
      if (cards === null || !decoded || !miau.legal(cards, seat, decoded)) return false
      this.cards = miau.play(cards, seat, decoded, this.random)
      const end = miau.outcome(this.cards)
      this.outcome = end === null || end === 'draw' ? end : { winner: end, line: [] }
    }
    this.moveNo++
    this.last = [...move]
    if (this.outcome !== null && this.outcome !== 'draw') {
      const winner = this.seats[this.outcome.winner]
      if (winner !== undefined) this.scores.set(winner, (this.scores.get(winner) ?? 0) + 1)
    }
    return true
  }

  /** The same game again, once one is over, with the next players from the queue. */
  rematch(): boolean {
    if (this.game === null || this.outcome === null) return false
    const outcome = this.outcome
    const played = this.seats
    const others = this.queue.filter((id) => !played.includes(id))
    const waiting = others.filter((id) => this.players.some((p) => p.id === id && !p.away))
    if (waiting.length === 0) {
      // Nobody waits: the next player in turn starts.
      this.queue = [...played.slice(1), ...played.slice(0, 1), ...others]
    } else if (outcome === 'draw') {
      this.queue = [...others, ...played]
    } else {
      const winner = played[outcome.winner]
      const losers = played.filter((id) => id !== winner)
      this.queue = [...(winner === undefined ? [] : [winner]), ...others, ...losers]
    }
    return this.choose(this.game)
  }

  /** Back to the lobby, to choose another game. */
  lobby(): void {
    this.game = null
    this.seats = []
    this.position = null
    this.cards = null
    this.last = null
    this.outcome = null
  }

  /** The table as player `viewer` may see it: their own hand in Miau-Miau, nobody else's. */
  state(viewer = -1): TableState {
    return {
      players: this.players,
      game: this.game,
      seats: this.seats,
      position: this.position,
      cards: this.cards && miau.view(this.cards, this.seats.indexOf(viewer)),
      moveNo: this.moveNo,
      last: this.last,
      outcome: this.outcome,
      scores: Object.fromEntries(this.scores),
    }
  }

  /** The seat whose turn it is. */
  private turn(): number {
    return this.position?.turn ?? this.cards?.turn ?? -1
  }

  private begin(): void {
    if (this.game === null) return
    if (isBoardGame(this.game)) {
      this.position = GAMES[this.game].start()
      this.cards = null
    } else {
      this.position = null
      this.cards = miau.deal(this.seats.length, this.random)
    }
    this.moveNo = 0
    this.last = null
    this.outcome = null
  }
}
