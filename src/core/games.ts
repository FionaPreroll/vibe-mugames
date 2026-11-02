import type { BoardGame, GameId } from './board'
import { fourInARow } from './fourInARow'
import { ticTacToe } from './tictactoe'

/** Every game in the Spielekiste, in the order the lobby shows them. */
export const GAMES: Record<GameId, BoardGame> = {
  tictactoe: ticTacToe,
  fourinarow: fourInARow,
}
