/**
 * The board games of the Spielekiste, as pure rules: no DOM, no network, nothing but the game.
 * A board is a list of cells, each empty (-1) or holding a piece: the seat (0, 1, …) of the
 * player it belongs to, plus KIND for a crowned piece. The host runs the rules; players only draw
 * the position it sends.
 */

export const EMPTY = -1

/** A cell holds `seat + KIND * kind`: seat 1's crowned piece (kind 1) is 11. */
export const KIND = 10

export type Board = readonly number[]

/**
 * A move is a path of cells: one cell to place a piece (or a column to drop it into), from and
 * to for moving one, and every square it lands on for a piece that jumps several times.
 */
export type Move = readonly number[]

/** What the seat to move does: move, or take an opponent's piece after closing a mill. */
export const PHASES = ['move', 'remove'] as const
export type Phase = (typeof PHASES)[number]

/** Where a game stands. The same shape for every game, so one parser reads them all. */
export interface Position {
  readonly board: Board
  /** The seat whose turn it is. */
  readonly turn: number
  /** Pieces each seat still has to bring onto the board, by seat; empty in games without. */
  readonly hand: readonly number[]
  readonly phase: Phase
  /** Moves in a row in which nothing decisive happened: too many make a draw. */
  readonly quiet: number
}

/** How a game ended: a seat won, with the cells that won it (maybe none), or nobody did. */
export type Outcome = { readonly winner: number; readonly line: readonly number[] } | 'draw'

export interface BoardGame {
  /** The game's id, as the protocol carries it. */
  readonly id: BoardGameId
  /** Cells on the board. */
  readonly cells: number
  /** The most players at the board; everyone else at the table watches. */
  readonly seats: number
  /** The fewest players a game starts with, if fewer than `seats`. */
  readonly minSeats?: number
  /** Kinds of piece: 2 where pieces can be crowned, otherwise 1. */
  readonly kinds: number
  /** The most cells a move names. */
  readonly steps: number
  /** The position a game starts with, for `seats` players (the most if not given): seat 0 first. */
  start(seats?: number): Position
  /** Every move the seat to move may make now. */
  moves(position: Position): Move[]
  /** The position after a move, which must be one of `moves`. */
  play(position: Position, move: Move): Position
  /** How the game ended, or null while it goes on. */
  outcome(position: Position): Outcome | null
}

/** The games played on a board, each a `BoardGame`. */
export const BOARD_GAME_IDS = [
  'tictactoe',
  'fourinarow',
  'muehle',
  'dame',
  'kaesekaestchen',
  'reversi',
  'sternhalma',
] as const
export type BoardGameId = (typeof BOARD_GAME_IDS)[number]

/** The games played in real time, with input many times a second instead of moves in turn. */
export const LIVE_GAME_IDS = ['lichtrenner', 'airhockey'] as const
export type LiveGameId = (typeof LIVE_GAME_IDS)[number]

/**
 * Every game, in the order the lobby shows them: the board games, the game of dice, the card
 * game, the game of hidden fleets, then the games in real time.
 */
export const GAME_IDS = [
  ...BOARD_GAME_IDS,
  'ludo',
  'miaumiau',
  'seeschlacht',
  ...LIVE_GAME_IDS,
] as const
export type GameId = (typeof GAME_IDS)[number]

export function isGameId(value: unknown): value is GameId {
  return (GAME_IDS as readonly unknown[]).includes(value)
}

export function isBoardGame(id: GameId): id is BoardGameId {
  return (BOARD_GAME_IDS as readonly string[]).includes(id)
}

export function isLiveGame(id: GameId): id is LiveGameId {
  return (LIVE_GAME_IDS as readonly string[]).includes(id)
}

/** Whether the seat to move may make this move now (whose turn it is, the table checks). */
export function isLegal(game: BoardGame, position: Position, move: Move): boolean {
  return game.moves(position).some((legal) => sameMove(legal, move))
}

export function sameMove(a: Move, b: Move): boolean {
  return a.length === b.length && a.every((cell, i) => cell === b[i])
}

/** The seat a cell's piece belongs to, or EMPTY. */
export function seatOf(cell: number): number {
  return cell === EMPTY ? EMPTY : cell % KIND
}

/** Whether a cell holds a crowned piece. */
export function isCrowned(cell: number): boolean {
  return cell !== EMPTY && cell >= KIND
}

/** A position of a game that has nothing but a board and turns. */
export function plain(board: Board, turn: number): Position {
  return { board, turn, hand: [], phase: 'move', quiet: 0 }
}

/**
 * The first line of `length` cells of the same seat, across, down or diagonally, on a board
 * `columns` wide; null if there is none.
 */
export function findLine(board: Board, columns: number, length: number): Outcome | null {
  const rows = board.length / columns
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ] as const
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const seat = board[row * columns + column]
      if (seat === undefined || seat === EMPTY) continue
      for (const [dx, dy] of directions) {
        const line: number[] = []
        for (let step = 0; step < length; step++) {
          const x = column + dx * step
          const y = row + dy * step
          if (x < 0 || x >= columns || y < 0 || y >= rows) break
          if (board[y * columns + x] !== seat) break
          line.push(y * columns + x)
        }
        if (line.length === length) return { winner: seat, line }
      }
    }
  }
  return null
}
