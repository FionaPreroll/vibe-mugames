import { t } from '../i18n'
import { isApp } from '../native'
import { type WebBuild, watchWebUpdates } from '../webUpdates'
import { h } from './dom'

/**
 * The website's note about a newer build. It shows on the start screen only: loading the page
 * anew at a table would end the table for everyone.
 */

let found: WebBuild | null = null

/** Starts looking, on the website only: in the app, and while developing, it does nothing. */
export function watchForWebUpdates(): void {
  if (isApp() || import.meta.env.DEV) return
  watchWebUpdates(foundNewer)
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
      onclick: () => location.reload(),
    }),
  )
}
