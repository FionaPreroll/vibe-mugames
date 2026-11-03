import { type Connection, type ConnectionDetails, opened } from '@fionapreroll/p2p'
import type { NetLog } from '@fionapreroll/p2p/debug'
import {
  type ConnectionTest,
  type ConnectionTestRun,
  GuestRoom,
  HOST_ID,
  HostRoom,
  type Pairing,
} from '@fionapreroll/p2p/room'
import type { GameId, Move } from '../core/board'
import { Table, type TableState } from '../core/table'
import { log } from '../log'
import { random } from '../random'
import { type NetSource, rememberNet } from './netlog'
import { type Event, type Input, PROTOCOL, parseEvent, parseInput, parseState } from './protocol'

/**
 * The host runs games in real time 30 times a second, and sends the table as often while one
 * is on. Board games need no more than every third tick: ten times a second.
 */
export const TICK_MS = 1000 / 30
const BOARD_TICKS = 3

/**
 * One phone's seat at the table, as the screens use it, for the host and for players alike:
 * the host decides on its own phone, players send their moves to the host.
 */
export interface Seat extends NetSource {
  /** This phone's player id. */
  readonly id: number
  readonly isHost: boolean
  /** The table as this phone knows it; null until a player has heard from the host. */
  state(): TableState | null
  /** Makes a move as move number `moveNo` of `game`; the host takes it if it is legal. */
  move(game: GameId, moveNo: number, move: Move): void
  /**
   * What this phone's player wants now in a game in real time (see `Table.input`): it holds
   * until the next, and goes to the host many times a second.
   */
  input(values: readonly number[]): void
  /** Called whenever the table may have changed: in a game in real time, every tick. */
  onChange: () => void
  /** Called once if the connection to the host is gone: `ended` if the host closed the table. */
  onLost: (ended: boolean) => void
  /** Leaves the table; the host closes it for everyone. */
  close(): void
}

/** What whoever keeps the table does between games: the host's phone, or a table on one device. */
export interface TableHost {
  /** Starts a game with the next players in the queue; false if too few are here. */
  choose(game: GameId): boolean
  /** The same game again, once one is over. */
  rematch(): void
  /** Back to the lobby, to choose another game. */
  lobby(): void
}

/** The host's phone: it keeps the table and lets players in. */
export class HostSeat implements Seat, TableHost {
  readonly id = HOST_ID
  readonly isHost = true
  readonly table = new Table(random)
  readonly room: HostRoom<Input, TableState, Event>
  onChange: () => void = () => {}
  onLost: (ended: boolean) => void = () => {}
  /** A player came in, or came back. */
  onJoin: (name: string, rejoined: boolean) => void = () => {}
  private ticks = 0

  constructor(readonly name: string) {
    this.room = new HostRoom<Input, TableState, Event>({
      name,
      version: PROTOCOL,
      parseInput,
      parseEvent,
      tickMs: TICK_MS,
      netNote: (line) => log('net', line),
    })
    rememberNet(this)
    log('table', 'opened a table')
    this.table.join(HOST_ID, name)
    this.room.onJoin = (player, rejoined) => {
      log('table', `player ${player.id} ${rejoined ? 'came back' : 'joined'}`)
      this.table.join(player.id, player.name)
      this.onJoin(player.name, rejoined)
      this.onChange()
    }
    this.room.onLeave = (player) => {
      log('table', `player ${player.id} left`)
      this.table.leave(player.id)
      this.onChange()
    }
    this.room.onEvent = (player, event) => {
      if (this.table.move(player.id, event.game, event.moveNo, event.move)) this.onChange()
    }
    this.room.onInput = (player, input) => {
      if (input !== null) this.table.input(player.id, input)
    }
    this.room.onTick = (seconds) => {
      const live = this.table.tick(seconds)
      if (live) this.onChange()
      return live || ++this.ticks % BOARD_TICKS === 0 ? this.table.state() : undefined
    }
    // Each player gets the table as they may see it: their own cards, nobody else's.
    this.room.stateFor = (player) => this.table.state(player.id)
  }

  state(): TableState {
    return this.table.state(HOST_ID)
  }

  move(game: GameId, moveNo: number, move: Move): void {
    if (this.table.move(HOST_ID, game, moveNo, move)) this.onChange()
  }

  input(values: readonly number[]): void {
    this.table.input(HOST_ID, values)
  }

  get net(): NetLog {
    return this.room.net
  }

  peers(): number[] {
    return this.room.players().map((p) => p.id)
  }

  details(peer: number): Promise<ConnectionDetails | null> {
    return this.room.details(peer)
  }

  /** Tests every player's connection for five seconds, beside the game. */
  async testConnections(): Promise<ConnectionTestRun> {
    log('net', 'connection test started')
    const run = await this.room.testConnections()
    const answered = run.players.filter((p) => p.result).length
    log('net', `connection test over: ${answered} of ${run.players.length} answered`)
    return run
  }

  lastTest(): ConnectionTestRun | null {
    return this.room.lastTest()
  }

  choose(game: GameId): boolean {
    const started = this.table.choose(game)
    if (started) log('table', `started ${game}`)
    if (started) this.onChange()
    return started
  }

  rematch(): void {
    if (this.table.rematch()) this.onChange()
  }

  lobby(): void {
    this.table.lobby()
    this.onChange()
  }

  /** An invitation for one more player: a code to show, and the player's answer to take. */
  pair(): Promise<Pairing> {
    return this.room.pair()
  }

  close(): void {
    log('table', 'closed the table')
    this.room.close(true)
  }
}

/**
 * How long a player's phone waits for the host to take its answer. Scanning takes seconds, but
 * a code sent over a messenger and pasted on the other phone can take minutes.
 */
export const ANSWER_WAIT_MS = 10 * 60_000

/** A player's phone: it draws the host's table and sends its moves. */
export class GuestSeat implements Seat {
  readonly isHost = false
  onChange: () => void = () => {}
  onLost: (ended: boolean) => void = () => {}
  /** The host started a connection test, which runs for a few seconds beside the game. */
  onTestStart: () => void = () => {}

  private constructor(private readonly room: GuestRoom<Input, TableState, Event>) {
    rememberNet(this)
    log('table', `joined as player ${room.id}`)
    room.onState = () => this.onChange()
    room.onLost = (ended) => {
      log('table', ended ? 'the host closed the table' : 'lost the host')
      this.onLost(ended)
    }
    room.onTestStart = () => {
      log('net', 'the host tests the connection')
      this.onTestStart()
    }
  }

  /**
   * Joins the host's table over a connection; rejects with `version` if the phones run
   * different versions, `full` if there is no seat left, and `timeout` if the host is silent.
   */
  static async join(link: Connection, name: string, token: string): Promise<GuestSeat> {
    await opened(link, ANSWER_WAIT_MS)
    const room = await GuestRoom.join<Input, TableState, Event>(link, {
      name,
      token,
      version: PROTOCOL,
      parseState,
      parseEvent,
      netNote: (line) => log('net', line),
    })
    return new GuestSeat(room)
  }

  get id(): number {
    return this.room.id
  }

  /** The host's name. */
  get host(): string {
    return this.room.host
  }

  get net(): NetLog {
    return this.room.net
  }

  peers(): number[] {
    return [HOST_ID]
  }

  details(): Promise<ConnectionDetails | null> {
    return this.room.details()
  }

  lastTest(): ConnectionTest | null {
    return this.room.lastTest()
  }

  state(): TableState | null {
    return this.room.state()
  }

  move(game: GameId, moveNo: number, move: Move): void {
    this.room.send({ type: 'move', game, moveNo, move })
  }

  input(values: readonly number[]): void {
    this.room.setInput(values)
  }

  close(): void {
    log('table', 'left the table')
    this.room.close()
  }
}
