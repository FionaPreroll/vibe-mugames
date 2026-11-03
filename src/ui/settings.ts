import { t } from '../i18n'
import { isApp } from '../native'
import { settings } from '../storage'
import { lookForWebUpdate } from '../webUpdates'
import { h, show } from './dom'
import { appUpdateSettings } from './updates'
import { foundNewer, setWebUpdates } from './webUpdates'

/** Where the newest build of the Android app is, with how to install it. */
export const APP_RELEASE =
  'https://github.com/FionaPreroll/vibe-mugames/releases/tag/android-latest'

/**
 * The settings: for now, the updates. In the app, the app's own (see src/ui/updates.ts); on the
 * website, its note about a newer build, and the way to the Android app.
 */
export function settingsScreen(onBack: () => void): void {
  show(
    h(
      'div',
      { class: 'screen settings' },
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
        h('h1', {}, t('settings')),
      ),
      h('h2', {}, t('updatesTitle')),
      isApp() ? appUpdateSettings() : webUpdateSettings(),
      !isApp() && h('h2', {}, t('appTitle')),
      !isApp() && appLink(),
    ),
    onBack,
  )
}

/** The website's switch for its note about a newer build, and looking now. */
export function webUpdateSettings(): HTMLElement {
  const toggle = h('input', { type: 'checkbox', checked: settings().webUpdates })
  toggle.addEventListener('change', () => setWebUpdates(toggle.checked))
  const status = h('p', { class: 'status', role: 'status' } as Partial<HTMLParagraphElement>)
  const reload = h('button', {
    type: 'button',
    class: 'primary',
    textContent: t('webUpdateReload'),
    hidden: true,
    onclick: () => location.reload(),
  })
  const button = h('button', {
    type: 'button',
    textContent: t('updatesCheckNow'),
    onclick: async () => {
      button.disabled = true
      status.textContent = t('updatesChecking')
      const check = await lookForWebUpdate()
      button.disabled = false
      if (check.kind === 'newer') foundNewer(check.build)
      reload.hidden = check.kind !== 'newer'
      status.textContent =
        check.kind === 'newer'
          ? t('webUpdateReady')
          : check.kind === 'current'
            ? t('webUpdatesCurrent')
            : t('updatesCheckFailed')
    },
  })
  return h(
    'section',
    { class: 'web-updates' },
    h('label', { class: 'toggle' }, toggle, t('webUpdatesSetting')),
    h('p', { class: 'muted' }, t('webUpdatesNote')),
    h('div', { class: 'buttons' }, button, reload),
    status,
  )
}

/** The way to the Android app, on the website. */
export function appLink(): HTMLElement {
  return h(
    'p',
    { class: 'app-link' },
    h('a', { href: APP_RELEASE, target: '_blank', rel: 'noopener', textContent: t('getApp') }),
  )
}
