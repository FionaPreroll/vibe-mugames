import { answerOffer } from '@fionapreroll/p2p'
import { currentLanguage, type Language, setLanguage, t } from '../i18n'
import { isApp } from '../native'
import { GuestSeat, HostSeat } from '../net/session'
import { playerToken, settings, updateSettings } from '../storage'
import { AppUpdater } from '../updates'
import { codePanel } from './codes'
import { failureText, h, show } from './dom'
import { tableScreen } from './table'
import { updatesSection } from './updates'
import { webUpdateBanner } from './webUpdates'

/** The start screen: the player's name, and opening a table or joining one. */
export function homeScreen(): void {
  const name = h('input', {
    type: 'text',
    maxLength: 16,
    value: settings().name,
  })
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
    void AppUpdater.info()
      .then(({ build: number }) => {
        build.textContent = t('appBuild', { ...web, build: number })
      })
      .catch(() => {})
  }

  show(
    h(
      'div',
      { class: 'screen home' },
      webUpdateBanner(),
      h('h1', {}, t('title')),
      h('p', { class: 'tagline' }, t('tagline')),
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
          onclick: () => joinScreen(playerName()),
        }),
      ),
      h('label', { class: 'language' }, t('language'), language),
      isApp() && updatesSection(),
      build,
    ),
    null,
  )
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
