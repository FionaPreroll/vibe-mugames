import { cleanName } from '@fionapreroll/p2p'
import { type CameraChoice, parseCameraChoice } from '@fionapreroll/p2p/qr'
import { isToken, randomToken } from '@fionapreroll/p2p/room'
import type { Language } from './i18n'

/**
 * What this phone remembers, in the browser's local storage: the player's name, the language,
 * whether the app and the website look for updates, the camera last used for scanning with its zoom and
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
}

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
  const { name, language, checkUpdates, updatesAsked, webUpdates, localNames, localSplit } =
    value as Record<string, unknown>
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
