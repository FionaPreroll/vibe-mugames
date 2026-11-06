import {
  BOARD_GAME_IDS,
  type BoardGame,
  type BoardGameId,
  type GameId,
  isBoardGame,
  LIVE_GAME_IDS,
} from './board'
import { dame } from './dame'
import * as echo from './echo'
import { fourInARow } from './fourInARow'
import { kaesekaestchen } from './kaesekaestchen'
import { MAX_RIDERS, MIN_RIDERS } from './lichtrenner'
import { MAX_LUDO, MIN_LUDO } from './ludo'
import { MAX_DICE_SEATS, MIN_DICE_SEATS } from './maexchen'
import { MAX_SEATS, MIN_SEATS } from './miaumiau'
import { MAX_SKETCHERS, MIN_SKETCHERS } from './montagsmaler'
import { muehle } from './muehle'
import * as reaction from './reaction'
import { reversi } from './reversi'
import { MAX_SWIM, MIN_SWIM } from './schwimmen'
import { SEA_SEATS } from './seeschlacht'
import { MAX_SNAKES, MIN_SNAKES } from './snakes'
import { MAX_WRITERS, MIN_WRITERS } from './stadtlandfluss'
import { sternhalma } from './sternhalma'
import { ticTacToe } from './tictactoe'
import { ultimate } from './ultimate'
import { MAX_GUESSERS, MIN_GUESSERS } from './werbinich'
import { MAX_VILLAGE, MIN_VILLAGE } from './werwolf'

/** Every board game in the Spielekiste. */
export const GAMES: Record<BoardGameId, BoardGame> = {
  tictactoe: ticTacToe,
  ultimate,
  fourinarow: fourInARow,
  muehle,
  dame,
  kaesekaestchen,
  reversi,
  sternhalma,
}

/** The kinds of games, as the game chooser groups them. */
export type GameGroup = 'tactics' | 'luck' | 'party' | 'skill'

/**
 * The games of each kind, in the order the chooser shows them: games of tactics, with nothing
 * left to chance; games of luck and bluff, with dice, cards or something hidden; party games of
 * words, drawing and asking, for many; and games of skill, in real time. Every game is in exactly
 * one.
 */
export const GAME_GROUPS: readonly {
  readonly group: GameGroup
  readonly games: readonly GameId[]
}[] = [
  { group: 'tactics', games: BOARD_GAME_IDS },
  { group: 'luck', games: ['ludo', 'miaumiau', 'schwimmen', 'seeschlacht', 'maexchen', 'werwolf'] },
  { group: 'party', games: ['stadtlandfluss', 'montagsmaler', 'werbinich'] },
  { group: 'skill', games: LIVE_GAME_IDS },
]

/** How many players a game takes: the fewest it starts with, and the most who play. */
export function seatRange(game: GameId): { readonly min: number; readonly max: number } {
  if (isBoardGame(game)) {
    const rules = GAMES[game]
    return { min: rules.minSeats ?? rules.seats, max: rules.seats }
  }
  if (game === 'seeschlacht') return { min: SEA_SEATS, max: SEA_SEATS }
  if (game === 'lichtrenner') return { min: MIN_RIDERS, max: MAX_RIDERS }
  if (game === 'airhockey') return { min: 2, max: 2 }
  if (game === 'snakes') return { min: MIN_SNAKES, max: MAX_SNAKES }
  if (game === 'reaction') return { min: reaction.MIN_PLAYERS, max: reaction.MAX_PLAYERS }
  if (game === 'echo') return { min: echo.MIN_PLAYERS, max: echo.MAX_PLAYERS }
  if (game === 'ludo') return { min: MIN_LUDO, max: MAX_LUDO }
  if (game === 'maexchen') return { min: MIN_DICE_SEATS, max: MAX_DICE_SEATS }
  if (game === 'schwimmen') return { min: MIN_SWIM, max: MAX_SWIM }
  if (game === 'werwolf') return { min: MIN_VILLAGE, max: MAX_VILLAGE }
  if (game === 'stadtlandfluss') return { min: MIN_WRITERS, max: MAX_WRITERS }
  if (game === 'montagsmaler') return { min: MIN_SKETCHERS, max: MAX_SKETCHERS }
  if (game === 'werbinich') return { min: MIN_GUESSERS, max: MAX_GUESSERS }
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
const HANDED_OVER: ReadonlySet<GameId> = new Set<GameId>([
  'seeschlacht',
  'maexchen',
  'werwolf',
  'schwimmen',
  'stadtlandfluss',
  'montagsmaler',
])

/**
 * Whether a game is hidden on one device instead of played open, such as the fleets of Sea
 * Battle, the dice under Mäxchen's cup, the roles of Werwolf, the hands of Schwimmen or the
 * answers of Stadt, Land, Fluss while they are written: taking turns on one screen, the
 * device is handed over between the players, and shows nothing of a player's own until they say
 * they hold it; on a split screen, each part hides its player's own until they ask to see it.
 */
export function handsOver(game: GameId): boolean {
  return HANDED_OVER.has(game)
}
