import type { ConnectionDetails } from '@fionapreroll/p2p'
import type { NetLog } from '@fionapreroll/p2p/debug'
import type { ConnectionTest, ConnectionTestRun } from '@fionapreroll/p2p/room'

/**
 * The connections of the table played at last, or now, on this phone, for the connection view
 * and the debug report: the room's samples (see `NetLog` in `@fionapreroll/p2p/debug`), what each
 * connection's transport tells while it lasts, and the last connection test.
 */
export interface NetSource {
  readonly net: NetLog
  /** The other phones connected now, by player id: the host's players, or the host. */
  peers(): readonly number[]
  /** What the transport tells about the connection to one of them. */
  details(peer: number): Promise<ConnectionDetails | null>
  /** The last connection test: the host's run, or this player's result. */
  lastTest(): ConnectionTestRun | ConnectionTest | null
  /** On the host's phone: tests every player's connection for five seconds. */
  testConnections?(): Promise<ConnectionTestRun>
}

let latest: NetSource | null = null

/** A table was opened or joined: its connections are the ones the report tells from now on. */
export function rememberNet(source: NetSource): void {
  latest = source
}

/** The connections of the table played at last, or now; null before the first. */
export function latestNet(): NetSource | null {
  return latest
}
