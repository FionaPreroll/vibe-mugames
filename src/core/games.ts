import { type BoardGame, type BoardGameId, type GameId, isBoardGame } from './board'
import { dame } from './dame'
import { fourInARow } from './fourInARow'
import { MAX_SEATS, MIN_SEATS } from './miaumiau'
import { muehle } from './muehle'
import { SEA_SEATS } from './seeschlacht'
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
  if (game === 'seeschlacht') return { min: SEA_SEATS, max: SEA_SEATS }
  return { min: MIN_SEATS, max: MAX_SEATS }
}

/** Games in which players hold cards the others must not see. */
const HIDDEN: ReadonlySet<GameId> = new Set<GameId>(['miaumiau'])

/**
 * Whether a game hides something from some players, such as the cards in each hand. Played on
 * one device, everyone there sees it all: such games are played with open cards.
 */
export function hasHiddenCards(game: GameId): boolean {
  return HIDDEN.has(game)
}

/** Games in which each player's view is theirs alone, and the device hides it from the others. */
const HANDED_OVER: ReadonlySet<GameId> = new Set<GameId>(['seeschlacht'])

/**
 * Whether a game is hidden on one device instead of played open, such as the fleets of Sea
 * Battle: taking turns on one screen, the device is handed over between the players, and shows
 * nothing of a player's own until they say they hold it; on a split screen, each part hides its
 * player's own until they ask to see it.
 */
export function handsOver(game: GameId): boolean {
  return HANDED_OVER.has(game)
}
