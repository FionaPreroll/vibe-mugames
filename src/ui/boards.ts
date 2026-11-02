import { EMPTY } from '../core/board'
import { GAMES } from '../core/games'
import type { TableState } from '../core/table'
import { t } from '../i18n'
import { h } from './dom'

/**
 * The board of the game on the table, drawn from the table's state. `onMove` gets a move when
 * this phone may make one; otherwise the board only shows.
 */
export function boardView(state: TableState, onMove: ((move: number) => void) | null): HTMLElement {
  const game = state.game
  if (game === null) return h('div')
  const rules = GAMES[game]
  const winning = new Set(
    state.outcome !== null && state.outcome !== 'draw' ? state.outcome.line : [],
  )
  const board = h('div', {
    class: `board ${game}${onMove ? ' active' : ''}`,
    role: 'grid',
  } as Partial<HTMLDivElement>)
  board.style.setProperty('--columns', String(rules.columns))
  board.style.setProperty('--rows', String(rules.rows))
  state.board.forEach((seat, cell) => {
    const column = cell % rules.columns
    const row = Math.floor(cell / rules.columns)
    // In Four in a Row, a move is the column: any cell of it drops a piece there.
    const move = game === 'fourinarow' ? column : cell
    const label =
      seat === EMPTY ? `${t(game)} ${row + 1}/${column + 1}` : pieceName(game, seat, state)
    board.append(
      h('button', {
        type: 'button',
        class: `cell${seat === EMPTY ? '' : ` seat-${seat}`}${winning.has(cell) ? ' win' : ''}`,
        ariaLabel: label,
        textContent: game === 'tictactoe' ? symbol(seat) : '',
        disabled: !onMove || !rules.legal(state.board, move),
        onclick: () => onMove?.(move),
      }),
    )
  })
  return board
}

/** The mark of a seat in Tic Tac Toe. */
export function symbol(seat: number): string {
  return seat === 0 ? '✕' : seat === 1 ? '◯' : ''
}

function pieceName(game: string, seat: number, state: TableState): string {
  const id = state.seats[seat]
  const name = state.players.find((p) => p.id === id)?.name ?? '?'
  return game === 'tictactoe' ? `${symbol(seat)} ${name}` : name
}
