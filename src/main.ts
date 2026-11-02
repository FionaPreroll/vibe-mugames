import './style.css'
import { setLanguage } from './i18n'
import { onBackButton } from './native'
import { settings } from './storage'
import { backAction } from './ui/dom'
import { homeScreen } from './ui/home'

setLanguage(settings().language)
// Back goes where the screen's own back button goes; at a host's table it does nothing, as it
// would end the game for everyone; on the start screen it leaves the app.
onBackButton((exit) => {
  const modal = document.querySelector('.modal')
  if (modal) return modal.querySelector<HTMLButtonElement>('.buttons button')?.click()
  if (backAction) backAction()
  else if (document.querySelector('.home')) exit()
})
homeScreen()
