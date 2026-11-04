import './style.css'
import './themes.css'
import { setLanguage } from './i18n'
import { captureErrors, log } from './log'
import { isApp, onBackButton } from './native'
import { keepOffline } from './offline'
import { settings } from './storage'
import { handleBack } from './ui/dom'
import { homeScreen } from './ui/home'
import { applyTheme } from './ui/theme'
import { offerUpdates } from './ui/updates'
import { watchForWebUpdates } from './ui/webUpdates'

captureErrors()
log('app', `started ${__BUILD__.version} (${__BUILD__.commit})`)
setLanguage(settings().language)
applyTheme(settings().theme)
onBackButton(handleBack)
homeScreen()
// In the app: ask once about updates, then look for one at every start if the player wants.
void offerUpdates()
// On the website: tell the player when a newer build is deployed.
watchForWebUpdates()
// On the website: keep it for offline use, so it starts on a hotspot without internet and can be
// installed. The app has its files inside; a service worker would only keep a second copy.
if (import.meta.env.PROD && !isApp()) void keepOffline()
