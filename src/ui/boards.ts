import {
  type BoardGame,
  EMPTY,
  type GameId,
  isCrowned,
  type Move,
  sameMove,
  seatOf,
} from '../core/board'
import { DAME_SIZE, isDark, takingMoves } from '../core/dame'
import { FOUR_COLUMNS } from '../core/fourInARow'
import { GAMES } from '../core/games'
import { flying, MUEHLE_SPOTS } from '../core/muehle'
import type { TableState } from '../core/table'
import { t } from '../i18n'
import { h } from './dom'

/**
 * The board of the game on the table, drawn from the table's state. A move of several cells is
 * picked a cell at a time: the piece, then where it goes, then every square a jump lands on.
 * The board offers only cells that lead to a legal move, and sends the move once it is whole.
 */

/** The cells picked so far for this phone's next move; kept while the screen redraws. */
export class Picker {
  path: number[] = []
  private moveNo = -1
  private game: GameId | null = null
  /** Called when the picked cells change, to draw the board again. */
  onChange: () => void = () => {}

  /** The cells picked for this move: none once the game or the move number has moved on. */
  current(state: TableState): number[] {
    if (state.moveNo !== this.moveNo || state.game !== this.game) {
      this.moveNo = state.moveNo
      this.game = state.game
      this.path = []
    }
    return this.path
  }

  set(path: number[]): void {
    this.path = path
    this.onChange()
  }
}

/** The legal moves that go on from the cells picked so far. */
export function following(moves: readonly Move[], path: readonly number[]): Move[] {
  return moves.filter((move) => path.every((cell, i) => move[i] === cell))
}

/**
 * What a tap on a cell does, given the legal moves and the cells picked so far: the cells picked
 * next, and the move to send once they make one.
 */
export function tap(
  moves: readonly Move[],
  path: readonly number[],
  cell: number,
): { path: number[]; send: Move | null } {
  // Tapping the piece picked first lets go of it.
  if (path.length > 0 && cell === path[0]) return { path: [], send: null }
  const next = [...path, cell]
  if (following(moves, next).length > 0) {
    if (moves.some((move) => sameMove(move, next))) return { path: [], send: next }
    return { path: next, send: null }
  }
  // Another piece, in place of the one picked.
  if (path.length === 1 && following(moves, [cell]).length > 0) return tap(moves, [], cell)
  return { path: [...path], send: null }
}

/**
 * The board as the player `viewer` sees it. `onMove` gets a move when this phone may make one;
 * otherwise the board only shows.
 */
export function boardView(
  state: TableState,
  viewer: number,
  picker: Picker,
  onMove: ((move: Move) => void) | null,
): HTMLElement {
  const game = state.game
  const position = state.position
  if (game === null || position === null) return h('div')
  const rules = GAMES[game]
  const moves = onMove && state.outcome === null ? rules.moves(position) : []
  let path = picker.current(state)
  if (following(moves, path).length === 0) path = []
  const next = new Set(following(moves, path).map((move) => move[path.length]))
  const starts = new Set(moves.map((move) => move[0]))
  const winning = new Set(
    state.outcome !== null && state.outcome !== 'draw' ? state.outcome.line : [],
  )
  const last = new Set(game === 'fourinarow' ? [] : (state.last ?? []))

  /** What a tap on the cell picks: in Four in a Row any cell of a column is that column. */
  const target = (cell: number) => (game === 'fourinarow' ? cell % FOUR_COLUMNS : cell)
  const cellButton = (cell: number, label: string, content = '') => {
    const piece = position.board[cell] ?? EMPTY
    const seat = seatOf(piece)
    const into = target(cell)
    const open = next.has(into) || (path.length > 0 && cell === path[0]) || starts.has(into)
    const classes = [
      'cell',
      seat === EMPTY ? 'empty' : `seat-${seat}`,
      isCrowned(piece) ? 'crowned' : '',
      winning.has(cell) ? 'win' : '',
      path.includes(cell) ? 'picked' : '',
      next.has(into) && path.length > 0 ? 'target' : '',
      last.has(cell) ? 'last' : '',
      // A piece this player may pick, or take.
      seat !== EMPTY && game !== 'fourinarow' && path.length === 0 && starts.has(into) ? 'can' : '',
    ]
    const name = seat === EMPTY ? '' : pieceName(game, seat, state)
    const crowned = isCrowned(piece) ? ` (${t('crowned')})` : ''
    const button = h('button', {
      type: 'button',
      class: classes.filter(Boolean).join(' '),
      ariaLabel: name ? `${label}: ${name}${crowned}` : label,
      textContent: content,
      disabled: !onMove || !open,
      onclick: () => {
        const result = tap(moves, path, into)
        picker.set(result.path)
        if (result.send) onMove?.(result.send)
      },
    })
    button.dataset.cell = String(cell)
    if (game === 'dame' && seat !== EMPTY) {
      button.append(h('span', { textContent: isCrowned(piece) ? '♛' : '' }))
    }
    return button
  }

  const board = h('div', {
    class: `board ${game}${onMove ? ' active' : ''}`,
    role: 'grid',
  } as Partial<HTMLDivElement>)
  if (game === 'muehle') muehleBoard(board, rules, cellButton)
  else if (game === 'dame') dameBoard(board, state.seats[1] === viewer, cellButton)
  else {
    const columns = game === 'fourinarow' ? FOUR_COLUMNS : 3
    board.style.setProperty('--columns', String(columns))
    for (let cell = 0; cell < rules.cells; cell++) {
      const label = `${t(game)} ${Math.floor(cell / columns) + 1}/${(cell % columns) + 1}`
      const seat = seatOf(position.board[cell] ?? EMPTY)
      board.append(cellButton(cell, label, game === 'tictactoe' ? symbol(seat) : ''))
    }
  }
  return board
}

type CellButton = (cell: number, label: string, content?: string) => HTMLButtonElement

/** The points of Mühle on their three squares and the lines between them. */
function muehleBoard(board: HTMLElement, rules: BoardGame, cellButton: CellButton): void {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '-0.5 -0.5 7 7')
  svg.setAttribute('aria-hidden', 'true')
  const lines = [
    ...[0, 1, 2].map((ring) => {
      const size = 6 - 2 * ring
      return `M${ring} ${ring}h${size}v${size}h${-size}z`
    }),
    'M3 0v2M3 4v2M0 3h2M4 3h2',
  ]
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', lines.join(''))
  svg.append(path)
  board.append(svg)
  for (let point = 0; point < rules.cells; point++) {
    const [x, y] = MUEHLE_SPOTS[point] ?? [0, 0]
    const button = cellButton(point, coordinate(x, 6 - y))
    button.style.setProperty('--x', String(x))
    button.style.setProperty('--y', String(y))
    board.append(button)
  }
}

/** The 8 by 8 squares of Dame, each player's own pieces at the bottom of their phone. */
function dameBoard(board: HTMLElement, flip: boolean, cellButton: CellButton): void {
  board.style.setProperty('--columns', String(DAME_SIZE))
  for (let shown = 0; shown < DAME_SIZE * DAME_SIZE; shown++) {
    const cell = flip ? DAME_SIZE * DAME_SIZE - 1 - shown : shown
    const x = cell % DAME_SIZE
    const y = Math.floor(cell / DAME_SIZE)
    if (!isDark(cell)) board.append(h('div', { class: 'square' }))
    else board.append(cellButton(cell, coordinate(x, DAME_SIZE - 1 - y)))
  }
}

/** A square's name, as players of board games know it: a1 at the bottom left. */
function coordinate(x: number, yFromBottom: number): string {
  return `${String.fromCharCode(97 + x)}${yFromBottom + 1}`
}

/** A line for the player to move, on what this move asks of them; empty if nothing. */
export function hint(state: TableState, path: readonly number[]): string {
  const position = state.position
  if (position === null || state.outcome !== null) return ''
  if (state.game === 'muehle' && position.phase === 'move') {
    if ((position.hand[position.turn] ?? 0) > 0) return t('placeHint')
    return flying(position) ? t('jumpHint') : t('moveHint')
  }
  if (state.game === 'dame') {
    if (path.length > 1) return t('jumpOn')
    if (takingMoves(position).length > 0) return t('mustTake')
  }
  return ''
}

/** The pieces each player still has to place, in Mühle; empty once all are on the board. */
export function handText(state: TableState): string {
  const position = state.position
  if (state.game !== 'muehle' || position === null || position.hand.every((n) => n === 0)) return ''
  return position.hand
    .map((count, seat) => t('toPlace', { name: seatName(state, seat), count }))
    .join(' · ')
}

/** The mark of a seat in Tic Tac Toe. */
export function symbol(seat: number): string {
  return seat === 0 ? '✕' : seat === 1 ? '◯' : ''
}

export function seatName(state: TableState, seat: number): string {
  const id = state.seats[seat]
  return state.players.find((p) => p.id === id)?.name ?? '?'
}

function pieceName(game: GameId, seat: number, state: TableState): string {
  const name = seatName(state, seat)
  return game === 'tictactoe' ? `${symbol(seat)} ${name}` : name
}
