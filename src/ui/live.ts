import { type GameId, isLiveGame } from '../core/board'
import type { TableState } from '../core/table'
import type { LiveOptions, LiveView } from './canvas'
import { RaceView } from './race'
import { RinkView } from './rink'

/**
 * Games in real time on the screen: a field drawn many times a second, which stays in place
 * while the rest of the screen is drawn anew, and the players' fingers and keys on it.
 */

/** Where the field of a game in real time lives between redraws of its screen. */
export class LiveSlot {
  private view: LiveView | null = null
  private key = ''

  constructor(private readonly options: LiveOptions) {}

  /** Whether everyone plays on this one device. */
  get local(): boolean {
    return this.options.local
  }

  /**
   * The field for the game on the table, as player `viewer` sees it: the same one as before
   * while the game and the viewer's seat stay, a new one otherwise. `shared` is a screen
   * everyone looks at, which shows the whole field.
   */
  element(state: TableState, viewer: number, shared: boolean): HTMLElement | null {
    const game = state.game
    if (game === null || !isLiveGame(game)) {
      this.stop()
      return null
    }
    const seat = state.seats.indexOf(viewer)
    const key = `${game}:${seat}:${shared}`
    if (this.view === null || this.view.stopped || key !== this.key) {
      this.view?.stop()
      this.key = key
      this.view = make(game, viewer, shared, this.options)
    }
    this.view.update(state)
    return this.view.element
  }

  update(state: TableState): void {
    if (this.view && !this.view.stopped && state.game !== null && isLiveGame(state.game)) {
      this.view.update(state)
    }
  }

  stop(): void {
    this.view?.stop()
    this.view = null
  }
}

function make(game: GameId, viewer: number, shared: boolean, options: LiveOptions): LiveView {
  return game === 'lichtrenner'
    ? new RaceView(viewer, shared, options)
    : new RinkView(viewer, shared, options)
}
