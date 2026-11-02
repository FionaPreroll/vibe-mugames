import { GAME_IDS } from '../core/board'
import { GAMES } from '../core/games'
import type { TableState } from '../core/table'
import { t } from '../i18n'
import { HostSeat, type Seat } from '../net/session'
import { boardView, handText, hint, Picker, seatName, symbol } from './boards'
import { codePanel } from './codes'
import { failureText, h, show, toast } from './dom'

/**
 * The table, on every phone: who sits at it, the lobby or the game on it, and what comes next.
 * The host chooses the games and adds players; everyone at the board makes their moves here.
 */
export function tableScreen(seat: Seat, onLeave: () => void): void {
  const players = h('ul', { class: 'players' })
  const main = h('div', { class: 'main' })
  const status = h('p', { class: 'status turn', role: 'status' } as Partial<HTMLParagraphElement>)
  const actions = h('div', { class: 'buttons' })
  const picker = new Picker()
  let gone = false
  /** What the screen shows now: players' phones hear the same table ten times a second. */
  let shown = ''

  const leave = () => {
    gone = true
    seat.close()
    onLeave()
  }

  const render = () => {
    if (gone) return
    const state = seat.state()
    if (!state) return
    const drawn = JSON.stringify([state, picker.current(state)])
    if (drawn === shown) return
    shown = drawn
    players.replaceChildren(
      ...state.players.map((player) => {
        const marks = [player.id === seat.id ? t('you') : '', player.away ? t('away') : ''].filter(
          Boolean,
        )
        const place = state.seats.indexOf(player.id)
        return h(
          'li',
          { class: player.away ? 'away' : '' },
          place >= 0
            ? h(
                'span',
                { class: `piece seat-${place}` },
                state.game === 'tictactoe' ? symbol(place) : '●',
              )
            : null,
          h('span', { class: 'name' }, player.name),
          marks.length > 0 ? h('span', { class: 'muted' }, ` (${marks.join(', ')})`) : null,
          h('span', { class: 'score' }, String(state.scores[player.id] ?? 0)),
        )
      }),
    )
    main.replaceChildren(...(state.game === null ? lobby(state) : game(state)))
  }

  const lobby = (state: TableState): Node[] => {
    const here = state.players.filter((p) => !p.away).length
    if (!(seat instanceof HostSeat)) {
      const host = state.players.find((p) => p.id === 0)?.name ?? '?'
      status.textContent = t('hostChooses', { host })
      actions.replaceChildren()
      return [status]
    }
    status.textContent = here < 2 ? t('needPlayers') : t('chooseGame')
    actions.replaceChildren()
    const games = h(
      'div',
      { class: 'games' },
      ...GAME_IDS.map((id) =>
        h('button', {
          type: 'button',
          class: 'game-choice',
          textContent: t(id),
          disabled: here < GAMES[id].seats,
          onclick: () => seat.choose(id),
        }),
      ),
    )
    return [status, games]
  }

  const game = (state: TableState): Node[] => {
    const game = state.game
    if (game === null) return []
    const name = (seatNo: number) => seatName(state, seatNo)
    const mine = state.seats.indexOf(seat.id)
    const turn = state.position?.turn ?? 0
    const myTurn = state.outcome === null && mine >= 0 && turn === mine
    const taking = state.position?.phase === 'remove'
    if (state.outcome === 'draw') status.textContent = t('draw')
    else if (state.outcome)
      status.textContent =
        state.outcome.winner === mine
          ? t('youWin')
          : t('theyWin', { name: name(state.outcome.winner) })
    else if (taking)
      status.textContent = myTurn
        ? t('youTake', { name: name(1 - turn) })
        : t('theyTake', { name: name(turn) })
    else if (mine < 0) status.textContent = t('watching', { a: name(0), b: name(1) })
    else status.textContent = myTurn ? t('yourTurn') : t('theirTurn', { name: name(turn) })
    status.classList.toggle('mine', myTurn)
    const help = myTurn ? hint(state, picker.current(state)) : ''
    const hand = handText(state)

    if (seat instanceof HostSeat && state.outcome !== null) {
      actions.replaceChildren(
        h('button', { type: 'button', textContent: t('otherGame'), onclick: () => seat.lobby() }),
        h('button', {
          type: 'button',
          class: 'primary',
          textContent: t('rematch'),
          onclick: () => seat.rematch(),
        }),
      )
    } else if (state.outcome !== null) {
      const host = state.players.find((p) => p.id === 0)?.name ?? '?'
      actions.replaceChildren(h('p', { class: 'muted' }, t('waitForHost', { host })))
    } else actions.replaceChildren()

    const board = boardView(
      state,
      seat.id,
      picker,
      myTurn ? (move) => seat.move(game, state.moveNo, move) : null,
    )
    return [
      h('h2', {}, t(game)),
      status,
      help ? h('p', { class: 'hint muted' }, help) : null,
      board,
      hand ? h('p', { class: 'hand muted' }, hand) : null,
      actions,
    ].filter((node): node is HTMLElement => node !== null)
  }

  seat.onChange = render
  picker.onChange = render
  seat.onLost = (ended) => {
    if (gone) return
    gone = true
    toast(t(ended ? 'hostClosed' : 'hostLeft'))
    onLeave()
  }
  if (seat instanceof HostSeat) {
    seat.onJoin = (name, rejoined) => toast(t(rejoined ? 'rejoined' : 'joined', { name }))
  }

  const header = h(
    'header',
    {},
    h('button', {
      type: 'button',
      class: 'icon',
      ariaLabel: seat.isHost ? t('closeTable') : t('leaveTable'),
      textContent: '×',
      onclick: leave,
    }),
    h('h1', {}, t('title')),
    seat instanceof HostSeat
      ? h('button', {
          type: 'button',
          class: 'add',
          textContent: t('addPlayer'),
          onclick: () => addPlayer(seat),
        })
      : null,
  )
  show(
    h('div', { class: 'screen table' }, header, main, h('h3', {}, t('players')), players),
    // Android's back button leaves only a player's table: a host's would end the game.
    seat.isHost ? null : leave,
  )
  render()
}

/** The host lets one more player in: shows its code, then scans the player's. */
function addPlayer(seat: HostSeat): void {
  let closed = false
  let cancelPairing = () => {}
  const close = () => {
    if (closed) return
    closed = true
    panel.stop()
    cancelPairing()
    modal.remove()
  }
  const panel = codePanel('answer', t('showPlayer'), (answer) => {
    panel.status(t('connecting'))
    pairing
      .then((p) => p.accept(answer))
      .then(close)
      .catch((error: unknown) => {
        if (!closed) panel.status(failureText(error))
      })
  })
  const pairing = seat.pair()
  pairing
    .then((p) => {
      cancelPairing = p.cancel
      if (closed) p.cancel()
      else panel.showOwn(p.code, t('showPlayer'))
    })
    .catch((error: unknown) => panel.status(failureText(error)))
  const modal = h(
    'div',
    { class: 'modal' },
    h(
      'div',
      { class: 'card' },
      h('h2', {}, t('addPlayer')),
      panel.element,
      h(
        'div',
        { class: 'buttons' },
        h('button', { type: 'button', textContent: t('cancel'), onclick: close }),
      ),
    ),
  )
  document.body.append(modal)
}
