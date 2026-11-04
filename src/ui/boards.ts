import {
  type Board,
  type BoardGame,
  EMPTY,
  type GameId,
  isBoardGame,
  isCrowned,
  type Move,
  sameMove,
  seatOf,
} from '../core/board'
import { DAME_SIZE, isDark, takingMoves } from '../core/dame'
import { FOUR_COLUMNS } from '../core/fourInARow'
import { GAMES } from '../core/games'
import { across, BOXES, box, boxCounts, closedBox, down } from '../core/kaesekaestchen'
import { flying, MUEHLE_SPOTS } from '../core/muehle'
import { counts, passed, REVERSI_SIZE } from '../core/reversi'
import type { Ship } from '../core/seeschlacht'
import {
  home,
  STERN_HOLES,
  STERN_TRIANGLE,
  sternArrived,
  sternSeats,
  target,
  triangle,
} from '../core/sternhalma'
import type { TableState } from '../core/table'
import { bigBoard, cellOf, lastMark, SPOTS, sentTo, smallOutcome } from '../core/ultimate'
import { type TextKey, t } from '../i18n'
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
  /** Sea Battle: the fleet being placed, null until shuffled, and the index of the ship picked. */
  fleet: Ship[] | null = null
  ship = -1
  /** Sea Battle: the ship picked last did not fit where it was asked to go. */
  misfit = false
  /** Sea Battle, Mäxchen, Werwolf: whether the fleet, dice or role hidden on a split screen shows. */
  showOwn = false
  /** Called when the picked cells change, to draw the board again. */
  onChange: () => void = () => {}
  /** Elements that stay between redraws (see `keep`), by key, for the game started last. */
  private kept = new Map<string, HTMLElement>()
  private keptRound = -1

  /**
   * The element for `key` in this view, made by `make` the first time: the same one while the
   * game on the table goes on, such as a text field the player types in (see `keep.ts`).
   */
  keep<E extends HTMLElement>(state: TableState, key: string, make: () => E): E {
    if (state.round !== this.keptRound) {
      this.kept.clear()
      this.keptRound = state.round
    }
    let element = this.kept.get(key)
    if (!element) {
      element = make()
      this.kept.set(key, element)
    }
    return element as E
  }

  /** Everything picked that the screen shows: drawn again only when this or the table changes. */
  shown(state: TableState): unknown[] {
    return [this.current(state), this.fleet, this.ship, this.misfit, this.showOwn]
  }

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
 * next, and the move to send once they make one. With `byEnd`, as in Sternhalma, a piece goes
 * straight to the cell tapped, by the one way the rules give there, however many jumps it takes.
 */
export function tap(
  moves: readonly Move[],
  path: readonly number[],
  cell: number,
  byEnd = false,
): { path: number[]; send: Move | null } {
  // Tapping the piece picked first lets go of it.
  if (path.length > 0 && cell === path[0]) return { path: [], send: null }
  if (byEnd && path.length === 1) {
    const there = following(moves, path).find((move) => move[move.length - 1] === cell)
    if (there) return { path: [], send: [...there] }
  }
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
  if (game === null || position === null || !isBoardGame(game)) return h('div')
  const rules = GAMES[game]
  const moves = onMove && state.outcome === null ? rules.moves(position) : []
  let path = picker.current(state)
  if (following(moves, path).length === 0) path = []
  // In Sternhalma a piece goes where it is tapped, however many jumps that takes.
  const byEnd = game === 'sternhalma'
  const next = new Set(
    following(moves, path).map((move) =>
      byEnd && path.length > 0 ? move[move.length - 1] : move[path.length],
    ),
  )
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
    // Ultimate Tic Tac Toe marks its newest mark as a kind of its own, but crowns nothing.
    const crown = isCrowned(piece) && game !== 'ultimate'
    const into = target(cell)
    const open = next.has(into) || (path.length > 0 && cell === path[0]) || starts.has(into)
    const classes = [
      'cell',
      seat === EMPTY ? 'empty' : `seat-${seat}`,
      crown ? 'crowned' : '',
      winning.has(cell) ? 'win' : '',
      path.includes(cell) ? 'picked' : '',
      next.has(into) && (path.length > 0 || (game === 'reversi' && seat === EMPTY)) ? 'target' : '',
      last.has(cell) ? 'last' : '',
      // A piece this player may pick, or take.
      seat !== EMPTY && game !== 'fourinarow' && path.length === 0 && starts.has(into) ? 'can' : '',
      // A line this player may draw.
      game === 'kaesekaestchen' && seat === EMPTY && starts.has(into) ? 'can' : '',
    ]
    const name = seat === EMPTY ? '' : pieceName(game, seat, state)
    const crowned = crown ? ` (${t('crowned')})` : ''
    const button = h('button', {
      type: 'button',
      class: classes.filter(Boolean).join(' '),
      ariaLabel: name ? `${label}: ${name}${crowned}` : label,
      textContent: content,
      disabled: !onMove || !open,
      onclick: () => {
        const result = tap(moves, path, into, byEnd)
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
  else if (game === 'kaesekaestchen') kaeseBoard(board, cellButton)
  else if (game === 'ultimate') {
    ultimateBoard(board, position.board, state.outcome === null, cellButton)
  } else if (game === 'sternhalma') {
    const seats = sternSeats(position.board)
    sternBoard(board, seats, home(Math.max(0, state.seats.indexOf(viewer)), seats), cellButton)
  } else if (game === 'reversi') {
    board.style.setProperty('--columns', String(REVERSI_SIZE))
    for (let cell = 0; cell < rules.cells; cell++) {
      const x = cell % REVERSI_SIZE
      const y = Math.floor(cell / REVERSI_SIZE)
      board.append(cellButton(cell, coordinate(x, REVERSI_SIZE - 1 - y)))
    }
  } else {
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

/**
 * Käsekästchen's dots, with the lines between them and the boxes they close, on a grid of
 * 11 by 11: dots and lines down on the even columns, lines across and boxes on the odd ones.
 */
function kaeseBoard(board: HTMLElement, cellButton: CellButton): void {
  const size = 2 * BOXES + 1
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const x = Math.floor(column / 2)
      const y = Math.floor(row / 2)
      const evenRow = row % 2 === 0
      const evenColumn = column % 2 === 0
      if (evenRow && evenColumn) board.append(h('div', { class: 'dot' }))
      else if (evenRow) {
        const line = cellButton(across(x, y), t('lineAcross', { row: y + 1, column: x + 1 }))
        line.classList.add('across')
        board.append(line)
      } else if (evenColumn) {
        const line = cellButton(down(x, y), t('lineDown', { row: y + 1, column: x + 1 }))
        line.classList.add('down')
        board.append(line)
      } else {
        const cell = cellButton(box(x, y), t('boxAt', { row: y + 1, column: x + 1 }))
        cell.classList.add('box')
        board.append(cell)
      }
    }
  }
}

/**
 * Ultimate Tic Tac Toe's nine small boards on the big one, each three by three. The board the
 * player to move is sent to is marked while the game goes on, and a small board that is won
 * shows its winner's mark over it.
 */
function ultimateBoard(
  board: HTMLElement,
  cells: Board,
  going: boolean,
  cellButton: CellButton,
): void {
  const sent = going ? sentTo(cells) : null
  for (let small = 0; small < SPOTS; small++) {
    const result = smallOutcome(cells, small)
    const classes = [
      'small',
      small === sent ? 'sent' : '',
      result === 'draw' ? 'full' : '',
      result && result !== 'draw' ? `won seat-${result.winner}` : '',
    ]
    const part = h('div', {
      class: classes.filter(Boolean).join(' '),
      role: 'group',
      ariaLabel: t('ultimateBoardAt', smallPlace(small)),
    } as Partial<HTMLDivElement>)
    for (let spot = 0; spot < SPOTS; spot++) {
      const cell = cellOf(small, spot)
      const label = t('ultimateCellAt', {
        ...smallPlace(small),
        row: Math.floor(spot / 3) + 1,
        column: (spot % 3) + 1,
      })
      part.append(cellButton(cell, label, symbol(seatOf(cells[cell] ?? EMPTY))))
    }
    if (result && result !== 'draw') {
      part.append(h('span', { class: 'owner', ariaHidden: 'true' }, symbol(result.winner)))
    }
    board.append(part)
  }
}

/** Where a small board of Ultimate Tic Tac Toe lies on the big one, for its name. */
function smallPlace(small: number): { boardRow: number; boardColumn: number } {
  return { boardRow: Math.floor(small / 3) + 1, boardColumn: (small % 3) + 1 }
}

/** Half the width of a step across between neighbouring holes, and the height of a row. */
const STERN_ROW = Math.sqrt(3) / 2
/** The middle of the star, where it turns round, in steps across and rows. */
const STERN_MIDDLE = [6, 8 * STERN_ROW] as const
/** Room around the star, in steps. */
const STERN_PAD = 0.6

/**
 * Where a point of Sternhalma's star is drawn, from 0 to 1 across and down, given in steps from
 * the middle, on the star turned so that the triangle `bottom` is at the bottom.
 */
function sternPoint(dx: number, dy: number, bottom: number): [number, number] {
  const [mx, my] = STERN_MIDDLE
  // The triangles go round clockwise from the bottom: turn the other way to bring one down.
  const angle = (-bottom * Math.PI) / 3
  const rx = dx * Math.cos(angle) - dy * Math.sin(angle)
  const ry = dx * Math.sin(angle) + dy * Math.cos(angle)
  return [
    (rx + mx + STERN_PAD) / (2 * mx + 2 * STERN_PAD),
    (ry + my + STERN_PAD) / (2 * my + 2 * STERN_PAD),
  ]
}

/** A hole of Sternhalma in steps from the middle of the star, `out` steps further out. */
function sternOffset(hole: number, out = 0): [number, number] {
  const [x, y] = STERN_HOLES[hole] ?? [0, 0]
  const [mx, my] = STERN_MIDDLE
  const dx = x / 2 - mx
  const dy = y * STERN_ROW - my
  const away = Math.hypot(dx, dy)
  const grow = away === 0 ? 1 : 1 + out / away
  return [dx * grow, dy * grow]
}

/** Where a hole of Sternhalma is drawn, from 0 to 1, with the triangle `bottom` at the bottom. */
export function sternSpot(hole: number, bottom: number): [number, number] {
  return sternPoint(...sternOffset(hole), bottom)
}

/** The holes at the corners of the star: its tips and the corners between them, in order. */
const STERN_OUTLINE = [
  [12, 0],
  [16, 4],
  [24, 4],
  [20, 8],
  [24, 12],
  [16, 12],
  [12, 16],
  [8, 12],
  [0, 12],
  [4, 8],
  [0, 4],
  [8, 4],
].map(([x, y]) => STERN_HOLES.findIndex(([hx, hy]) => hx === x && hy === y))

/**
 * The 121 holes of Sternhalma's star, turned so that this player's own triangle is at the
 * bottom. Each triangle a player is bound for is ringed in their colour.
 */
function sternBoard(
  board: HTMLElement,
  seats: number,
  bottom: number,
  cellButton: CellButton,
): void {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 1 1')
  svg.setAttribute('preserveAspectRatio', 'none')
  svg.setAttribute('aria-hidden', 'true')
  const star = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
  const corners = STERN_OUTLINE.map((hole) => sternPoint(...sternOffset(hole, 0.55), bottom))
  star.setAttribute('points', corners.map(([x, y]) => `${x.toFixed(4)},${y.toFixed(4)}`).join(' '))
  svg.append(star)
  board.append(svg)
  const bound = new Map<number, number>()
  for (let seat = 0; seat < seats; seat++) {
    for (const hole of triangle(target(seat, seats))) bound.set(hole, seat)
  }
  for (let hole = 0; hole < STERN_HOLES.length; hole++) {
    const [left, top] = sternSpot(hole, bottom)
    const [x, y] = STERN_HOLES[hole] ?? [0, 0]
    const button = cellButton(hole, t('holeAt', { row: y + 1, column: Math.floor(x / 2) + 1 }))
    button.style.left = `${(left * 100).toFixed(2)}%`
    button.style.top = `${(top * 100).toFixed(2)}%`
    const goal = bound.get(hole)
    if (goal !== undefined) button.classList.add(`goal-${goal}`)
    else if (STERN_TRIANGLE[hole] === -1) button.classList.add('middle')
    board.append(button)
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
  if (state.game === 'reversi') return t('reversiHint')
  if (state.game === 'kaesekaestchen') return t('kaeseHint')
  if (state.game === 'ultimate') {
    const sent = sentTo(position.board)
    if (sent !== null) return t('ultimateSent')
    return t(lastMark(position.board) === null ? 'ultimateStart' : 'ultimateFree')
  }
  if (state.game === 'sternhalma') return t(path.length > 0 ? 'sternWhere' : 'sternHint')
  return ''
}

/**
 * What the last move meant for whose turn it is, for everyone at the table: in Reversi, that a
 * player could not move and the other plays again; in Käsekästchen, that a box was closed and
 * its player draws again. Empty if nothing. `mine` is this player's seat, -1 if watching.
 */
export function news(state: TableState, mine: number, shared: boolean): string {
  const position = state.position
  if (position === null || state.outcome !== null) return ''
  const turn = position.turn
  const you = mine === turn && !shared
  if (state.game === 'reversi' && passed(position, state.last)) {
    const other = seatName(state, 1 - turn)
    return you
      ? t('reversiYouAgain', { name: other })
      : t('reversiAgain', { name: other, mover: seatName(state, turn) })
  }
  if (state.game === 'kaesekaestchen' && closedBox(position.board, state.last)) {
    return you ? t('kaeseYouAgain') : t('kaeseAgain', { name: seatName(state, turn) })
  }
  return ''
}

/**
 * The count under the board: the pieces each player still has to place in Mühle, until all are
 * on the board; the pieces on the board in Reversi; the boxes held in Käsekästchen; and in
 * Sternhalma, the pieces each player has brought home. Empty in other games.
 */
export function handText(state: TableState): string {
  const position = state.position
  if (position === null) return ''
  const each = (key: TextKey, numbers: readonly number[]) =>
    numbers.map((count, seat) => t(key, { name: seatName(state, seat), count })).join(' · ')
  if (state.game === 'muehle' && position.hand.some((n) => n > 0)) {
    return each('toPlace', position.hand)
  }
  if (state.game === 'reversi')
    return `${t('piecesHeld')} ${each('countOf', counts(position.board))}`
  if (state.game === 'ultimate') {
    const big = bigBoard(position.board)
    const won = [0, 1].map((seat) => big.filter((owner) => owner === seat).length)
    return `${t('boardsWon')} ${each('countOf', won)}`
  }
  if (state.game === 'kaesekaestchen') {
    return `${t('boxesHeld')} ${each('countOf', boxCounts(position.board))}`
  }
  if (state.game === 'sternhalma') {
    const seats = sternSeats(position.board)
    const arrived = Array.from({ length: seats }, (_, seat) =>
      sternArrived({ ...position, turn: seat }),
    )
    return `${t('arrived')} ${each('arrivedOf', arrived)}`
  }
  return ''
}

/** The mark of a seat in Tic Tac Toe and Ultimate Tic Tac Toe. */
export function symbol(seat: number): string {
  return seat === 0 ? '✕' : seat === 1 ? '◯' : ''
}

export function seatName(state: TableState, seat: number): string {
  const id = state.seats[seat]
  return state.players.find((p) => p.id === id)?.name ?? '?'
}

function pieceName(game: GameId, seat: number, state: TableState): string {
  const name = seatName(state, seat)
  return game === 'tictactoe' || game === 'ultimate' ? `${symbol(seat)} ${name}` : name
}
