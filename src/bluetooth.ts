import { Nearby } from '@fionapreroll/p2p-nearby'
import { log } from './log'

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

/** The app's one Nearby, made when first needed. */
export function bluetooth(): Nearby {
  shared ??= new Nearby({ serviceId: SERVICE_ID, log: (line) => log('bluetooth', line) })
  return shared
}
