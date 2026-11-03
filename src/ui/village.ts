import type { Move } from '../core/board'
import type { TableState } from '../core/table'
import { choices, type Role, type Story, type WolfView, waiting, winners } from '../core/werwolf'
import { type TextKey, t } from '../i18n'
import { type Picker, seatName } from './boards'
import { h } from './dom'

/**
 * Werwolf on the screen: the player's own role and what it lets them know, what happened last
 * night or on the last day, whom they may choose now, and the village with everyone still in.
 * Each phone gets only its own role from the host; a split screen hides it too, until its
 * player asks to see it.
 */

export interface VillageOptions {
  /** The player whose view this is. */
  readonly viewer: number
  /** Whether a hidden role shows for now, on a split screen. */
  readonly picker: Picker
  /** Makes a move as the viewer; null when the viewer may not move now. */
  readonly move: ((move: Move) => void) | null
  /** A screen everyone shares: players are named instead of "you". */
  readonly shared: boolean
  /** The viewer's role is hidden, as others see the same screen, unless they ask to see it. */
  readonly hideOwn: boolean
}

const ICONS: Record<Role, string> = { wolf: '🐺', seer: '🔮', healer: '🌿', villager: '🏠' }
const ROLE_NAMES: Record<Role, TextKey> = {
  wolf: 'roleWolf',
  seer: 'roleSeer',
  healer: 'roleHealer',
  villager: 'roleVillager',
}
const ROLE_HELP: Record<Role, TextKey> = {
  wolf: 'helpWolf',
  seer: 'helpSeer',
  healer: 'helpHealer',
  villager: 'helpVillager',
}
const ASK: Record<Role, TextKey> = {
  wolf: 'askWolf',
  seer: 'askSeer',
  healer: 'askHealer',
  villager: 'askVillager',
}

export const roleName = (role: Role): string => t(ROLE_NAMES[role])

/** Whether the viewer has something to choose now. */
export function villageToMove(state: TableState, village: WolfView, viewer: number): boolean {
  const mine = state.seats.indexOf(viewer)
  return state.outcome === null && mine >= 0 && choices(village, mine).length > 0
}

/**
 * The night or the day, and what it asks of the viewer, or how the game ended; `hidden` while
 * the viewer's role is hidden on a split screen.
 */
export function villageStatus(
  state: TableState,
  village: WolfView,
  viewer: number,
  hidden = false,
): string {
  if (village.winner !== null) return t(village.winner === 'wolves' ? 'wolvesWin' : 'villageWins')
  const mine = state.seats.indexOf(viewer)
  const when = t(village.phase === 'night' ? 'nightN' : 'dayN', { n: village.night })
  if (mine < 0) return `${when}: ${t('villageWatching')}`
  if (!village.alive[mine]) return `${when}: ${t('youAreOut')}`
  if (villageToMove(state, village, viewer)) {
    if (village.phase === 'day') return `${when}: ${t('askVote')}`
    // A hidden role shows nothing of what it asks: every role chooses at night.
    const role = village.roles[mine]
    return `${when}: ${t(hidden ? 'askHidden' : role ? ASK[role] : 'askVillager')}`
  }
  const left = waiting(village).length
  return `${when}: ${t(left === 1 ? 'waitingOne' : 'waitingMore', { n: left })}`
}

/** What a story's event tells everyone, such as who the wolves took. */
export function storyText(state: TableState, village: WolfView, story: Story): string {
  const who = (seat: number) => seatName(state, seat)
  const role = (seat: number) => {
    const known = village.roles[seat]
    return known ? roleName(known) : '?'
  }
  if (story.kind === 'night') {
    return story.victim === null
      ? t('storyNobody', { n: story.night })
      : t('storyTaken', { n: story.night, name: who(story.victim), role: role(story.victim) })
  }
  const count = story.votes.filter((vote) => vote === story.out).length
  return story.out === null
    ? t('storyTie', { n: story.night })
    : t('storyBanished', {
        n: story.night,
        name: who(story.out),
        votes: count,
        role: role(story.out),
      })
}

/** Who voted for whom on a day, in a line. */
function votesText(state: TableState, story: Story): string {
  if (story.kind !== 'vote') return ''
  return story.votes
    .flatMap((vote, seat) =>
      vote === null ? [] : [`${seatName(state, seat)} → ${seatName(state, vote)}`],
    )
    .join(', ')
}

/** Werwolf as one player sees it: their role, the news, their choice, and the village. */
export function villageView(
  state: TableState,
  village: WolfView,
  options: VillageOptions,
): HTMLElement[] {
  const mine = state.seats.indexOf(options.viewer)
  const over = village.winner !== null
  const hidden = options.hideOwn && !options.picker.showOwn && !over
  const news = village.story.at(-1)
  return [
    news
      ? h(
          'div',
          { class: 'news' },
          h('p', {}, storyText(state, village, news)),
          news.kind === 'vote' ? h('p', { class: 'muted votes' }, votesText(state, news)) : null,
        )
      : null,
    mine >= 0 ? roleCard(state, village, mine, options, hidden) : null,
    // A vote by day shows nothing of a role: only night's choices hide with it.
    mine >= 0 && (!hidden || village.phase === 'day')
      ? choiceList(state, village, mine, options.move)
      : null,
    villageList(state, village, mine),
    village.story.length > 1 ? storyList(state, village) : null,
    villageHelp(),
  ].filter((node): node is HTMLElement => node !== null)
}

/** The viewer's role and what it lets them know: the other wolves, or what the seer learned. */
function roleCard(
  state: TableState,
  village: WolfView,
  mine: number,
  options: VillageOptions,
  hidden: boolean,
): HTMLElement {
  const role = village.roles[mine]
  const toggle = options.hideOwn && village.winner === null ? roleToggle(options.picker) : null
  if (!role || hidden) {
    return h('div', { class: 'role hidden' }, h('p', {}, t('roleHidden')), toggle)
  }
  const name = seatName(state, mine)
  const others = (wanted: Role) =>
    village.roles.flatMap((r, seat) =>
      r === wanted && seat !== mine && village.alive[seat] ? [seatName(state, seat)] : [],
    )
  const pack = role === 'wolf' ? others('wolf') : []
  const known = village.findings.map((finding) =>
    t(finding.wolf ? 'seenWolf' : 'seenNotWolf', { name: seatName(state, finding.seat) }),
  )
  return h(
    'div',
    { class: `role role-${role}` },
    h('span', { class: 'role-icon', ariaHidden: 'true' }, ICONS[role]),
    h(
      'div',
      { class: 'role-text' },
      h(
        'strong',
        {},
        options.shared
          ? t('youAreName', { name, role: roleName(role) })
          : t('youAre', { role: roleName(role) }),
      ),
      h('p', { class: 'muted' }, t(ROLE_HELP[role])),
      pack.length > 0 ? h('p', {}, t('otherWolves', { names: pack.join(', ') })) : null,
      known.length > 0 ? h('p', {}, `${t('seerKnows')} ${known.join(' ')}`) : null,
    ),
    toggle,
  )
}

/** The players the viewer may choose now, or whom they chose. */
function choiceList(
  state: TableState,
  village: WolfView,
  mine: number,
  move: ((move: Move) => void) | null,
): HTMLElement | null {
  if (village.winner !== null || !village.alive[mine]) return null
  const chosen = village.choices[mine]
  if (chosen !== null && chosen !== undefined) {
    const key = village.phase === 'day' ? 'youVoted' : 'youChose'
    return h('p', { class: 'chosen' }, t(key, { name: seatName(state, chosen) }))
  }
  const open = choices(village, mine)
  if (open.length === 0) return null
  /** At night, wolves see whom the other wolves picked. */
  const pickedBy = (target: number) =>
    village.phase === 'night' && village.roles[mine] === 'wolf'
      ? village.choices.flatMap((choice, seat) =>
          choice === target && seat !== mine ? [seatName(state, seat)] : [],
        )
      : []
  return h(
    'div',
    { class: 'buttons choices' },
    ...open.map((target) => {
      const by = pickedBy(target)
      return h('button', {
        type: 'button',
        class: by.length > 0 ? 'picked' : '',
        textContent:
          by.length > 0
            ? `${seatName(state, target)} (${t('pickedBy', { names: by.join(', ') })})`
            : seatName(state, target),
        disabled: move === null,
        onclick: () => move?.([target]),
      })
    }),
  )
}

/** Everyone in the village: who is still in, and the roles the viewer knows. */
function villageList(state: TableState, village: WolfView, mine: number): HTMLElement {
  const won = new Set(winners(village))
  return h(
    'ul',
    { class: 'village' },
    ...village.alive.map((alive, seat) => {
      const role = village.roles[seat]
      const notes = [
        seat === mine ? t('you') : '',
        role && (seat !== mine || !alive || village.winner !== null) ? roleName(role) : '',
        alive ? '' : t('out'),
        village.done[seat] && alive && village.winner === null ? '✓' : '',
      ].filter(Boolean)
      return h(
        'li',
        { class: `${alive ? '' : 'out'}${won.has(seat) ? ' won' : ''}` },
        h(
          'span',
          { class: 'role-icon', ariaHidden: 'true' },
          role && (seat !== mine || village.winner !== null) ? ICONS[role] : '',
        ),
        h('span', { class: 'name' }, seatName(state, seat)),
        notes.length > 0 ? h('span', { class: 'muted' }, ` (${notes.join(', ')})`) : null,
      )
    }),
  )
}

/** Everything that happened so far, night by night. */
function storyList(state: TableState, village: WolfView): HTMLElement {
  return h(
    'details',
    { class: 'story' },
    h('summary', {}, t('storySoFar')),
    h('ol', {}, ...village.story.map((story) => h('li', {}, storyText(state, village, story)))),
  )
}

/** On a split screen: shows or hides the player's own role. */
function roleToggle(picker: Picker): HTMLElement {
  return h('button', {
    type: 'button',
    class: 'own-toggle',
    textContent: t(picker.showOwn ? 'hideRole' : 'showRole'),
    ariaPressed: String(picker.showOwn),
    onclick: () => {
      picker.showOwn = !picker.showOwn
      picker.onChange()
    },
  })
}

/** Whether the help is open: it stays as the player left it while the table redraws. */
let helpOpen = false

/** The roles and how to win, for players learning the game. */
function villageHelp(): HTMLElement {
  const role = (r: Role) =>
    h(
      'li',
      {},
      h('span', { class: 'role-icon', ariaHidden: 'true' }, ICONS[r]),
      h('strong', {}, `${roleName(r)}: `),
      t(ROLE_HELP[r]),
    )
  const details = h(
    'details',
    { class: 'card-help village-help', open: helpOpen },
    h('summary', {}, t('villageHelp')),
    h(
      'ul',
      {},
      h('li', {}, t('helpNight')),
      h('li', {}, t('helpDay')),
      role('wolf'),
      role('seer'),
      role('healer'),
      role('villager'),
      h('li', {}, t('helpWinning')),
    ),
  )
  details.addEventListener('toggle', () => {
    helpOpen = details.open
  })
  return details
}
