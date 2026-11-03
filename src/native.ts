import { Capacitor, registerPlugin } from '@capacitor/core'

/**
 * What the Android app and the phone have beyond the page: the back button, keeping the screen
 * on and a buzz. In a browser, what it cannot do does nothing:
 * the website and the app are one codebase.
 */

/** True inside the Android app. */
export function isApp(): boolean {
  return Capacitor.isNativePlatform()
}

/** Calls back on Android's back button; `exit` leaves the app. */
export function onBackButton(callback: (exit: () => void) => void): void {
  if (!isApp()) return
  void import('@capacitor/app')
    .then(({ App }) => App.addListener('backButton', () => callback(() => void App.exitApp())))
    .catch(() => {})
}

/** The app's own plugin that keeps the screen on (KeepAwakePlugin.java). */
interface KeepAwake {
  keepAwake(): Promise<void>
  allowSleep(): Promise<void>
}

let plugin: KeepAwake | null = null
/** The plugin, registered on first use: only the app has it. */
const keepAwakePlugin = (): KeepAwake => {
  plugin ??= registerPlugin<KeepAwake>('KeepAwake')
  return plugin
}

/** The screen's wake lock in a browser, while one is held. */
let browserLock: WakeLockSentinel | null = null
/** How many screens want the screen on; it stays on while any does. */
let awake = 0

async function lockNow(): Promise<void> {
  if (isApp()) {
    await keepAwakePlugin().keepAwake()
    return
  }
  const wakeLock = navigator.wakeLock
  if (!wakeLock || document.visibilityState !== 'visible' || browserLock) return
  const lock = await wakeLock.request('screen')
  // Every screen let go while the browser was asked: then none is needed.
  if (awake === 0) return void (await lock.release())
  browserLock = lock
  // The browser lets go of it when the page is hidden, and says so.
  lock.addEventListener('release', () => {
    if (browserLock === lock) browserLock = null
  })
}

async function unlockNow(): Promise<void> {
  if (isApp()) {
    await keepAwakePlugin().allowSleep()
    return
  }
  const lock = browserLock
  browserLock = null
  await lock?.release()
}

// A browser lets go of the screen when the page is hidden: take it again on coming back.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (awake > 0 && document.visibilityState === 'visible') void lockNow().catch(() => {})
  })
}

/**
 * Keeps the screen on, as a phone that goes dark at a table drops out of it, until the function
 * returned is called. Where the browser cannot, nothing happens.
 */
export function keepScreenOn(): () => void {
  awake++
  if (awake === 1) void lockNow().catch(() => {})
  let released = false
  return () => {
    if (released) return
    released = true
    awake--
    if (awake === 0) void unlockNow().catch(() => {})
  }
}

/** A short buzz, on phones that can; elsewhere, nothing. */
export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // Some browsers refuse without a tap first: then it stays quiet.
  }
}
