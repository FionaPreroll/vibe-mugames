import { bluetooth, NearbyHosting, NearbySearch, NearbyStartError, type Peer } from '../bluetooth'
import { t } from '../i18n'
import { isApp } from '../native'
import { GuestSeat, type HostSeat } from '../net/session'
import { playerToken } from '../storage'
import { failureText, h, show } from './dom'

/**
 * Bluetooth in the Android app: how the phones connect, the host's dialog for letting players
 * in, and the player's screen for finding a table nearby. Both phones show the same code for each
 * connection; the host lets a player in only after comparing it, so nobody else nearby slips in.
 * The flow is `@fionapreroll/p2p-nearby`'s (`NearbyHosting`, `NearbySearch`); these are its
 * screens.
 */

export type ConnectionChoice = 'qr' | 'bluetooth'

/**
 * How the phones connect: by QR code over a Wi-Fi or hotspot, which every phone and browser can,
 * or by Bluetooth, which needs the app on both phones. Only the app asks; a browser always takes
 * the QR code. Null if the player backs out.
 */
export function chooseConnection(): Promise<ConnectionChoice | null> {
  if (!isApp()) return Promise.resolve('qr')
  return new Promise((resolve) => {
    const choose = (choice: ConnectionChoice | null) => () => {
      modal.remove()
      resolve(choice)
    }
    const option = (choice: ConnectionChoice, label: string, note: string) =>
      h(
        'button',
        { type: 'button', class: 'connection', onclick: choose(choice) },
        h('strong', {}, label),
        h('span', { class: 'muted' }, note),
      )
    const modal = h(
      'div',
      { class: 'modal' },
      h(
        'div',
        { class: 'card' },
        h('h2', {}, t('chooseConnection')),
        h(
          'div',
          { class: 'connections' },
          option('qr', t('viaQr'), t('viaQrNote')),
          option('bluetooth', t('viaBluetooth'), t('viaBluetoothNote')),
        ),
        // First, so that Android's back button cancels (see handleBack).
        h(
          'div',
          { class: 'buttons' },
          h('button', { type: 'button', textContent: t('cancel'), onclick: choose(null) }),
        ),
      ),
    )
    document.body.append(modal)
  })
}

/** Why Bluetooth did not start, for the player, with Nearby's code for anyone who helps. */
export function startErrorText(error: unknown): string {
  if (!(error instanceof NearbyStartError)) return t('btOff')
  const text = {
    permission: t('btPermission'),
    unavailable: t('btUnavailable'),
    'bluetooth-off': t('btBluetoothOff'),
    'location-off': t('btLocationOff'),
    radio: t('btOff'),
  }[error.kind]
  return `${text} (${error.code})`
}

/**
 * The host makes the table visible to phones nearby, and lets in the players who ask and show
 * the same code. The dialog stays open for more, until the host closes it; the table says who
 * sat down.
 */
export function bluetoothHostDialog(seat: HostSeat): void {
  const hosting = new NearbyHosting(
    bluetooth(),
    seat.name,
    (connection) => seat.room.attach(connection).joined,
  )
  const list = h('ul', { class: 'requests' })
  const status = h(
    'p',
    { class: 'status', role: 'status' } as Partial<HTMLParagraphElement>,
    t('btHostWaiting'),
  )

  const close = () => {
    void hosting.close()
    modal.remove()
  }

  hosting.onChange = () => {
    list.replaceChildren(
      ...hosting.requests().map(({ request, status: progress, error }) => {
        const busy = progress === 'joining'
        return h(
          'li',
          { class: 'request-row' },
          h(
            'span',
            { class: 'request' },
            t('btRequest', { name: request.name, digits: request.digits }),
          ),
          busy || progress === 'failed'
            ? h('span', { class: 'muted' }, busy ? t('connecting') : failureText(error))
            : null,
          h(
            'div',
            { class: 'buttons' },
            h('button', {
              type: 'button',
              textContent: t('btReject'),
              disabled: busy,
              onclick: () => hosting.reject(request.endpointId),
            }),
            progress === 'failed'
              ? null
              : h('button', {
                  type: 'button',
                  class: 'primary',
                  textContent: t('btAccept'),
                  disabled: busy,
                  onclick: () => hosting.accept(request.endpointId),
                }),
          ),
        )
      }),
    )
  }

  const modal = h(
    'div',
    { class: 'modal bluetooth' },
    h(
      'div',
      { class: 'card' },
      h('h2', {}, t('addPlayer')),
      status,
      h('p', { class: 'muted' }, t('btCheckCode')),
      list,
      h(
        'div',
        { class: 'buttons' },
        h('button', { type: 'button', textContent: t('close'), onclick: close }),
      ),
    ),
  )
  document.body.append(modal)
  hosting.started.catch((error: unknown) => {
    if (!hosting.closed) status.textContent = startErrorText(error)
  })
}

/**
 * A player looks for tables nearby and asks one to let them in; `onSeated` gets the seat, and
 * `onLeave` runs when the player goes back. `viaQr` switches to the QR code instead.
 */
export function bluetoothJoinScreen(
  name: string,
  onSeated: (seat: GuestSeat) => void,
  onLeave: () => void,
  viaQr: () => void,
): void {
  const search = new NearbySearch(
    bluetooth(),
    name,
    (connection) => GuestSeat.join(connection, name, playerToken()),
    { discard: (seat) => seat.close() },
  )
  const hosts = h('ul', { class: 'hosts' })
  const status = h('p', { class: 'status', role: 'status' } as Partial<HTMLParagraphElement>)

  const hostButton = (host: Peer) =>
    h(
      'li',
      {},
      h('button', {
        type: 'button',
        class: 'host',
        textContent: host.name,
        onclick: () => void search.choose(host),
      }),
    )
  const again = () =>
    h('button', { type: 'button', textContent: t('tryAgain'), onclick: () => search.again() })

  search.onChange = () => {
    const state = search.state()
    const looking = state.phase === 'looking' || state.phase === 'starting'
    hosts.hidden = !looking
    hosts.replaceChildren(...search.hosts().map(hostButton))
    switch (state.phase) {
      case 'starting':
        status.textContent = t('btSearching')
        break
      case 'looking':
        status.textContent = search.hosts().length > 0 ? t('btSearching') : t('btNoneYet')
        break
      case 'unavailable':
        status.replaceChildren(startErrorText(state.error), ' ', again())
        break
      case 'asking':
        status.textContent =
          state.digits === null
            ? t('connecting')
            : t('btWaitHost', { digits: state.digits, host: state.host.name })
        break
      case 'refused':
        status.replaceChildren(t('btRejected'), ' ', again())
        break
      case 'failed':
        status.replaceChildren(failureText(state.error), ' ', again())
        break
      default:
        break
    }
  }
  search.onJoined = (seat) => onSeated(seat)

  const back = () => {
    void search.leave()
    onLeave()
  }
  show(
    h(
      'div',
      { class: 'screen join bluetooth' },
      h(
        'header',
        {},
        h('button', {
          type: 'button',
          class: 'icon',
          ariaLabel: t('back'),
          textContent: '←',
          onclick: back,
        }),
        h('h1', {}, t('join')),
      ),
      status,
      hosts,
      h('button', {
        type: 'button',
        class: 'link',
        textContent: t('viaQrInstead'),
        onclick: () => {
          void search.leave()
          viaQr()
        },
      }),
    ),
    back,
    () => void search.leave(),
  )
  search.onChange()
}
