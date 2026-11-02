import { GAME_IDS, type GameId, type Move } from '../core/board'
import { handsOver, hasHiddenCards, seatRange } from '../core/games'
import { encode } from '../core/miaumiau'
import type { Player, TableState } from '../core/table'
import { t } from '../i18n'
import type { TableHost } from '../net/session'
import { boardView, handText, hint, type Picker, seatName, symbol } from './boards'
import { cardsHint, cardsView } from './cards'
import { h } from './dom'
import { seaHint, seaStatus, seaToMove, seaView, shotText } from './sea'

/**
 * What every table shows, at phones side by side and on one device alike: the players with
 * their scores, the lobby, and the game as one player sees it.
 */

/** The players at the table with their scores; `marks` adds a note after a player's name. */
export function playerItems(state: TableState, marks: (player: Player) => string[]): Node[] {
  return state.players.map((player) => {
    const notes = marks(player).filter(Boolean)
    const place = state.seats.indexOf(player.id)
    return h(
      'li',
      { class: player.away ? 'away' : '' },
      place >= 0 ? seatMark(state, place) : null,
      h('span', { class: 'name' }, player.name),
      notes.length > 0 ? h('span', { class: 'muted' }, ` (${notes.join(', ')})`) : null,
      h('span', { class: 'score' }, String(state.scores[player.id] ?? 0)),
    )
  })
}

/** A seat's colour, or its mark in Tic Tac Toe. */
export function seatMark(state: TableState, place: number): HTMLElement {
  return h(
    'span',
    { class: `piece seat-${place}` },
    state.game === 'tictactoe' ? symbol(place) : '●',
  )
}

/**
 * The games to choose from, for whoever keeps the table. `local` marks the games whose cards
 * are open when everyone plays on one device.
 */
export function gameChoices(state: TableState, host: TableHost, local: boolean): HTMLElement {
  const here = state.players.filter((p) => !p.away).length
  return h(
    'div',
    { class: 'games' },
    ...GAME_IDS.map((id) =>
      h(
        'button',
        {
          type: 'button',
          class: 'game-choice',
          disabled: here < seatRange(id).min,
          onclick: () => host.choose(id),
        },
        h('span', {}, t(id)),
        local && hasHiddenCards(id)
          ? h('span', { class: 'open-note muted' }, ` (${t('openCardsShort')})`)
          : null,
      ),
    ),
  )
}

export interface GameViewOptions {
  /** The player whose view this is: their seat, their cards. */
  readonly viewer: number
  /** The cells this view picked so far for its next move. */
  readonly picker: Picker
  /** Makes a move as the viewer; offered only on the viewer's turn. */
  readonly move: (game: GameId, moveNo: number, move: Move) => void
  /**
   * A screen everyone shares, taking turns on it: players are named instead of "you", and the
   * board stays put for all of them.
   */
  readonly shared?: boolean
  /** The viewer's own fleet in Sea Battle is hidden until they ask, as others see this screen. */
  readonly hideFleet?: boolean
}

/**
 * The game on the table as one player sees it: whose turn it is or how it ended, what this move
 * asks of them, the board or the cards, and the pieces still to place. `state` is the table as
 * the viewer may see it.
 */
export function gameView(state: TableState, options: GameViewOptions): HTMLElement[] {
  const game = state.game
  if (game === null) return []
  const { viewer, picker, shared = false } = options
  if (state.sea) {
    const sea = state.sea
    const toMove = seaToMove(state, sea, viewer)
    const status = h(
      'p',
      {
        class: `status turn${toMove ? ' mine' : ''}`,
        role: 'status',
      } as Partial<HTMLParagraphElement>,
      seaStatus(state, sea, viewer, shared),
    )
    const lines = [shotText(state, sea, viewer), seaHint(state, sea, viewer)].filter(Boolean)
    return [
      status,
      ...lines.map((line) => h('p', { class: 'hint muted' }, line)),
      ...seaView(state, sea, {
        viewer,
        picker,
        move: toMove ? (move) => options.move(game, state.moveNo, move) : null,
        shared,
        hideFleet: options.hideFleet ?? false,
      }),
    ]
  }
  const name = (seatNo: number) => seatName(state, seatNo)
  const mine = state.seats.indexOf(viewer)
  const turn = state.position?.turn ?? state.cards?.turn ?? 0
  const myTurn = state.outcome === null && mine >= 0 && turn === mine
  const taking = state.position?.phase === 'remove'
  const status = h('p', { class: 'status turn', role: 'status' } as Partial<HTMLParagraphElement>)
  if (state.outcome === 'draw') status.textContent = t(state.cards ? 'stuck' : 'draw')
  else if (state.outcome)
    status.textContent =
      state.outcome.winner === mine && !shared
        ? t('youWin')
        : t('theyWin', { name: name(state.outcome.winner) })
  else if (taking)
    status.textContent = shared
      ? t('theyTakeFrom', { name: name(turn), other: name(1 - turn) })
      : myTurn
        ? t('youTake', { name: name(1 - turn) })
        : t('theyTake', { name: name(turn) })
  else if (mine < 0)
    status.textContent =
      state.seats.length === 2
        ? t('watching', { a: name(0), b: name(1) })
        : t('watchingAll', { names: state.seats.map((_, i) => name(i)).join(', ') })
  else if (shared) status.textContent = t('yourTurnName', { name: name(turn) })
  else status.textContent = myTurn ? t('yourTurn') : t('theirTurn', { name: name(turn) })
  status.classList.toggle('mine', myTurn)

  const names = state.seats.map((_, i) => name(i))
  const help = state.cards
    ? (cardsHint(state.cards, mine, state.last, names) ?? '')
    : myTurn
      ? hint(state, picker.current(state))
      : ''
  const hand = handText(state)
  const board = state.cards
    ? cardsView(
        state.cards,
        mine,
        names,
        myTurn ? (move) => options.move(game, state.moveNo, encode(move)) : null,
      )
    : boardView(
        state,
        // On a shared screen, the board does not turn round for each player.
        shared ? (state.seats[0] ?? viewer) : viewer,
        picker,
        myTurn ? (move) => options.move(game, state.moveNo, move) : null,
      )
  return [
    status,
    help ? h('p', { class: 'hint muted' }, help) : null,
    board,
    hand ? h('p', { class: 'hand muted' }, hand) : null,
  ].filter((node): node is HTMLElement => node !== null)
}

/** Rematch and another game, for whoever keeps the table, once a game is over. */
export function nextButtons(host: TableHost): HTMLElement[] {
  return [
    h('button', { type: 'button', textContent: t('otherGame'), onclick: () => host.lobby() }),
    h('button', {
      type: 'button',
      class: 'primary',
      textContent: t('rematch'),
      onclick: () => host.rematch(),
    }),
  ]
}

/**
 * The notice for a game that hides something, played on one device: that its cards are open, or
 * how Sea Battle keeps each fleet hidden there (`split` on a split screen). Null for other games.
 */
export function openCardsNotice(game: GameId | null, split = false): HTMLElement | null {
  if (game === null) return null
  const text = hasHiddenCards(game)
    ? t('openCards')
    : handsOver(game)
      ? t(split ? 'hiddenFleetNotice' : 'handOverNotice')
      : ''
  return text
    ? h('p', { class: 'notice', role: 'note' } as Partial<HTMLParagraphElement>, text)
    : null
}
