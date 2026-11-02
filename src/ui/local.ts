import type { GameId, Move } from '../core/board'
import { handsOver } from '../core/games'
import { playerToMove, type TableState } from '../core/table'
import { t } from '../i18n'
import { LocalTable, MAX_LOCAL, MAX_SPLIT, MIN_LOCAL } from '../local'
import { settings, updateSettings } from '../storage'
import { Picker } from './boards'
import { h, show } from './dom'
import { gameChoices, gameView, nextButtons, openCardsNotice, playerItems, seatMark } from './game'

/**
 * Playing on one device: everyone takes turns on one screen, or the screen is split into a
 * part for each player, which they can turn round to face them. Games with hidden cards are
 * played with open cards there, and say so. Sea Battle's fleets stay hidden: taking turns, the
 * device is handed over between the players; on a split screen, each fleet shows only on asking.
 */

/** Choosing who plays on this device, and how. */
export function localSetup(onBack: () => void): void {
  const saved = settings()
  const names = Array.from(
    { length: MAX_LOCAL },
    (_, i) => saved.localNames[i] ?? (i === 0 ? saved.name : ''),
  )
  let count = Math.max(MIN_LOCAL, saved.localNames.length)
  let split = saved.localSplit && count <= MAX_SPLIT

  const counts = h('div', {
    class: 'counts',
    role: 'group',
    ariaLabel: t('localPlayers'),
  } as Partial<HTMLDivElement>)
  const fields = h('div', { class: 'names' })
  const inputs = names.map((name, i) =>
    h('input', {
      type: 'text',
      maxLength: 16,
      value: name,
      placeholder: t('playerN', { n: i + 1 }),
      ariaLabel: t('nameOf', { n: i + 1 }),
      oninput: () => {
        names[i] = inputs[i]?.value ?? ''
      },
    }),
  )
  const turns = h('input', { type: 'radio', name: 'layout', checked: !split })
  const splitChoice = h('input', { type: 'radio', name: 'layout', checked: split })
  turns.addEventListener('change', () => {
    split = false
  })
  splitChoice.addEventListener('change', () => {
    split = true
  })

  const update = () => {
    counts.replaceChildren(
      ...Array.from({ length: MAX_LOCAL - MIN_LOCAL + 1 }, (_, i) => {
        const n = MIN_LOCAL + i
        return h('button', {
          type: 'button',
          class: n === count ? 'primary' : '',
          textContent: String(n),
          ariaPressed: String(n === count),
          onclick: () => {
            count = n
            update()
          },
        })
      }),
    )
    fields.replaceChildren(...inputs.slice(0, count))
    // A split screen has room for four.
    splitChoice.disabled = count > MAX_SPLIT
    if (count > MAX_SPLIT) split = false
    turns.checked = !split
    splitChoice.checked = split
  }
  update()

  const start = () => {
    const chosen = names.slice(0, count).map((name, i) => name.trim() || t('playerN', { n: i + 1 }))
    updateSettings({
      localNames: names.slice(0, count).map((name) => name.trim()),
      localSplit: split,
    })
    localScreen(new LocalTable(chosen), split, () => localSetup(onBack))
  }

  show(
    h(
      'div',
      { class: 'screen local-setup' },
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
        h('h1', {}, t('local')),
      ),
      h('p', { class: 'muted' }, t('localIntro')),
      h('h3', {}, t('localPlayers')),
      counts,
      fields,
      h('h3', {}, t('layout')),
      h(
        'div',
        { class: 'layouts' },
        h(
          'label',
          { class: 'choice' },
          turns,
          h(
            'span',
            { class: 'choice-text' },
            h('strong', {}, t('layoutTurns')),
            h('small', {}, t('layoutTurnsNote')),
          ),
        ),
        h(
          'label',
          { class: 'choice' },
          splitChoice,
          h(
            'span',
            { class: 'choice-text' },
            h('strong', {}, t('layoutSplit')),
            h('small', {}, t('layoutSplitNote')),
          ),
        ),
      ),
      h(
        'div',
        { class: 'buttons column' },
        h('button', {
          type: 'button',
          class: 'primary big',
          textContent: t('start'),
          onclick: start,
        }),
      ),
    ),
    onBack,
  )
}

/**
 * The table on one device. Taking turns, the screen shows the game as the player to move sees
 * it, naming them. On a split screen, each player has their own part, with their own cards, and
 * the parts of those not at the board show the game as onlookers see it.
 */
export function localScreen(local: LocalTable, split: boolean, onLeave: () => void): void {
  const main = h('div', { class: 'main' })
  const players = h('ul', { class: 'players' })
  const below = h('div', { class: 'below' }, h('h3', {}, t('players')), players)
  const screen = h('div', { class: `screen table local${split ? ' split' : ''}` })
  const pickers = new Map(local.ids.map((id) => [id, new Picker()]))
  /** The players whose part of a split screen is turned round, to face them across the table. */
  const turned = new Set<number>()
  /** Whose view the shared screen shows: the player to move, or who moved last. */
  let viewer = local.ids[0] ?? 0
  /**
   * In a game handed over between turns: who said they hold the device now, or null between
   * two players, while it is being handed over.
   */
  let holder: number | null = null
  /** Whether the game shown last was over: the next one starts with the device handed over. */
  let ended = false
  let gone = false

  /** Moves as player `id`, for their view: taken only on their turn. */
  const move = (id: number) => (game: GameId, moveNo: number, cells: Move) => {
    local.move(id, game, moveNo, cells)
  }

  const render = () => {
    if (gone) return
    const overview = local.state(-1)
    players.replaceChildren(...playerItems(overview, () => []))
    const playing = overview.game !== null
    screen.classList.toggle('playing', playing && split)
    below.hidden = playing && split
    if (!playing || overview.outcome === null) {
      if (!playing || ended) holder = null
      ended = false
    } else ended = true
    if (!playing) {
      main.replaceChildren(
        h(
          'p',
          { class: 'status turn', role: 'status' } as Partial<HTMLParagraphElement>,
          t('chooseGame'),
        ),
        gameChoices(overview, local, true),
      )
      return
    }
    const game = overview.game
    if (game === null) return
    const actions =
      overview.outcome !== null ? h('div', { class: 'buttons' }, ...nextButtons(local)) : null
    if (!split) {
      const next = playerToMove(overview)
      if (handsOver(game) && next !== null && next !== holder) {
        main.replaceChildren(
          ...[h('h2', {}, t(game)), openCardsNotice(game), ...handOver(overview, next)].filter(
            (node): node is HTMLElement => node !== null,
          ),
        )
        return
      }
      viewer = next ?? viewer
      const picker = pickers.get(viewer) ?? new Picker()
      main.replaceChildren(
        ...[
          h('h2', {}, t(game)),
          openCardsNotice(game),
          ...gameView(local.state(viewer), { viewer, picker, move: move(viewer), shared: true }),
          actions,
        ].filter((node): node is HTMLElement => node !== null),
      )
      return
    }
    const panes = local.ids.map((id) => {
      const state = local.state(id)
      const place = state.seats.indexOf(id)
      const name = state.players.find((p) => p.id === id)?.name ?? '?'
      const toMove = playerToMove(state) === id
      return h(
        'section',
        {
          class: `pane${turned.has(id) ? ' turned' : ''}${toMove ? ' to-move' : ''}`,
          ariaLabel: name,
        } as Partial<HTMLElement>,
        h(
          'div',
          { class: 'pane-head' },
          place >= 0 ? seatMark(state, place) : null,
          h('span', { class: 'name' }, name),
          h('span', { class: 'score' }, String(state.scores[id] ?? 0)),
          h('button', {
            type: 'button',
            class: 'icon turn-around',
            ariaLabel: t('turnAround', { name }),
            textContent: '⟲',
            onclick: () => {
              if (turned.has(id)) turned.delete(id)
              else turned.add(id)
              render()
            },
          }),
        ),
        ...gameView(state, {
          viewer: id,
          picker: pickers.get(id) ?? new Picker(),
          move: move(id),
          hideFleet: true,
        }),
      )
    })
    main.replaceChildren(
      h('div', { class: 'split-bar' }, h('h2', {}, t(game)), openCardsNotice(game, true), actions),
      h('div', { class: `panes panes-${panes.length}` }, ...panes),
    )
  }

  /**
   * Between two players of a game handed over: the one who moved sees what their move did, then
   * gives the device on; the next sees nothing of anyone's until they say they hold it.
   */
  const handOver = (overview: TableState, next: number): HTMLElement[] => {
    const nameOf = (id: number) => overview.players.find((p) => p.id === id)?.name ?? '?'
    const name = nameOf(next)
    if (holder !== null) {
      const from = holder
      return [
        ...gameView(local.state(from), {
          viewer: from,
          picker: pickers.get(from) ?? new Picker(),
          move: () => {},
          shared: true,
        }),
        h(
          'div',
          { class: 'buttons' },
          h('button', {
            type: 'button',
            class: 'primary',
            textContent: t('handOver', { name }),
            onclick: () => {
              holder = null
              render()
            },
          }),
        ),
      ]
    }
    return [
      h(
        'div',
        { class: 'handover' },
        h(
          'p',
          { class: 'status turn', role: 'status' } as Partial<HTMLParagraphElement>,
          t('passTo', { name }),
        ),
        h(
          'div',
          { class: 'buttons' },
          h('button', {
            type: 'button',
            class: 'primary big',
            textContent: t('takeOver', { name }),
            onclick: () => {
              holder = next
              render()
            },
          }),
        ),
      ),
    ]
  }

  const leave = () => {
    gone = true
    onLeave()
  }
  local.onChange = render
  for (const picker of pickers.values()) picker.onChange = render

  screen.append(
    h(
      'header',
      {},
      h('button', {
        type: 'button',
        class: 'icon',
        ariaLabel: t('stopPlaying'),
        textContent: '×',
        onclick: leave,
      }),
      h('h1', {}, t('local')),
    ),
    main,
    below,
  )
  // Android's back button does nothing here: it would end the game by mistake.
  show(screen, null, () => {
    gone = true
  })
  render()
}
