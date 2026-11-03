import type { CapacitorConfig } from '@capacitor/cli'

/**
 * The Android app: the web build (`dist`) packed into a native app, which shows it in Android's
 * WebView. See "Android app" in the README.
 */
const config: CapacitorConfig = {
  appId: 'io.github.fionapreroll.spielekiste',
  appName: 'Spielekiste',
  webDir: 'dist',
  android: {
    // The page draws its own dark background: no white flash while the WebView starts.
    backgroundColor: '#1d2b3a',
  },
  plugins: {
    // The only releases the app's updates read and download from (@fionapreroll/app-updates).
    AppUpdater: { releases: 'https://github.com/FionaPreroll/vibe-mugames/releases/' },
  },
}

export default config
