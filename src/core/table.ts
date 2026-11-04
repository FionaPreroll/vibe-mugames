import * as hockey from './airhockey'
import {
  type GameId,
  isBoardGame,
  isLegal,
  isLiveGame,
  type Move,
  type Outcome,
  type Position,
} from './board'
import { GAMES, seatRange } from './games'
import * as licht from './lichtrenner'
import * as ludo from './ludo'
import * as maex from './maexchen'
import * as miau from './miaumiau'
import * as swim from './schwimmen'
import * as sea from './seeschlacht'
import * as words from './stadtlandfluss'
import * as wolf from './werwolf'

/**
 * The table everyone sits at: who is there, which game is on, the board, whose turn it is, and
 * the scores. The host keeps it; players see it as the host sends it. Pure TypeScript, so the
 * rules can be tested without phones.
 *
 * With more players than a game has seats, the others watch, in a queue: after a game, the
 * winner stays and the others who played go to the back, after a draw all of them do. When
 * nobody waits, the next player in turn starts the next game.
 *
 * Ludo's die is rolled by the host too, with the same randomness as the cards: a player only
 * asks for a roll.
 *
 * In Miau-Miau and Schwimmen, the host alone knows every hand, in Sea Battle every fleet, in Mäxchen the dice
 * under the cup and in Werwolf every role: `state(id)` shows each player only their own.
 *
 * Games in real time (Lichtrenner, air hockey) have no moves in turn: each player at the board
 * says what they want many times a second (`input`), such as where to head, and the host runs
 * the game on by the time that has passed (`tick`). Time runs out in some party games too, such
 * as the writing in Stadt, Land, Fluss.
 *
 * A table on one device (`together`) plays the party games that way: in Stadt, Land, Fluss,
 * players write one after the other.
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
  /** Where a board game stands, with whose turn it is; null in the lobby and in other games. */
  readonly position: Position | null
  /** Ludo, which hides nothing; null in every other game. */
  readonly ludo: ludo.LudoState | null
  /** Miau-Miau as the player this state is for sees it; null in every other game. */
  readonly cards: miau.MiauView | null
  /** Schwimmen as the player this state is for sees it; null in every other game. */
  readonly swim: swim.SwimView | null
  /** Sea Battle as the player this state is for sees it; null in every other game. */
  readonly sea: sea.SeaView | null
  /** Mäxchen as the player this state is for sees it; null in every other game. */
  readonly dice: maex.MaexView | null
  /** Werwolf as the player this state is for sees it; null in every other game. */
  readonly village: wolf.WolfView | null
  /** Stadt, Land, Fluss as the player this state is for sees it; null in every other game. */
  readonly words: words.WordsView | null
  /** Lichtrenner as it stands; null in every other game. */
  readonly race: licht.LichtView | null
  /** Air hockey as it stands; null in every other game. */
  readonly rink: hockey.HockeyView | null
  /**
   * Games started at this table so far. A player's input names the game it is meant for, so
   * what they wanted in the last one does not steer the next.
   */
  readonly round: number
  /** Moves made so far: a move names the number it is meant to be, so none counts twice. */
  readonly moveNo: number
  /** The move made last, for every phone to show; null before the first. */
  readonly last: Move | null
  readonly outcome: Outcome | null
  /** Games won, by player id. */
  readonly scores: Readonly<Record<number, number>>
}

/**
 * The id of the player whose turn it is, or null in the lobby and once the game is over. While
 * the fleets of Sea Battle are placed, all at once, it is the first player who has not; in
 * Werwolf, where everyone chooses at once, the first who has not chosen yet.
 */
export function playerToMove(state: TableState): number | null {
  if (state.game === null || state.outcome !== null) return null
  const turn =
    state.position?.turn ??
    state.ludo?.turn ??
    state.cards?.turn ??
    state.swim?.turn ??
    state.dice?.turn ??
    (state.village && (wolf.waiting(state.village)[0] ?? null)) ??
    (state.words && (words.waitingFor(state.words)[0] ?? null)) ??
    (state.sea && (sea.nextToPlace(state.sea) ?? state.sea.turn))
  return turn === undefined || turn === null ? null : (state.seats[turn] ?? null)
}

export interface TableOptions {
  /** Everyone plays on one device: the party games are played the way they are there. */
  readonly together?: boolean
}

export class Table {
  /**
   * `random` shuffles the cards and rolls the die: numbers from 0 up to, not including, 1.
   */
  constructor(
    private readonly random: () => number = Math.random,
    private readonly options: TableOptions = {},
  ) {}

  private players: Player[] = []
  /** Player ids in the order they get a seat: those seated first. */
  private queue: number[] = []
  private game: GameId | null = null
  private seats: number[] = []
  private position: Position | null = null
  private ludo: ludo.LudoState | null = null
  private cards: miau.MiauState | null = null
  private swim: swim.SwimState | null = null
  private sea: sea.SeaState | null = null
  private dice: maex.MaexState | null = null
  private village: wolf.WolfState | null = null
  private words: words.WordsState | null = null
  /**
   * The move number Werwolf's night or day, or a round's writing or checking in Stadt, Land,
   * Fluss, began with: older moves were meant for another.
   */
  private phaseFrom = 0
  private race: licht.LichtState | null = null
  private rink: hockey.HockeyState | null = null
  /** What each seat wants now in a game in real time, by seat: see `input`. */
  private wants: (readonly number[] | null)[] = []
  private round = 0
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
    if (this.game !== game || this.outcome !== null) return false
    if (isLiveGame(game)) return false
    const seat = this.seats.indexOf(id)
    if (seat < 0) return false
    const taken =
      game === 'seeschlacht'
        ? this.seaMove(seat, moveNo, move)
        : game === 'werwolf'
          ? this.wolfMove(seat, moveNo, move)
          : game === 'stadtlandfluss'
            ? this.wordsMove(seat, moveNo, move)
            : moveNo === this.moveNo && seat === this.turn() && this.turnMove(game, seat, move)
    if (!taken) return false
    this.moveNo++
    // A fleet placed stays hidden, and so does whom a player of Werwolf chose, and what anyone
    // wrote: only shots, and the moves of other games, show as the last move.
    if (game === 'werwolf') {
      if (this.village?.choices.every((choice) => choice === null)) this.phaseFrom = this.moveNo
    } else if (game === 'stadtlandfluss') this.newPhase()
    else if (game !== 'seeschlacht' || move.length === 1) this.last = [...move]
    this.score()
    return true
  }

  /**
   * What a player at the board of a game in real time wants now: the round it is meant for,
   * then the game's numbers. In Lichtrenner, a heading (`licht.Want`); in air hockey, where
   * the mallet should go, as the player sees their half (`hockey.Target`). It holds until the
   * next input. Returns whether it was taken.
   */
  input(id: number, values: readonly number[]): boolean {
    if (this.game === null || !isLiveGame(this.game) || this.outcome !== null) return false
    const seat = this.seats.indexOf(id)
    const [round, ...wanted] = values
    if (seat < 0 || round !== this.round) return false
    const [a, b] = wanted
    const fits =
      this.game === 'lichtrenner'
        ? wanted.length === 1 && a !== undefined && licht.isWant(a)
        : wanted.length === 2 && a !== undefined && b !== undefined && hockey.isTarget(a, b)
    if (!fits) return false
    this.wants[seat] = wanted
    return true
  }

  /**
   * Runs a game in real time on by `seconds`, with what each player wants now, and the time of
   * a party game that has one. Returns whether the table changed: in a game in real time, with
   * every tick; in a party game, when a second more is gone, or the time is up.
   */
  tick(seconds: number): boolean {
    if (this.outcome !== null) return false
    if (this.words) {
      const before = this.words
      this.words = words.advance(before, seconds)
      this.newPhase()
      return (
        Math.ceil(before.left) !== Math.ceil(this.words.left) || before.phase !== this.words.phase
      )
    }
    if (this.race) {
      const wants = this.seats.map((_, seat) => this.wants[seat]?.[0] ?? null)
      this.race = licht.advance(this.race, wants, seconds)
      const end = licht.outcome(this.race)
      this.outcome = end === null || end === 'draw' ? end : { winner: end, line: [] }
    } else if (this.rink) {
      const targets = this.seats.map((_, seat) => {
        const [x, y] = this.wants[seat] ?? []
        return x === undefined || y === undefined ? null : { x, y }
      })
      this.rink = hockey.advance(this.rink, targets, seconds)
      const winner = hockey.outcome(this.rink)
      this.outcome = winner === null ? null : { winner, line: [] }
    } else return false
    this.score()
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
    this.ludo = null
    this.cards = null
    this.swim = null
    this.sea = null
    this.dice = null
    this.village = null
    this.words = null
    this.race = null
    this.rink = null
    this.last = null
    this.outcome = null
  }

  /**
   * The table as player `viewer` may see it: their own hand in Miau-Miau, their own fleet in
   * Sea Battle, their own dice in Mäxchen and their own role in Werwolf, nobody else's.
   */
  state(viewer = -1): TableState {
    return {
      players: this.players,
      game: this.game,
      seats: this.seats,
      position: this.position,
      ludo: this.ludo,
      cards: this.cards && miau.view(this.cards, this.seats.indexOf(viewer)),
      swim: this.swim && swim.view(this.swim, this.seats.indexOf(viewer)),
      sea: this.sea && sea.view(this.sea, this.seats.indexOf(viewer)),
      dice: this.dice && maex.view(this.dice, this.seats.indexOf(viewer)),
      village: this.village && wolf.view(this.village, this.seats.indexOf(viewer)),
      words: this.words && words.view(this.words, this.seats.indexOf(viewer)),
      race: this.race && licht.view(this.race),
      rink: this.rink && hockey.view(this.rink),
      round: this.round,
      moveNo: this.moveNo,
      last: this.last,
      outcome: this.outcome,
      scores: Object.fromEntries(this.scores),
    }
  }

  /** The seat whose turn it is. */
  private turn(): number {
    return (
      this.position?.turn ??
      this.ludo?.turn ??
      this.cards?.turn ??
      this.swim?.turn ??
      this.dice?.turn ??
      this.sea?.turn ??
      -1
    )
  }

  /** A move in a game of turns, by the seat whose turn it is: taken if the rules allow it. */
  private turnMove(game: GameId, seat: number, move: Move): boolean {
    if (isBoardGame(game)) {
      const rules = GAMES[game]
      const position = this.position
      if (position === null || !isLegal(rules, position, move)) return false
      this.position = rules.play(position, move)
      this.outcome = rules.outcome(this.position)
      return true
    }
    if (game === 'ludo') {
      const decoded = ludo.decode(move)
      if (this.ludo === null || !decoded || !ludo.legal(this.ludo, seat, decoded)) return false
      this.ludo = ludo.play(this.ludo, seat, decoded, this.random)
      const winner = ludo.outcome(this.ludo)
      this.outcome = winner === null ? null : { winner, line: [] }
      return true
    }
    if (game === 'maexchen') {
      const dice = this.dice
      const decoded = maex.decode(move)
      if (dice === null || !decoded || !maex.legal(dice, seat, decoded)) return false
      this.dice = maex.play(dice, seat, decoded, this.random)
      const winner = maex.outcome(this.dice)
      this.outcome = winner === null ? null : { winner, line: [] }
      return true
    }
    if (game === 'schwimmen') {
      const game = this.swim
      const decoded = swim.decode(move)
      if (game === null || !decoded || !swim.legal(game, seat, decoded)) return false
      this.swim = swim.play(game, seat, decoded, this.random)
      const winner = swim.outcome(this.swim)
      this.outcome = winner === null ? null : { winner, line: [] }
      return true
    }
    const cards = this.cards
    const decoded = miau.decode(move)
    if (cards === null || !decoded || !miau.legal(cards, seat, decoded)) return false
    this.cards = miau.play(cards, seat, decoded, this.random)
    const end = miau.outcome(this.cards)
    this.outcome = end === null || end === 'draw' ? end : { winner: end, line: [] }
    return true
  }

  /**
   * A move in Sea Battle. Both players place their fleets at the same time, so a fleet may come
   * with an older move number than the table's: each seat places once, so none counts twice.
   */
  private seaMove(seat: number, moveNo: number, move: Move): boolean {
    const game = this.sea
    const decoded = sea.decode(move)
    if (game === null || !decoded || !sea.legal(game, seat, decoded)) return false
    if (decoded.kind === 'shoot' && moveNo !== this.moveNo) return false
    this.sea = sea.play(game, seat, decoded)
    const winner = sea.outcome(this.sea)
    this.outcome = winner === null ? null : { winner, line: [] }
    return true
  }

  /**
   * A choice in Werwolf: everyone chooses at once, each once a night and once a day, so a
   * choice may come with an older move number than the table's, but none from before the
   * night or day began, which was meant for the one before.
   */
  private wolfMove(seat: number, moveNo: number, move: Move): boolean {
    const game = this.village
    const [target, ...rest] = move
    if (game === null || target === undefined || rest.length > 0) return false
    if (moveNo < this.phaseFrom || moveNo > this.moveNo) return false
    if (!wolf.legal(game, seat, target)) return false
    this.village = wolf.play(game, seat, target, this.random)
    // The game counts for the winning team: `outcome` names its first seat.
    const winners = wolf.winners(this.village)
    this.outcome = winners[0] === undefined ? null : { winner: winners[0], line: [] }
    return true
  }

  /**
   * A move in Stadt, Land, Fluss: everyone writes at once, so a move may come with an older
   * move number than the table's, but none from before this round's writing or checking began.
   */
  private wordsMove(seat: number, moveNo: number, move: Move): boolean {
    const game = this.words
    const decoded = words.decode(move)
    if (game === null || decoded === null) return false
    if (moveNo < this.phaseFrom || moveNo > this.moveNo) return false
    if (!words.legal(game, seat, decoded)) return false
    this.words = words.play(game, seat, decoded, this.random)
    const winner = this.words.winner
    this.outcome = winner === null ? null : winner === 'draw' ? 'draw' : { winner, line: [] }
    return true
  }

  /** What part of a party game this is: moves meant for another part are not taken. */
  private phaseKey(): string {
    return this.words ? `${this.words.letters.length}:${this.words.phase}` : ''
  }

  /** The part of the game it was when `phaseFrom` was set. */
  private phaseWas = ''

  /** Marks where a new part of a party game began, if one did. */
  private newPhase(): void {
    const key = this.phaseKey()
    if (key !== this.phaseWas) {
      this.phaseWas = key
      this.phaseFrom = this.moveNo
    }
  }

  /** A game that has just ended counts for its winner, and in Werwolf for their whole team. */
  private score(): void {
    if (this.outcome === null || this.outcome === 'draw') return
    const seats = this.village ? wolf.winners(this.village) : [this.outcome.winner]
    for (const seat of seats) {
      const winner = this.seats[seat]
      if (winner !== undefined) this.scores.set(winner, (this.scores.get(winner) ?? 0) + 1)
    }
  }

  private begin(): void {
    if (this.game === null) return
    const game = this.game
    this.position = isBoardGame(game) ? GAMES[game].start(this.seats.length) : null
    this.ludo = game === 'ludo' ? ludo.start(this.seats.length) : null
    this.cards = game === 'miaumiau' ? miau.deal(this.seats.length, this.random) : null
    this.swim = game === 'schwimmen' ? swim.start(this.seats.length, this.random) : null
    this.sea = game === 'seeschlacht' ? sea.start() : null
    this.dice = game === 'maexchen' ? maex.start(this.seats.length) : null
    this.village = game === 'werwolf' ? wolf.deal(this.seats.length, this.random) : null
    this.words =
      game === 'stadtlandfluss'
        ? words.start(this.seats.length, this.random, this.options.together)
        : null
    this.phaseFrom = 0
    this.phaseWas = this.phaseKey()
    this.race = game === 'lichtrenner' ? licht.start(this.seats.length) : null
    this.rink = game === 'airhockey' ? hockey.start() : null
    this.wants = []
    this.round++
    this.moveNo = 0
    this.last = null
    this.outcome = null
  }
}
