/**
 * Updates of the website: every build puts a `version.json` beside the page (see
 * vite.config.ts), naming its version, commit and time. The page now and then reads the one
 * deployed and compares it with its own build, so that a page left open on a phone learns of a
 * newer one. The app has its files inside and updates as a whole instead (see src/updates.ts).
 */

/** A build, as `__BUILD__` and `version.json` name it. */
export interface WebBuild {
  readonly version: string
  readonly commit: string
  /** When it was built, as an ISO date and time. */
  readonly time: string
}

/** The deployed `version.json`, checked: a version, a commit hash and a time. */
export function parseWebBuild(value: unknown): WebBuild | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const { version, commit, time } = value as Record<string, unknown>
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) return undefined
  if (typeof commit !== 'string' || !/^[0-9a-f]{7,40}$/.test(commit)) return undefined
  if (typeof time !== 'string' || time.length > 40 || Number.isNaN(Date.parse(time))) {
    return undefined
  }
  return { version, commit, time }
}

/** Whether the deployed build is another, later one than the build running. */
export function isNewer(deployed: WebBuild, running: WebBuild): boolean {
  return deployed.commit !== running.commit && Date.parse(deployed.time) > Date.parse(running.time)
}

/** Reads a file as JSON, past every cache. */
export type FetchJson = (url: string) => Promise<unknown>

const fetchJson: FetchJson = async (url) => {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

/** What looking at the deployed build found. */
export type WebUpdateCheck =
  | { readonly kind: 'newer'; readonly build: WebBuild }
  | { readonly kind: 'current' }
  | { readonly kind: 'failed' }

/** Looks at the deployed build: newer, the same, or failed offline or with a file not sound. */
export async function lookForWebUpdate(
  running: WebBuild = __BUILD__,
  read: FetchJson = fetchJson,
): Promise<WebUpdateCheck> {
  try {
    const deployed = parseWebBuild(await read(`./version.json?t=${Date.now()}`))
    if (!deployed) return { kind: 'failed' }
    return isNewer(deployed, running) ? { kind: 'newer', build: deployed } : { kind: 'current' }
  } catch {
    return { kind: 'failed' }
  }
}

/**
 * The deployed build, if it is newer than the one running; null if not, and also offline or when
 * the file is missing or not sound.
 */
export async function checkWebUpdate(
  running: WebBuild = __BUILD__,
  read: FetchJson = fetchJson,
): Promise<WebBuild | null> {
  const check = await lookForWebUpdate(running, read)
  return check.kind === 'newer' ? check.build : null
}

/** How often an open page looks, and at least how long apart when it comes back to the front. */
export const CHECK_EVERY_MS = 15 * 60_000
export const CHECK_AGAIN_MS = 60_000

/**
 * Looks at once, then every quarter of an hour while the page is in front, and when it comes back
 * to the front, until it finds a newer build: then it calls back once and stops. The result stops
 * it too.
 */
export function watchWebUpdates(
  onNewer: (build: WebBuild) => void,
  running: WebBuild = __BUILD__,
  read: FetchJson = fetchJson,
): () => void {
  let stopped = false
  let looking = false
  let last = 0
  const look = async () => {
    if (stopped || looking || document.visibilityState !== 'visible') return
    looking = true
    last = Date.now()
    const found = await checkWebUpdate(running, read)
    looking = false
    if (!found || stopped) return
    stop()
    onNewer(found)
  }
  const onVisible = () => {
    if (Date.now() - last >= CHECK_AGAIN_MS) void look()
  }
  const timer = setInterval(() => void look(), CHECK_EVERY_MS)
  document.addEventListener('visibilitychange', onVisible)
  const stop = () => {
    stopped = true
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
  }
  void look()
  return stop
}
