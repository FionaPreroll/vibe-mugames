import type { BoardGame, GameId } from './board'
import { dame } from './dame'
import { fourInARow } from './fourInARow'
import { muehle } from './muehle'
import { ticTacToe } from './tictactoe'

/** Every game in the Spielekiste, in the order the lobby shows them. */
export const GAMES: Record<GameId, BoardGame> = {
  tictactoe: ticTacToe,
  fourinarow: fourInARow,
  muehle,
  dame,
}
