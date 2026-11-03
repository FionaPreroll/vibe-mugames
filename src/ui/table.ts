import { isLiveGame } from '../core/board'
import type { TableState } from '../core/table'
import { t } from '../i18n'
import { HostSeat, type Seat } from '../net/session'
import { Picker } from './boards'
import { codePanel } from './codes'
import { failureText, h, show, toast } from './dom'
import { gameChoices, gameView, nextButtons, playerItems } from './game'
import { LiveSlot } from './live'
import { gameTitle } from './rules'

/**
 * The table, on every phone: who sits at it, the lobby or the game on it, and what comes next.
 * The host chooses the games and adds players; everyone at the board makes their moves here.
 */
export function tableScreen(seat: Seat, onLeave: () => void): void {
  const players = h('ul', { class: 'players' })
  const main = h('div', { class: 'main' })
  const actions = h('div', { class: 'buttons' })
  const picker = new Picker()
  const live = new LiveSlot({
    steers: [seat.id],
    send: (_, values) => seat.input(values),
    local: false,
    stop: seat instanceof HostSeat ? () => seat.lobby() : undefined,
  })
  let gone = false
  /**
   * What the screen shows now: players' phones hear the same table ten times a second, and
   * 30 times in a game in real time, whose field draws itself.
   */
  let shown = ''

  const leave = () => {
    gone = true
    live.stop()
    seat.close()
    onLeave()
  }

  const render = () => {
    if (gone) return
    const state = seat.state()
    if (!state) return
    const drawn = JSON.stringify([{ ...state, race: null, rink: null }, picker.shown(state)])
    live.update(state)
    if (drawn === shown) return
    shown = drawn
    players.replaceChildren(
      ...playerItems(state, (player) => [
        player.id === seat.id ? t('you') : '',
        player.away ? t('away') : '',
      ]),
    )
    main.replaceChildren(...(state.game === null ? lobby(state) : game(state)))
  }

  const lobby = (state: TableState): Node[] => {
    const status = h('p', { class: 'status turn', role: 'status' } as Partial<HTMLParagraphElement>)
    actions.replaceChildren()
    if (!(seat instanceof HostSeat)) {
      const host = state.players.find((p) => p.id === 0)?.name ?? '?'
      status.textContent = t('hostChooses', { host })
      return [status, gameChoices(state, null, false)]
    }
    const here = state.players.filter((p) => !p.away).length
    status.textContent = here < 2 ? t('needPlayers') : t('chooseGame')
    return [status, gameChoices(state, seat, false)]
  }

  const game = (state: TableState): Node[] => {
    if (state.game === null) return []
    if (seat instanceof HostSeat && state.outcome !== null) {
      actions.replaceChildren(...nextButtons(seat))
    } else if (state.outcome !== null) {
      const host = state.players.find((p) => p.id === 0)?.name ?? '?'
      actions.replaceChildren(h('p', { class: 'muted' }, t('waitForHost', { host })))
    } else if (
      seat instanceof HostSeat &&
      isLiveGame(state.game) &&
      // A host at the rink stops the game on their half, which covers the screen.
      !(state.game === 'airhockey' && state.seats.includes(seat.id))
    ) {
      actions.replaceChildren(
        h('button', { type: 'button', textContent: t('stopGame'), onclick: () => seat.lobby() }),
      )
    } else actions.replaceChildren()
    return [
      gameTitle(state.game),
      ...gameView(state, {
        viewer: seat.id,
        picker,
        move: (game, moveNo, move) => seat.move(game, moveNo, move),
        live,
      }),
      actions,
    ]
  }

  seat.onChange = render
  picker.onChange = render
  seat.onLost = (ended) => {
    if (gone) return
    gone = true
    live.stop()
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
        if (!closed) panel.failed(failureText(error), retry)
      })
  })
  // A new invitation: the player has to scan or paste its code again.
  const retry = () => {
    close()
    addPlayer(seat)
  }
  const pairing = seat.pair()
  pairing
    .then((p) => {
      cancelPairing = p.cancel
      if (closed) p.cancel()
      else panel.showOwn(p.code, t('showPlayer'))
    })
    .catch((error: unknown) => panel.failed(failureText(error), retry))
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
