import { Nearby } from '@fionapreroll/p2p-nearby'
import { log } from './log'
import { TICK_MS } from './net/session'

export {
  NearbyHosting,
  NearbySearch,
  NearbyStartError,
  type Peer,
} from '@fionapreroll/p2p-nearby'

/**
 * Bluetooth between phones in the Android app, from `@fionapreroll/p2p-nearby` (Google's Nearby
 * Connections), which also holds its flow: `NearbyHosting` for the host, `NearbySearch` for the
 * player. Only the app has it: in a browser, players pair by QR code.
 */

/** Spielekiste phones find only each other. */
export const SERVICE_ID = 'io.github.fionapreroll.spielekiste.table'

let shared: Nearby | undefined

/**
 * A Bluetooth player gets every state the host sends, as a player over Wi-Fi does: 30 a second
 * in a game in real time, instead of the library's 15. At 15, a phone's debug report showed air
 * hockey taking 7.5 kB a second from the host, far below what Bluetooth carries, while every
 * state skipped adds to how late the game is drawn: 33 ms on average. When the radio is busy, Nearby drops states rather than queueing
 * them (see `NearbyRules.FastLanes` in the library).
 */
export const BLUETOOTH_STATE_INTERVAL_MS = TICK_MS

/** The app's one Nearby, made when first needed. */
export function bluetooth(): Nearby {
  shared ??= new Nearby({
    serviceId: SERVICE_ID,
    stateIntervalMs: BLUETOOTH_STATE_INTERVAL_MS,
    log: (line) => log('bluetooth', line),
  })
  return shared
}
