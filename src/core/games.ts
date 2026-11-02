import { type BoardGame, type BoardGameId, type GameId, isBoardGame } from './board'
import { dame } from './dame'
import { fourInARow } from './fourInARow'
import { MAX_SEATS, MIN_SEATS } from './miaumiau'
import { muehle } from './muehle'
import { ticTacToe } from './tictactoe'

/** Every board game in the Spielekiste. */
export const GAMES: Record<BoardGameId, BoardGame> = {
  tictactoe: ticTacToe,
  fourinarow: fourInARow,
  muehle,
  dame,
}

/** How many players a game takes: the fewest it starts with, and the most who play. */
export function seatRange(game: GameId): { readonly min: number; readonly max: number } {
  if (isBoardGame(game)) return { min: GAMES[game].seats, max: GAMES[game].seats }
  return { min: MIN_SEATS, max: MAX_SEATS }
}
