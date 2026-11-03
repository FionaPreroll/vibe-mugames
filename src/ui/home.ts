import { answerOffer } from '@fionapreroll/p2p'
import { currentLanguage, type Language, setLanguage, t } from '../i18n'
import { isApp } from '../native'
import { GuestSeat, HostSeat } from '../net/session'
import { playerToken, settings, updateSettings } from '../storage'
import { appBuild } from '../updates'
import { aboutScreen } from './about'
import { bluetoothJoinScreen, chooseConnection } from './bluetooth'
import { codePanel } from './codes'
import { failureText, h, show } from './dom'
import { hero } from './hero'
import { localSetup } from './local'
import { appLink, settingsScreen } from './settings'
import { tableScreen } from './table'
import { webUpdateBanner } from './webUpdates'

/** The start screen: the player's name, and opening a table or joining one. */
export function homeScreen(): void {
  const name = h('input', {
    type: 'text',
    maxLength: 16,
    value: settings().name,
  })
  // Kept as it is typed, so that it stays through a visit to the settings or another language.
  name.addEventListener('input', () => updateSettings({ name: name.value }))
  const playerName = () => {
    const chosen = name.value.trim() || (currentLanguage() === 'de' ? 'Spieler' : 'Player')
    updateSettings({ name: chosen })
    return chosen
  }
  const language = h(
    'select',
    {},
    ...(
      [
        ['auto', t('languageAuto')],
        ['en', 'English'],
        ['de', 'Deutsch'],
      ] as const
    ).map(([value, label]) => h('option', { value, textContent: label })),
  )
  language.value = settings().language
  language.addEventListener('change', () => {
    const choice = language.value as Language | 'auto'
    updateSettings({ language: choice })
    setLanguage(choice)
    homeScreen()
  })

  const web = { version: __BUILD__.version, commit: __BUILD__.commit }
  const build = h('p', { class: 'muted build' }, t('build', web))
  // In the app, its own build number too, as its updates count by it.
  if (isApp()) {
    void appBuild()
      .then(({ build: number }) => {
        build.textContent = t('appBuild', { ...web, build: number })
      })
      .catch(() => {})
  }

  show(
    h(
      'div',
      { class: 'screen home' },
      h(
        'div',
        { class: 'top-bar' },
        h('button', {
          type: 'button',
          class: 'icon',
          ariaLabel: t('settings'),
          title: t('settings'),
          textContent: '⚙',
          onclick: () => settingsScreen(homeScreen),
        }),
      ),
      webUpdateBanner(),
      h(
        'div',
        { class: 'intro' },
        hero(),
        h('h1', {}, t('title')),
        h('p', { class: 'tagline' }, t('tagline')),
      ),
      h(
        'div',
        { class: 'start' },
        h('label', {}, t('yourName'), name),
        h(
          'div',
          { class: 'buttons column' },
          h('button', {
            type: 'button',
            class: 'primary big',
            textContent: t('host'),
            onclick: () => tableScreen(new HostSeat(playerName()), homeScreen),
          }),
          h('button', {
            type: 'button',
            class: 'big',
            textContent: t('join'),
            onclick: () => void startJoin(playerName()),
          }),
          h('button', {
            type: 'button',
            class: 'big',
            textContent: t('local'),
            onclick: () => {
              // The name typed here is the first player's; none typed, none made up.
              const typed = name.value.trim()
              if (typed) updateSettings({ name: typed })
              localSetup(homeScreen)
            },
          }),
        ),
        !isApp() && appLink(),
        h('label', { class: 'language' }, t('language'), language),
        h('button', {
          type: 'button',
          class: 'link about-link',
          textContent: t('about'),
          onclick: () => aboutScreen(homeScreen),
        }),
        build,
      ),
    ),
    null,
  )
}

/** A player joins a table the way they choose: by QR code, or by Bluetooth in the app. */
async function startJoin(name: string): Promise<void> {
  const choice = await chooseConnection()
  if (choice === 'bluetooth')
    bluetoothJoinScreen(
      name,
      (seat) => tableScreen(seat, homeScreen),
      homeScreen,
      () => joinScreen(name),
    )
  else if (choice === 'qr') joinScreen(name)
}

/** A player scans the host's code, shows their own back, and sits down once let in. */
function joinScreen(name: string): void {
  let left = false
  const panel = codePanel('offer', t('scanHost'), async (offer) => {
    let answered: { close(): void } | undefined
    try {
      const { link, code } = await answerOffer(offer)
      answered = link
      if (left) return link.close()
      panel.showOwn(code, t('showHost'))
      panel.status(t('waitingForHost'))
      const seat = await GuestSeat.join(link, name, playerToken())
      if (left) return seat.close()
      tableScreen(seat, homeScreen)
    } catch (error) {
      answered?.close()
      if (!left) panel.failed(failureText(error), () => joinScreen(name))
    }
  })
  const back = () => {
    left = true
    homeScreen()
  }
  show(
    h(
      'div',
      { class: 'screen join' },
      h(
        'header',
        {},
        h('button', {
          type: 'button',
          class: 'icon',
          ariaLabel: t('back'),
          textContent: '←',
          onclick: back,
        }),
        h('h1', {}, t('join')),
      ),
      panel.element,
    ),
    back,
    () => {
      left = true
      panel.stop()
    },
  )
}
