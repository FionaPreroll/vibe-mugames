/**
 * The board games of the Spielekiste, as pure rules: no DOM, no network, nothing but the game.
 * A board is a list of cells, each empty (-1) or holding the seat (0, 1, …) of the player whose
 * piece is there. The host runs the rules; players only draw the board it sends.
 */

export const EMPTY = -1

export type Board = readonly number[]

/** How a game ended: a seat won, with the cells that won it, or nobody did. */
export type Outcome = { readonly winner: number; readonly line: readonly number[] } | 'draw'

export interface BoardGame {
  /** The game's id, as the protocol carries it. */
  readonly id: GameId
  readonly columns: number
  readonly rows: number
  /** Players at the board; everyone else at the table watches. */
  readonly seats: number
  /** The board a game starts with. */
  start(): Board
  /** Whether the seat may make this move now (whose turn it is, the host checks). */
  legal(board: Board, move: number): boolean
  /** The board after the seat's move, which must be legal. */
  play(board: Board, seat: number, move: number): Board
  /** How the game ended, or null while it goes on. */
  outcome(board: Board): Outcome | null
}

export const GAME_IDS = ['tictactoe', 'fourinarow'] as const
export type GameId = (typeof GAME_IDS)[number]

export function isGameId(value: unknown): value is GameId {
  return (GAME_IDS as readonly unknown[]).includes(value)
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
