import type { GameId, Move } from './core/board'
import { Table, type TableState } from './core/table'
import type { TableHost } from './net/session'
import { random } from './random'

/**
 * A table on one device: everyone plays on the same screen, taking turns, or on a screen split
 * into a part for each player. No network: the device keeps the table itself, as a host would,
 * and each move comes from whoever's turn it is.
 */

/** The fewest who play on one device, and the most: as many as Miau-Miau seats. */
export const MIN_LOCAL = 2
export const MAX_LOCAL = 6
/** A split screen has a part for each player: four at most, for the parts to stay big enough. */
export const MAX_SPLIT = 4

export class LocalTable implements TableHost {
  readonly table: Table
  /** The players' ids, 0 and up, in the order of their names. */
  readonly ids: readonly number[]
  /** Called whenever the table changed. */
  onChange: () => void = () => {}

  /** `names` are the players', at least MIN_LOCAL and at most MAX_LOCAL of them. */
  constructor(names: readonly string[], shuffle: () => number = random) {
    if (names.length < MIN_LOCAL || names.length > MAX_LOCAL) {
      throw new RangeError(`${names.length} players on one device`)
    }
    this.table = new Table(shuffle)
    this.ids = names.map((_, id) => id)
    names.forEach((name, id) => {
      this.table.join(id, name)
    })
  }

  /** The table as player `viewer` sees it: with their own cards in Miau-Miau. */
  state(viewer: number): TableState {
    return this.table.state(viewer)
  }

  /** A move by player `id`, taken only on their turn and if the rules allow it. */
  move(id: number, game: GameId, moveNo: number, move: Move): boolean {
    const taken = this.table.move(id, game, moveNo, move)
    if (taken) this.onChange()
    return taken
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
}
