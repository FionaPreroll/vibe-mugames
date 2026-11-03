import { DebugLog, describeError, redact } from '@fionapreroll/p2p/debug'

/**
 * The Spielekiste's log, for the debug report (see src/report.ts): the library's `DebugLog`, the
 * last few hundred lines since the app started. It says what happened, never what was said: no
 * names, tokens, codes, addresses or moves go in, and what looks like one is masked, in case an
 * error message carries it.
 */
const debugLog = new DebugLog()

export { describeError, redact }

export function log(area: string, message: string): void {
  debugLog.log(area, message)
}

export function logLines(): readonly string[] {
  return debugLog.lines()
}

/** Logs errors nobody caught, so that a report shows them too. */
export function captureErrors(target: Pick<Window, 'addEventListener'> = window): void {
  debugLog.captureErrors(target)
}

/** For tests: starts the log afresh. */
export function clearLog(): void {
  debugLog.clear()
}
