import privacyDe from '../../PRIVACY.de.md?raw'
import privacyEn from '../../PRIVACY.md?raw'
import { currentLanguage, t } from '../i18n'
import { h, show } from './dom'
import { documentView } from './markdownView'

/**
 * The privacy policy, in the player's language: the same as PRIVACY.md and PRIVACY.de.md in the
 * repository, and as privacy.html beside the website (tools/privacyPage.ts).
 */
export function privacyScreen(onBack: () => void): void {
  show(
    h(
      'div',
      { class: 'screen privacy' },
      h(
        'header',
        {},
        h('button', {
          type: 'button',
          class: 'icon',
          ariaLabel: t('back'),
          textContent: '←',
          onclick: onBack,
        }),
        h('h1', {}, t('privacyTitle')),
      ),
      documentView(currentLanguage() === 'de' ? privacyDe : privacyEn),
    ),
    onBack,
  )
}
