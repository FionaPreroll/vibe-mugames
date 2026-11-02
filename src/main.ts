import './style.css'
import { setLanguage } from './i18n'
import { onBackButton } from './native'
import { settings } from './storage'
import { handleBack } from './ui/dom'
import { homeScreen } from './ui/home'
import { offerUpdates } from './ui/updates'
import { watchForWebUpdates } from './ui/webUpdates'

setLanguage(settings().language)
onBackButton(handleBack)
homeScreen()
// In the app: ask once about updates, then look for one at every start if the player wants.
void offerUpdates()
// On the website: tell the player when a newer build is deployed.
watchForWebUpdates()
