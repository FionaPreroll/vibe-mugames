import { t } from '../i18n'

type Child = Node | string | null | undefined | false

/** Builds an element: `h('button', { class: 'big', onclick }, 'Go')`. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<Omit<HTMLElementTagNameMap[K], 'style'>> & { class?: string } = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag)
  const { class: className, ...rest } = props
  Object.assign(element, rest)
  if (className) element.className = className
  for (const child of children) if (child) element.append(child)
  return element
}

/** What the screen shown does when it is left: stops a camera, for example. */
let leaving: (() => void) | null = null

/** What Android's back button does on the screen shown (see main.ts). */
export let backAction: (() => void) | null = null

/**
 * Puts a screen in place of the current one. `back` is what Android's back button does there;
 * `leave` runs when the next screen replaces this one.
 */
export function show(screen: HTMLElement, back: (() => void) | null, leave?: () => void): void {
  const app = document.getElementById('app')
  if (!app) throw new Error('No #app element')
  leaving?.()
  leaving = leave ?? null
  app.replaceChildren(screen)
  window.scrollTo?.(0, 0)
  backAction = back
}

/** A short message that fades away by itself. */
export function toast(text: string): void {
  const element = h('div', { class: 'toast', role: 'status' } as Partial<HTMLDivElement>, text)
  document.body.append(element)
  setTimeout(() => element.classList.add('gone'), 2500)
  setTimeout(() => element.remove(), 3000)
}

/** Why joining failed, for players. */
export function failureText(error: unknown): string {
  const reason = error instanceof Error ? error.message : ''
  return reason === 'full'
    ? t('full')
    : reason === 'version'
      ? t('versionMismatch')
      : t('connectFailed')
}
