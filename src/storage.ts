import { cleanName } from '@fionapreroll/p2p'
import { isToken, randomToken } from '@fionapreroll/p2p/room'
import type { Language } from './i18n'

/**
 * What this phone remembers, in the browser's local storage: the player's name, the language,
 * and the token with which a player gets their place back. Everything read is checked.
 */

const PREFIX = 'spielekiste.'

export interface Settings {
  readonly name: string
  readonly language: Language | 'auto'
}

const DEFAULTS: Settings = { name: '', language: 'auto' }

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
  const { name, language } = value as Record<string, unknown>
  return {
    name: typeof name === 'string' ? cleanName(name, '') : '',
    language: language === 'en' || language === 'de' ? language : 'auto',
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

/** This browser's own token, made once. */
export function playerToken(): string {
  const stored = read('token')
  if (isToken(stored)) return stored
  const token = randomToken()
  write('token', token)
  return token
}
