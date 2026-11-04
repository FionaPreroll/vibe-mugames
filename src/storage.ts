import { cleanName } from '@fionapreroll/p2p'
import { type CameraChoice, parseCameraChoice } from '@fionapreroll/p2p/qr'
import { isToken, randomToken } from '@fionapreroll/p2p/room'
import { type GameId, isGameId } from './core/board'
import type { Language } from './i18n'
import { DEFAULT_THEME, isThemeChoice, type ThemeChoice } from './theme'

/**
 * What this phone remembers, in the browser's local storage: the player's name, the language,
 * whether the app and the website look for updates, whether to buzz on the player's turn, the
 * games chosen lately, the colour theme, the camera last used for scanning with its zoom and
 * brightness, who last played on this device, and the token with which a player gets their place back. Everything read is
 * checked.
 */

const PREFIX = 'spielekiste.'

export interface Settings {
  readonly name: string
  readonly language: Language | 'auto'
  /** In the Android app: look for a new version at every start (see src/updates.ts). */
  readonly checkUpdates: boolean
  /** Whether the app has asked about `checkUpdates` yet, which it does once, at the first start. */
  readonly updatesAsked: boolean
  /** On the website: look now and then for a newer build, and say so (see src/webUpdates.ts). */
  readonly webUpdates: boolean
  /** The names of the players who last played on this device, as many as played. */
  readonly localNames: readonly string[]
  /** Whether they last played on a split screen, or took turns on one. */
  readonly localSplit: boolean
  /** Air hockey: a player sees the whole rink (true), or only their own half (false). */
  readonly hockeyWhole: boolean
  /** Air hockey: smooth what the network shakes up (see src/net/clock.ts), or draw it as it comes. */
  readonly hockeySmooth: boolean
  /** A buzz when it is the player's turn, on phones that can (see src/ui/attention.ts). */
  readonly vibrate: boolean
  /** The games this device chose last, newest first, which the chooser shows on top. */
  readonly recentGames: readonly GameId[]
  /** The colour theme, or 'seasons' for the one the calendar suggests (see src/theme.ts). */
  readonly theme: ThemeChoice
}

/** As many games as the chooser shows as played lately. */
export const MAX_RECENT = 3

/** As many names as play on one device at most (see src/local.ts). */
const MAX_LOCAL_NAMES = 6

const DEFAULTS: Settings = {
  name: '',
  language: 'auto',
  checkUpdates: false,
  updatesAsked: false,
  webUpdates: false,
  localNames: [],
  localSplit: false,
  hockeyWhole: true,
  hockeySmooth: false,
  vibrate: true,
  recentGames: [],
  theme: DEFAULT_THEME,
}

function read(key: string): unknown {
  try {
    const text = localStorage.getItem(PREFIX + key)
    return text === null ? undefined : JSON.parse(text)
  } catch {
    return undefined
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Private windows may refuse: then nothing is remembered.
  }
}

/** Settings from storage, checked: anything that does not fit falls back to the default. */
export function parseSettings(value: unknown): Settings {
  if (typeof value !== 'object' || value === null) return DEFAULTS
  const {
    name,
    language,
    checkUpdates,
    updatesAsked,
    webUpdates,
    localNames,
    localSplit,
    hockeyWhole,
    hockeySmooth,
    vibrate,
    recentGames,
    theme,
  } = value as Record<string, unknown>
  return {
    name: typeof name === 'string' ? cleanName(name, '') : '',
    language: language === 'en' || language === 'de' ? language : 'auto',
    checkUpdates: checkUpdates === true,
    updatesAsked: updatesAsked === true,
    webUpdates: webUpdates === true,
    localNames: Array.isArray(localNames)
      ? localNames
          .slice(0, MAX_LOCAL_NAMES)
          .map((local) => (typeof local === 'string' ? cleanName(local, '') : ''))
      : [],
    localSplit: localSplit === true,
    hockeyWhole: hockeyWhole !== false,
    hockeySmooth: hockeySmooth === true,
    vibrate: vibrate !== false,
    recentGames: Array.isArray(recentGames)
      ? [...new Set(recentGames.filter(isGameId))].slice(0, MAX_RECENT)
      : [],
    theme: isThemeChoice(theme) ? theme : DEFAULT_THEME,
  }
}

export function settings(): Settings {
  return parseSettings(read('settings'))
}

export function updateSettings(change: Partial<Settings>): Settings {
  const next = parseSettings({ ...settings(), ...change })
  write('settings', next)
  return next
}

/** Remembers a game chosen on this device, as the newest of those played lately. */
export function rememberGame(game: GameId): void {
  updateSettings({ recentGames: [game, ...settings().recentGames.filter((g) => g !== game)] })
}

/** The camera that last scanned, and its zoom and brightness, checked by the library. */
export function rememberedCamera(): CameraChoice {
  return parseCameraChoice(read('camera'))
}

export function rememberCamera(choice: CameraChoice): void {
  write('camera', parseCameraChoice(choice))
}

/** This browser's own token, made once. */
export function playerToken(): string {
  const stored = read('token')
  if (isToken(stored)) return stored
  const token = randomToken()
  write('token', token)
  return token
}
