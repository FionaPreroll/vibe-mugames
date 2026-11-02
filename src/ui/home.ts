import { answerOffer } from '@fionapreroll/p2p'
import { currentLanguage, type Language, setLanguage, t } from '../i18n'
import { GuestSeat, HostSeat } from '../net/session'
import { playerToken, settings, updateSettings } from '../storage'
import { codePanel } from './codes'
import { failureText, h, show } from './dom'
import { tableScreen } from './table'

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

  show(
    h(
      'div',
      { class: 'screen home' },
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
      h(
        'p',
        { class: 'muted build' },
        t('build', { version: __BUILD__.version, commit: __BUILD__.commit }),
      ),
    ),
    null,
  )
}

/** A player scans the host's code, shows their own back, and sits down once let in. */
function joinScreen(name: string): void {
  let left = false
  const panel = codePanel('offer', t('scanHost'), async (offer) => {
    try {
      const { link, code } = await answerOffer(offer)
      if (left) return link.close()
      panel.showOwn(code, t('showHost'))
      const seat = await GuestSeat.join(link, name, playerToken())
      if (left) return seat.close()
      tableScreen(seat, homeScreen)
    } catch (error) {
      if (!left) panel.status(failureText(error))
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
