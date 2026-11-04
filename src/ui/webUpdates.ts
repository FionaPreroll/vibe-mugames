import { t } from '../i18n'
import { isApp } from '../native'
import { loadNewer } from '../offline'
import { settings, updateSettings } from '../storage'
import { type WebBuild, watchWebUpdates } from '../webUpdates'
import { h } from './dom'

/**
 * The website's note about a newer build, if the player switched it on in the settings. It shows
 * on the start screen only: loading the page anew at a table would end the table for everyone.
 */

let found: WebBuild | null = null
let stopWatching: (() => void) | null = null

/**
 * Starts looking now and then, on the website only and only if the player switched it on: in the
 * app, and while developing, it does nothing.
 */
export function watchForWebUpdates(): void {
  if (isApp() || import.meta.env.DEV || !settings().webUpdates || stopWatching) return
  stopWatching = watchWebUpdates((build) => {
    stopWatching = null
    foundNewer(build)
  })
}

/** The settings' switch: looks from now on, or stops looking. */
export function setWebUpdates(on: boolean): void {
  updateSettings({ webUpdates: on })
  if (on) watchForWebUpdates()
  else {
    stopWatching?.()
    stopWatching = null
  }
}

/** Remembers a newer build and shows it on the start screen, if that is open. */
export function foundNewer(build: WebBuild): void {
  found = build
  for (const banner of document.querySelectorAll<HTMLElement>('.web-update')) fill(banner)
}

/** The note's place on the start screen, hidden until a newer build is found. */
export function webUpdateBanner(): HTMLElement {
  const banner = h('div', { class: 'web-update', hidden: true })
  fill(banner)
  return banner
}

function fill(banner: HTMLElement): void {
  if (!found) return
  banner.hidden = false
  banner.replaceChildren(
    h('p', { role: 'status' } as Partial<HTMLParagraphElement>, t('webUpdateReady')),
    h('button', {
      type: 'button',
      class: 'primary',
      textContent: t('webUpdateReload'),
      onclick: () => void loadNewer(),
    }),
  )
}
