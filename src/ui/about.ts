import changelog from '../../CHANGELOG.md?raw'
import { t } from '../i18n'
import { type Block, type Inline, parseMarkdown } from '../markdown'
import { isApp } from '../native'
import { appBuild } from '../updates'
import { h, show } from './dom'
import { blockNode, inlineNode, link } from './markdownView'
import { privacyScreen } from './privacy'

export const REPOSITORY = 'https://github.com/FionaPreroll/vibe-mugames'
export const WEBSITE = 'https://fionapreroll.github.io/vibe-mugames/'
/** Where players write to, about the Spielekiste; the privacy policy names it too. */
export const CONTACT = 'fipreroll+app@gmail.com'

/** A package in the bundle, as the build lists it in licenses.json (see tools/licenses.ts). */
export interface License {
  readonly name: string
  readonly version: string
  readonly license: string
  readonly homepage: string | null
  readonly text: string
}

/** What the Android app carries besides the web build, from its Gradle files. */
export const NATIVE: readonly { name: string; license: string; url: string }[] = [
  {
    name: 'Capacitor for Android',
    license: 'MIT',
    url: 'https://github.com/ionic-team/capacitor',
  },
  {
    name: 'Capacitor App plugin',
    license: 'MIT',
    url: 'https://github.com/ionic-team/capacitor-plugins',
  },
  {
    name: 'Apache Cordova for Android',
    license: 'Apache-2.0',
    url: 'https://github.com/apache/cordova-android',
  },
  {
    name: 'AndroidX (AppCompat, Core, Activity, Fragment, CoordinatorLayout, WebKit, SplashScreen)',
    license: 'Apache-2.0',
    url: 'https://developer.android.com/jetpack/androidx',
  },
]

/**
 * About the Spielekiste: which build this is, how to reach the developer, the privacy policy,
 * what changed from version to version (the changelog, in English), and the other people's
 * code inside, with their licenses.
 */
export function aboutScreen(onBack: () => void): void {
  const licenses = h('div', { class: 'licenses' }, h('p', { class: 'muted' }, '…'))
  const web = {
    version: __BUILD__.version,
    commit: __BUILD__.commit,
    date: __BUILD__.time.slice(0, 10),
  }
  const build = h('p', { class: 'muted about-build' }, t('aboutBuild', web))
  // In the app, its own build number too, as its updates count by it.
  if (isApp()) {
    void appBuild()
      .then(({ build: number }) => {
        build.textContent = t('aboutAppBuild', { ...web, build: number })
      })
      .catch(() => {})
  }
  const again = () => aboutScreen(onBack)
  show(
    h(
      'div',
      { class: 'screen about' },
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
        h('h1', {}, t('aboutTitle')),
      ),
      h('p', {}, t('tagline')),
      build,
      // A mail link opens the mail app in place, in the app as in a browser: no new window.
      h(
        'p',
        {},
        `${t('aboutContact')} `,
        h('a', { href: `mailto:${CONTACT}`, textContent: CONTACT }),
      ),
      h('p', {}, link(REPOSITORY, t('aboutSource'))),
      isApp() ? h('p', {}, link(WEBSITE, t('aboutWebsite'))) : null,
      h('h2', {}, t('privacyTitle')),
      h('p', {}, t('privacyShort')),
      h(
        'p',
        {},
        h('button', {
          type: 'button',
          class: 'link',
          textContent: t('privacyTitle'),
          onclick: () => privacyScreen(again),
        }),
      ),
      h('h2', {}, t('changelogTitle')),
      t('changelogNote') ? h('p', { class: 'muted' }, t('changelogNote')) : null,
      changelogView(changelog),
      h('h2', {}, t('licensesTitle')),
      h('p', { class: 'muted' }, t('licensesNote')),
      licenses,
      isApp() ? h('p', { class: 'muted' }, t('licensesNative')) : null,
      isApp() ? nativeList() : null,
      h('p', { class: 'muted' }, t('aboutLibrary')),
    ),
    onBack,
  )
  void loadLicenses().then((list) => {
    licenses.replaceChildren(
      list === null
        ? h('p', { class: 'muted' }, t('licensesMissing'))
        : h('ul', { class: 'license-list' }, ...list.map(licenseItem)),
    )
  })
}

/** The changelog, a version to a section, the newest open. */
export function changelogView(source: string): HTMLElement {
  const sections: { title: Inline[]; blocks: Block[] }[] = []
  for (const block of parseMarkdown(source)) {
    if (block.kind === 'heading' && block.level === 2)
      sections.push({ title: block.content, blocks: [] })
    else if (block.kind !== 'heading' || block.level > 2) sections.at(-1)?.blocks.push(block)
  }
  // Nothing unreleased yet: that section stays out.
  const shown = sections.filter((section) => section.blocks.length > 0)
  return h(
    'div',
    { class: 'changelog' },
    ...shown.map((section, index) =>
      h(
        'details',
        { open: index === 0 },
        h(
          'summary',
          {},
          // What is not in a numbered version yet is what players have now.
          ...(sectionTitle(section.title) === 'Unreleased'
            ? [t('changelogUnreleased')]
            : section.title.map(inlineNode)),
        ),
        ...section.blocks.map(blockNode),
      ),
    ),
  )
}

function sectionTitle(title: Inline[]): string {
  return title.map((part) => part.text).join('')
}

/** The list the build wrote, checked; null where there is none, as with `pnpm dev`. */
export async function loadLicenses(): Promise<License[] | null> {
  try {
    const response = await fetch('./licenses.json')
    if (!response.ok) return null
    return parseLicenses(await response.json())
  } catch {
    return null
  }
}

/** licenses.json, checked: the entries that fit, or null if it is no list at all. */
export function parseLicenses(value: unknown): License[] | null {
  return Array.isArray(value) ? value.filter(isLicense) : null
}

function isLicense(value: unknown): value is License {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.name === 'string' &&
    typeof v.version === 'string' &&
    typeof v.license === 'string' &&
    typeof v.text === 'string' &&
    (v.homepage === null || (typeof v.homepage === 'string' && v.homepage.startsWith('https://')))
  )
}

function licenseItem(license: License): HTMLElement {
  return h(
    'li',
    {},
    h(
      'details',
      {},
      h('summary', {}, h('strong', {}, license.name), ` ${license.version} · ${license.license}`),
      license.homepage ? h('p', {}, link(license.homepage, license.homepage)) : null,
      h('pre', { class: 'license-text' }, license.text),
    ),
  )
}

function nativeList(): HTMLElement {
  return h(
    'ul',
    { class: 'license-list' },
    ...NATIVE.map((item) =>
      h('li', {}, h('strong', {}, item.name), ' · ', link(item.url, item.license)),
    ),
  )
}
