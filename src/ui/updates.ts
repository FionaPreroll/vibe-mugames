import type { AppUpdates, Release } from '@fionapreroll/app-updates'
import { askAboutUpdates, type DialogOptions, offerUpdate } from '@fionapreroll/app-updates/dialog'
import { currentLanguage, t } from '../i18n'
import { settings, updateSettings } from '../storage'
import { appUpdates, checkForUpdate, updateOnStart } from '../updates'
import { h } from './dom'

/**
 * The app's update dialogs, from @fionapreroll/app-updates, in the Spielekiste's words. Android's
 * back button presses a dialog's first button (see handleBack), which closes it.
 */
function options(): DialogOptions {
  return { language: currentLanguage() }
}

/** At the app's start, with the library's dialogs: see `updateOnStart`. */
export function offerUpdates(updates?: AppUpdates): Promise<void> {
  return updateOnStart(
    { ask: () => askAboutUpdates(t, options()), offer: (release) => offer(release, updates) },
    updates,
  )
}

/** A new version: download and install it now, or later (see `offerUpdate`). */
export function offer(release: Release, updates: AppUpdates = appUpdates()): void {
  offerUpdate(updates, release, t, options())
}

/**
 * The settings' part about the app's updates: whether to look at every start, and looking now,
 * which offers what it finds whatever the switch says.
 */
export function appUpdateSettings(updates: AppUpdates = appUpdates()): HTMLElement {
  const toggle = h('input', { type: 'checkbox', checked: settings().checkUpdates })
  toggle.addEventListener('change', () =>
    updateSettings({ checkUpdates: toggle.checked, updatesAsked: true }),
  )
  const status = h('p', { class: 'status', role: 'status' } as Partial<HTMLParagraphElement>)
  const button = h('button', {
    type: 'button',
    textContent: t('updatesCheckNow'),
    onclick: async () => {
      button.disabled = true
      status.textContent = t('updatesChecking')
      const check = await checkForUpdate(updates)
      button.disabled = false
      if (check.kind === 'newer') {
        status.textContent = ''
        offer(check.release, updates)
      } else {
        status.textContent =
          check.kind === 'current'
            ? t('updatesCurrent', { build: check.installed })
            : t('updatesCheckFailed')
      }
    },
  })
  return h(
    'section',
    { class: 'app-updates' },
    h('label', { class: 'toggle' }, toggle, t('updatesSetting')),
    h('p', { class: 'muted' }, t('updatesNote')),
    h('div', { class: 'buttons' }, button),
    status,
  )
}
