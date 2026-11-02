import { type GameId, isLegal, type Move, type Outcome, type Position } from './board'
import { GAMES } from './games'

/**
 * The table everyone sits at: who is there, which game is on, the board, whose turn it is, and
 * the scores. The host keeps it; players see it as the host sends it. Pure TypeScript, so the
 * rules can be tested without phones.
 *
 * With more players than a game has seats, the others watch, in a queue: after a game, the
 * winner stays and the loser goes to the back, after a draw both do. Two players take turns in
 * starting.
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
  /** Where the game stands, with whose turn it is; null in the lobby. */
  readonly position: Position | null
  /** Moves made so far: a move names the number it is meant to be, so none counts twice. */
  readonly moveNo: number
  /** The move made last, for every phone to show; null before the first. */
  readonly last: Move | null
  readonly outcome: Outcome | null
  /** Games won, by player id. */
  readonly scores: Readonly<Record<number, number>>
}

export class Table {
  private players: Player[] = []
  /** Player ids in the order they get a seat: those seated first. */
  private queue: number[] = []
  private game: GameId | null = null
  private seats: number[] = []
  private position: Position | null = null
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
    const seats = here.slice(0, GAMES[game].seats)
    if (seats.length < GAMES[game].seats) return false
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
    const position = this.position
    if (this.game !== game || position === null) return false
    if (this.outcome !== null || moveNo !== this.moveNo) return false
    if (this.seats[position.turn] !== id) return false
    const rules = GAMES[game]
    if (!isLegal(rules, position, move)) return false
    this.position = rules.play(position, move)
    this.moveNo++
    this.last = [...move]
    this.outcome = rules.outcome(this.position)
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
    const [first, second] = this.seats
    if (first === undefined || second === undefined) return false
    const others = this.queue.filter((id) => !this.seats.includes(id))
    const waiting = others.filter((id) => this.players.some((p) => p.id === id && !p.away))
    if (waiting.length === 0) {
      // Just the two of them: the other one starts.
      this.queue = [second, first, ...others]
    } else if (outcome === 'draw') {
      this.queue = [...others, first, second]
    } else {
      const winner = this.seats[outcome.winner] ?? first
      const loser = winner === first ? second : first
      this.queue = [winner, ...others, loser]
    }
    return this.choose(this.game)
  }

  /** Back to the lobby, to choose another game. */
  lobby(): void {
    this.game = null
    this.seats = []
    this.position = null
    this.last = null
    this.outcome = null
  }

  state(): TableState {
    return {
      players: this.players,
      game: this.game,
      seats: this.seats,
      position: this.position,
      moveNo: this.moveNo,
      last: this.last,
      outcome: this.outcome,
      scores: Object.fromEntries(this.scores),
    }
  }

  private begin(): void {
    if (this.game === null) return
    this.position = GAMES[this.game].start()
    this.moveNo = 0
    this.last = null
    this.outcome = null
  }
}
