import { Capacitor } from '@capacitor/core'

/**
 * What the Android app has beyond the browser: its back button. In a browser, nothing happens:
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
