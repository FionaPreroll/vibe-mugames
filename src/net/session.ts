import { type Connection, opened } from '@fionapreroll/p2p'
import { GuestRoom, HOST_ID, HostRoom, type Pairing } from '@fionapreroll/p2p/room'
import type { GameId, Move } from '../core/board'
import { Table, type TableState } from '../core/table'
import { type Event, type Input, PROTOCOL, parseEvent, parseInput, parseState } from './protocol'

/** Board games need no more: the table goes out ten times a second. */
const TICK_MS = 100

/**
 * One phone's seat at the table, as the screens use it, for the host and for players alike:
 * the host decides on its own phone, players send their moves to the host.
 */
export interface Seat {
  /** This phone's player id. */
  readonly id: number
  readonly isHost: boolean
  /** The table as this phone knows it; null until a player has heard from the host. */
  state(): TableState | null
  /** Makes a move as move number `moveNo` of `game`; the host takes it if it is legal. */
  move(game: GameId, moveNo: number, move: Move): void
  /** Called whenever the table may have changed. */
  onChange: () => void
  /** Called once if the connection to the host is gone: `ended` if the host closed the table. */
  onLost: (ended: boolean) => void
  /** Leaves the table; the host closes it for everyone. */
  close(): void
}

/** The host's phone: it keeps the table and lets players in. */
export class HostSeat implements Seat {
  readonly id = HOST_ID
  readonly isHost = true
  readonly table = new Table()
  readonly room: HostRoom<Input, TableState, Event>
  onChange: () => void = () => {}
  onLost: (ended: boolean) => void = () => {}
  /** A player came in, or came back. */
  onJoin: (name: string, rejoined: boolean) => void = () => {}

  constructor(readonly name: string) {
    this.room = new HostRoom<Input, TableState, Event>({
      name,
      version: PROTOCOL,
      parseInput,
      parseEvent,
      tickMs: TICK_MS,
    })
    this.table.join(HOST_ID, name)
    this.room.onJoin = (player, rejoined) => {
      this.table.join(player.id, player.name)
      this.onJoin(player.name, rejoined)
      this.onChange()
    }
    this.room.onLeave = (player) => {
      this.table.leave(player.id)
      this.onChange()
    }
    this.room.onEvent = (player, event) => {
      if (this.table.move(player.id, event.game, event.moveNo, event.move)) this.onChange()
    }
    this.room.onTick = () => this.table.state()
  }

  state(): TableState {
    return this.table.state()
  }

  move(game: GameId, moveNo: number, move: Move): void {
    if (this.table.move(HOST_ID, game, moveNo, move)) this.onChange()
  }

  choose(game: GameId): boolean {
    const started = this.table.choose(game)
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
    this.room.close(true)
  }
}

/** A player's phone: it draws the host's table and sends its moves. */
export class GuestSeat implements Seat {
  readonly isHost = false
  onChange: () => void = () => {}
  onLost: (ended: boolean) => void = () => {}

  private constructor(private readonly room: GuestRoom<Input, TableState, Event>) {
    room.onState = () => this.onChange()
    room.onLost = (ended) => this.onLost(ended)
  }

  /**
   * Joins the host's table over a connection; rejects with `version` if the phones run
   * different versions, `full` if there is no seat left, and `timeout` if the host is silent.
   */
  static async join(link: Connection, name: string, token: string): Promise<GuestSeat> {
    await opened(link)
    const room = await GuestRoom.join<Input, TableState, Event>(link, {
      name,
      token,
      version: PROTOCOL,
      parseState,
      parseEvent,
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

  state(): TableState | null {
    return this.room.state()
  }

  move(game: GameId, moveNo: number, move: Move): void {
    this.room.send({ type: 'move', game, moveNo, move })
  }

  close(): void {
    this.room.close()
  }
}
