import { type GameId, isLiveGame, type Move } from '../core/board'
import { GAME_GROUPS, type GameGroup, handsOver, hasHiddenCards, seatRange } from '../core/games'
import { encode as encodeLudo } from '../core/ludo'
import { encode } from '../core/miaumiau'
import type { Player, TableState } from '../core/table'
import { type TextKey, t } from '../i18n'
import type { TableHost } from '../net/session'
import { rememberGame, settings } from '../storage'
import { boardView, handText, hint, news, type Picker, seatName, symbol } from './boards'
import { cardsHint, cardsView } from './cards'
import { diceHint, diceStatus, diceView, revealText } from './dice'
import { h } from './dom'
import type { LiveSlot } from './live'
import { ludoHints, ludoView } from './ludo'
import { playersText, rulesButton, thumbnail } from './rules'
import { seaHint, seaStatus, seaToMove, seaView, shotText } from './sea'
import { swimHints, swimStatus, swimView } from './swim'
import { villageStatus, villageToMove, villageView } from './village'
import { wordsStatus, wordsToMove, wordsView } from './words'

/**
 * What every table shows, at phones side by side and on one device alike: the players with
 * their scores, the lobby, and the game as one player sees it.
 */

/** The players at the table with their scores; `marks` adds a note after a player's name. */
export function playerItems(state: TableState, marks: (player: Player) => string[]): Node[] {
  return state.players.map((player) => {
    const notes = marks(player).filter(Boolean)
    const place = state.seats.indexOf(player.id)
    return h(
      'li',
      { class: player.away ? 'away' : '' },
      place >= 0 ? seatMark(state, place) : null,
      h('span', { class: 'name' }, player.name),
      notes.length > 0 ? h('span', { class: 'muted' }, ` (${notes.join(', ')})`) : null,
      h('span', { class: 'score' }, String(state.scores[player.id] ?? 0)),
    )
  })
}

/** A seat's colour, or its mark in Tic Tac Toe and Ultimate Tic Tac Toe. */
export function seatMark(state: TableState, place: number): HTMLElement {
  return h(
    'span',
    { class: `piece seat-${place}` },
    state.game === 'tictactoe' || state.game === 'ultimate' ? symbol(place) : '●',
  )
}

/** The heading and the note of each group of games in the chooser. */
const GROUP_TEXTS: Record<GameGroup, readonly [TextKey, TextKey]> = {
  tactics: ['groupTactics', 'groupTacticsNote'],
  luck: ['groupLuck', 'groupLuckNote'],
  party: ['groupParty', 'groupPartyNote'],
  skill: ['groupSkill', 'groupSkillNote'],
}

/**
 * The games to choose from, by kind, each with a thumbnail of its board, how many play it and a
 * button for its rules, for whoever keeps the table; without `host`, the games only show, for
 * players to read the rules while they wait. `local` marks the games whose cards are open when
 * everyone plays on one device.
 */
export function gameChoices(
  state: TableState,
  host: TableHost | null,
  local: boolean,
): HTMLElement {
  const here = state.players.filter((p) => !p.away).length
  const card = (id: GameId) => {
    const content = [
      h('span', { class: 'game-name' }, t(id)),
      local && hasHiddenCards(id)
        ? h('span', { class: 'open-note muted' }, ` (${t('openCardsShort')})`)
        : null,
    ]
    const choice = host
      ? h(
          'button',
          {
            type: 'button',
            class: 'game-choice',
            disabled: here < seatRange(id).min,
            onclick: () => {
              rememberGame(id)
              host.choose(id)
            },
          },
          ...content,
        )
      : h('div', { class: 'game-choice' }, ...content)
    // The thumbnail and the number of players lie over the choice, and let taps through to it:
    // the choice's own text is only the game's name.
    return h(
      'div',
      { class: 'game-card', role: 'group', ariaLabel: t(id) } as Partial<HTMLDivElement>,
      choice,
      thumbnail(id),
      h('span', { class: 'seats-badge', title: playersText(id) }, seatsText(id)),
      rulesButton(id, true),
    )
  }
  const section = (group: string, heading: TextKey, note: TextKey, games: readonly GameId[]) =>
    h(
      'section',
      { class: `game-group ${group}`, ariaLabel: t(heading) } as Partial<HTMLElement>,
      h('h3', {}, t(heading), h('small', { class: 'muted group-note' }, t(note))),
      h('div', { class: 'games' }, ...games.map(card)),
    )
  // Whoever chooses finds the games chosen last on top, also in their own group below.
  const recent = host ? settings().recentGames : []
  return h(
    'div',
    { class: 'game-groups' },
    recent.length > 0 && section('recent', 'groupRecent', 'groupRecentNote', recent),
    ...GAME_GROUPS.map(({ group, games }) => section(group, ...GROUP_TEXTS[group], games)),
  )
}

/** How many play a game, in short: "2", "2–6". */
function seatsText(game: GameId): string {
  const { min, max } = seatRange(game)
  return min === max ? String(min) : `${min}–${max}`
}

export interface GameViewOptions {
  /** The player whose view this is: their seat, their cards. */
  readonly viewer: number
  /** The cells this view picked so far for its next move. */
  readonly picker: Picker
  /** Makes a move as the viewer; offered only on the viewer's turn. */
  readonly move: (game: GameId, moveNo: number, move: Move) => void
  /**
   * A screen everyone shares, taking turns on it: players are named instead of "you", and the
   * board stays put for all of them.
   */
  readonly shared?: boolean
  /**
   * The viewer's own fleet in Sea Battle, dice in Mäxchen and role in Werwolf are hidden until
   * they ask, as others see this screen.
   */
  readonly hideOwn?: boolean
  /** Where the field of a game in real time stays between redraws. */
  readonly live?: LiveSlot
}

/**
 * The game on the table as one player sees it: whose turn it is or how it ended, what this move
 * asks of them, the board or the cards, and the pieces still to place. `state` is the table as
 * the viewer may see it.
 */
export function gameView(state: TableState, options: GameViewOptions): HTMLElement[] {
  const game = state.game
  if (game === null) return []
  const { viewer, picker, shared = false } = options
  const statusLine = (text: string, mine: boolean) =>
    h(
      'p',
      {
        class: `status turn${mine ? ' mine' : ''}`,
        role: 'status',
      } as Partial<HTMLParagraphElement>,
      text,
    )
  const hints = (...lines: string[]) =>
    lines.filter(Boolean).map((line) => h('p', { class: 'hint muted' }, line))
  if (state.dice) {
    const dice = state.dice
    const mine = state.seats.indexOf(viewer)
    const toMove = state.outcome === null && mine >= 0 && dice.turn === mine
    const hidden = (options.hideOwn ?? false) && !picker.showOwn
    return [
      statusLine(diceStatus(state, dice, viewer, shared), toMove),
      ...hints(revealText(state, dice.reveal, dice), diceHint(state, dice, viewer, hidden)),
      ...diceView(state, dice, {
        viewer,
        picker,
        move: toMove ? (move) => options.move(game, state.moveNo, move) : null,
        shared,
        hideOwn: options.hideOwn ?? false,
      }),
    ]
  }
  if (state.swim) {
    const swim = state.swim
    const mine = state.seats.indexOf(viewer)
    const toMove = state.outcome === null && mine >= 0 && swim.turn === mine && !swim.out[mine]
    const picked = toMove && picker.current(state).length > 0
    return [
      statusLine(swimStatus(state, swim, viewer, shared), toMove),
      ...hints(...swimHints(state, swim, viewer, picked)),
      ...swimView(state, swim, {
        viewer,
        picker,
        move: toMove ? (move) => options.move(game, state.moveNo, move) : null,
        shared,
        hideOwn: options.hideOwn ?? false,
      }),
    ]
  }
  if (state.village) {
    const village = state.village
    const toMove = villageToMove(state, village, viewer)
    const hidden = (options.hideOwn ?? false) && !picker.showOwn
    return [
      statusLine(villageStatus(state, village, viewer, hidden), toMove),
      ...villageView(state, village, {
        viewer,
        picker,
        move: toMove ? (move) => options.move(game, state.moveNo, move) : null,
        shared,
        hideOwn: options.hideOwn ?? false,
      }),
    ]
  }
  if (state.words) {
    const words = state.words
    const seated = state.seats.includes(viewer)
    return [
      statusLine(wordsStatus(state, words, viewer, shared), wordsToMove(state, words, viewer)),
      ...wordsView(state, words, {
        viewer,
        picker,
        move: seated ? (move) => options.move(game, state.moveNo, move) : null,
        shared,
      }),
    ]
  }
  if (state.sea) {
    const sea = state.sea
    const toMove = seaToMove(state, sea, viewer)
    const status = h(
      'p',
      {
        class: `status turn${toMove ? ' mine' : ''}`,
        role: 'status',
      } as Partial<HTMLParagraphElement>,
      seaStatus(state, sea, viewer, shared),
    )
    const lines = [shotText(state, sea, viewer), seaHint(state, sea, viewer)].filter(Boolean)
    return [
      status,
      ...lines.map((line) => h('p', { class: 'hint muted' }, line)),
      ...seaView(state, sea, {
        viewer,
        picker,
        move: toMove ? (move) => options.move(game, state.moveNo, move) : null,
        shared,
        hideOwn: options.hideOwn ?? false,
      }),
    ]
  }
  const name = (seatNo: number) => seatName(state, seatNo)
  const mine = state.seats.indexOf(viewer)
  const turn = state.position?.turn ?? state.ludo?.turn ?? state.cards?.turn ?? 0
  const myTurn = state.outcome === null && mine >= 0 && turn === mine
  const taking = state.position?.phase === 'remove'
  const status = h('p', { class: 'status turn', role: 'status' } as Partial<HTMLParagraphElement>)
  if (isLiveGame(game)) {
    status.textContent = liveStatus(state, mine, shared, options.live?.local ?? false)
    const field = options.live?.element(state, viewer, shared)
    return field ? [status, field] : [status]
  }
  if (state.outcome === 'draw') status.textContent = t(state.cards ? 'stuck' : 'draw')
  else if (state.outcome)
    status.textContent =
      state.outcome.winner === mine && !shared
        ? t('youWin')
        : t('theyWin', { name: name(state.outcome.winner) })
  else if (taking)
    status.textContent = shared
      ? t('theyTakeFrom', { name: name(turn), other: name(1 - turn) })
      : myTurn
        ? t('youTake', { name: name(1 - turn) })
        : t('theyTake', { name: name(turn) })
  else if (mine < 0)
    status.textContent =
      state.seats.length === 2
        ? t('watching', { a: name(0), b: name(1) })
        : t('watchingAll', { names: state.seats.map((_, i) => name(i)).join(', ') })
  else if (shared) status.textContent = t('yourTurnName', { name: name(turn) })
  else status.textContent = myTurn ? t('yourTurn') : t('theirTurn', { name: name(turn) })
  status.classList.toggle('mine', myTurn)

  const names = state.seats.map((_, i) => name(i))
  if (state.ludo) {
    const picked = myTurn ? picker.current(state) : []
    const lines = ludoHints(state.ludo, mine, names, shared, picked.length > 0)
    return [
      status,
      ...lines.map((line) => h('p', { class: 'hint muted' }, line)),
      ludoView(state.ludo, {
        // On a shared screen, the board does not turn round for each player.
        seat: shared ? 0 : mine,
        names,
        picker,
        picked,
        onMove: myTurn ? (move) => options.move(game, state.moveNo, encodeLudo(move)) : null,
      }),
    ]
  }
  const help = state.cards
    ? (cardsHint(state.cards, mine, state.last, names) ?? '')
    : news(state, mine, shared) || (myTurn ? hint(state, picker.current(state)) : '')
  const hand = handText(state)
  const board = state.cards
    ? cardsView(
        state.cards,
        mine,
        names,
        myTurn ? (move) => options.move(game, state.moveNo, encode(move)) : null,
      )
    : boardView(
        state,
        // On a shared screen, the board does not turn round for each player.
        shared ? (state.seats[0] ?? viewer) : viewer,
        picker,
        myTurn ? (move) => options.move(game, state.moveNo, move) : null,
      )
  return [
    status,
    help ? h('p', { class: 'hint muted' }, help) : null,
    board,
    hand ? h('p', { class: 'hand muted' }, hand) : null,
  ].filter((node): node is HTMLElement => node !== null)
}

/**
 * Puts the board, the cards or the field of a game into its stage, between the lines about it
 * (whose turn it is, what to do, the pieces in hand), so that a wide screen can show the stage
 * beside everything else, as large as the screen is high.
 */
export function staged(nodes: readonly HTMLElement[]): HTMLElement[] {
  const stage = h('div', { class: 'stage' })
  const out: HTMLElement[] = []
  for (const node of nodes) {
    if (node.matches('p.status, p.hint, p.hand')) out.push(node)
    else {
      if (!stage.hasChildNodes()) out.push(stage)
      stage.append(node)
    }
  }
  return out
}

/**
 * What a game in real time says above its field: how it ended, who plays, or how to play.
 * What changes many times a second, such as the countdown or a goal, the field shows itself.
 */
function liveStatus(state: TableState, mine: number, shared: boolean, local: boolean): string {
  const name = (seatNo: number) => seatName(state, seatNo)
  if (state.outcome === 'draw') return t('draw')
  if (state.outcome) {
    return state.outcome.winner === mine && !shared
      ? t('youWin')
      : t('theyWin', { name: name(state.outcome.winner) })
  }
  if (mine < 0 && !shared) {
    return state.seats.length === 2
      ? t('watching', { a: name(0), b: name(1) })
      : t('watchingAll', { names: state.seats.map((_, i) => name(i)).join(', ') })
  }
  if (state.game === 'lichtrenner') return t(local ? 'lichtHintLocal' : 'lichtHint')
  return t(local ? 'hockeyHintLocal' : settings().hockeyWhole ? 'hockeyHintWhole' : 'hockeyHint')
}

/** Rematch and another game, for whoever keeps the table, once a game is over. */
export function nextButtons(host: TableHost): HTMLElement[] {
  return [
    h('button', { type: 'button', textContent: t('otherGame'), onclick: () => host.lobby() }),
    h('button', {
      type: 'button',
      class: 'primary',
      textContent: t('rematch'),
      onclick: () => host.rematch(),
    }),
  ]
}

/** How each game handed over on one device says so: taking turns, and on a split screen. */
const HAND_OVER_NOTICES: Partial<Record<GameId, readonly [TextKey, TextKey]>> = {
  seeschlacht: ['handOverNotice', 'hiddenFleetNotice'],
  maexchen: ['handOverDice', 'hiddenDiceNotice'],
  werwolf: ['handOverRoles', 'hiddenRoleNotice'],
  schwimmen: ['handOverCards', 'hiddenCardsNotice'],
  stadtlandfluss: ['handOverWords', 'hiddenWordsNotice'],
}

/** What a player taps once they hold the device, in a game handed over on one device. */
export function takeOverText(game: GameId, name: string): string {
  const key: TextKey =
    game === 'maexchen'
      ? 'takeOverDice'
      : game === 'werwolf'
        ? 'takeOverRole'
        : game === 'schwimmen'
          ? 'takeOverCards'
          : game === 'stadtlandfluss'
            ? 'takeOverWords'
            : 'takeOver'
  return t(key, { name })
}

/**
 * The notice for a game that hides something, played on one device: that its cards are open, or
 * how Sea Battle, Mäxchen, Werwolf and Schwimmen keep each player's own hidden there (`split` on a split
 * screen). Null for other games.
 */
export function openCardsNotice(game: GameId | null, split = false): HTMLElement | null {
  if (game === null) return null
  const notices = HAND_OVER_NOTICES[game]
  const text = hasHiddenCards(game)
    ? t('openCards')
    : handsOver(game) && notices
      ? t(notices[split ? 1 : 0])
      : ''
  return text
    ? h('p', { class: 'notice', role: 'note' } as Partial<HTMLParagraphElement>, text)
    : null
}
