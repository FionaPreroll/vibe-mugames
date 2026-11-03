import type { Move } from '../core/board'
import {
  allowed,
  atLeast,
  type Dice,
  encode,
  LIVES,
  MAEXCHEN,
  type MaexMove,
  type MaexView,
  type Reveal,
  rank,
  THROWS,
  throwOf,
} from '../core/maexchen'
import type { TableState } from '../core/table'
import { t } from '../i18n'
import { type Picker, seatName } from './boards'
import { h } from './dom'

/**
 * Mäxchen on the screen: everyone's lives, the cup with what was said about it, and for the
 * player to move what they may do: roll, doubt, give up, or say what the cup holds. Only the
 * player who rolled sees the dice; a split screen hides them too, until they ask to see them.
 */

export interface DiceOptions {
  /** The player whose view this is. */
  readonly viewer: number
  /** Whether hidden dice show for now, on a split screen. */
  readonly picker: Picker
  /** Makes a move as the viewer; null when the viewer may not move now. */
  readonly move: ((move: Move) => void) | null
  /** A screen everyone shares: players are named instead of "you". */
  readonly shared: boolean
  /** The viewer's dice are hidden, as others see the same screen, unless they ask to see them. */
  readonly hideOwn: boolean
}

const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'] as const

/** A throw as players say it: "54", "Double 3", or "Mäxchen". */
export function throwName(value: number): string {
  if (value === MAEXCHEN) return t('maexchenName')
  if (value % 11 === 0) return t('doubleName', { n: value / 11 })
  return String(value)
}

/** What the game asks of everyone now, or how it ended. */
export function diceStatus(state: TableState, dice: MaexView, viewer: number, shared: boolean) {
  const name = (seat: number) => seatName(state, seat)
  const mine = state.seats.indexOf(viewer)
  if (state.outcome !== null && state.outcome !== 'draw') {
    const winner = state.outcome.winner
    return winner === mine && !shared ? t('youWin') : t('theyWin', { name: name(winner) })
  }
  if (mine < 0) return t('watchingAll', { names: state.seats.map((_, i) => name(i)).join(', ') })
  if (dice.turn !== mine) {
    return dice.phase === 'claim'
      ? t('diceLooks', { name: name(dice.turn) })
      : dice.claim === null
        ? t('diceRolls', { name: name(dice.turn) })
        : t('diceDecides', { name: name(dice.turn), other: name(dice.claimer ?? 0) })
  }
  return shared ? t('yourTurnName', { name: name(mine) }) : t('yourTurn')
}

/** A line of help for the player to move: what they may do, and how likely the claim is. */
export function diceHint(state: TableState, dice: MaexView, viewer: number, hidden: boolean) {
  const mine = state.seats.indexOf(viewer)
  if (state.outcome !== null || mine < 0 || dice.turn !== mine) return ''
  const claim = dice.claim
  if (dice.phase === 'claim') {
    const own = dice.dice && !hidden ? throwOf(dice.dice) : null
    if (claim === null)
      return own === null ? t('diceSayAny') : t('diceSayOwn', { own: throwName(own) })
    if (own === null) return t('diceSayMore', { claim: throwName(claim) })
    return rank(own) > rank(claim)
      ? t('diceSayTrue', { own: throwName(own), claim: throwName(claim) })
      : t('diceMustBluff', { own: throwName(own), claim: throwName(claim) })
  }
  if (claim === null) return t('diceRollFirst')
  const said = { name: seatName(state, dice.claimer ?? 0), claim: throwName(claim) }
  if (claim === MAEXCHEN) return t('diceAgainstMaexchen', said)
  return t('diceOdds', { ...said, n: atLeast(claim) })
}

/** How the last round ended, for everyone to learn from; '' while a round goes on. */
export function revealText(state: TableState, reveal: Reveal | null, dice: MaexView): string {
  if (reveal === null || dice.claim !== null || dice.phase !== 'roll') return ''
  const who = (seat: number) => seatName(state, seat)
  const names = { doubter: who(reveal.doubter), claimer: who(reveal.claimer) }
  const loss = t(reveal.lost === 2 ? 'diceLosesTwo' : 'diceLosesOne', { name: who(reveal.loser) })
  if (reveal.dice === null) return `${t('diceGaveUp', names)} ${loss}`
  const held = throwOf(reveal.dice)
  const honest = rank(held) >= rank(reveal.claim)
  const found = t(honest ? 'diceWasTrue' : 'diceWasBluff', {
    ...names,
    claim: throwName(reveal.claim),
    held: throwName(held),
    dice: faces(reveal.dice),
  })
  return `${found} ${loss}`
}

function faces(dice: Dice): string {
  return dice.map((die) => FACES[die - 1] ?? '?').join(' ')
}

/** Mäxchen as one player sees it: the players' lives, the cup, and what they may do. */
export function diceView(state: TableState, dice: MaexView, options: DiceOptions): HTMLElement[] {
  const mine = state.seats.indexOf(options.viewer)
  const hidden = options.hideOwn && !options.picker.showOwn && state.outcome === null
  const send = options.move
  const act = (move: MaexMove) =>
    send && allowed(dice, mine, move) ? () => send(encode(move)) : null
  const button = (text: string, move: MaexMove, primary = false) => {
    const onclick = act(move)
    return onclick
      ? h('button', { type: 'button', class: primary ? 'primary' : '', textContent: text, onclick })
      : null
  }
  const said =
    dice.claim === null
      ? null
      : t('diceSaid', { name: seatName(state, dice.claimer ?? 0), claim: throwName(dice.claim) })
  const actions = [
    button(dice.claim === null ? t('diceRoll') : t('diceBelieve'), { kind: 'roll' }, true),
    button(t('diceDoubt'), { kind: 'doubt' }, dice.claim === MAEXCHEN),
    button(t('diceYield'), { kind: 'yield' }),
  ].filter((node): node is HTMLButtonElement => node !== null)
  return [
    lifeList(state, dice),
    h(
      'div',
      { class: 'cup-area' },
      cup(dice, hidden),
      said ? h('p', { class: 'said' }, said) : null,
      options.hideOwn && dice.mine && state.outcome === null ? diceToggle(options.picker) : null,
    ),
    actions.length > 0 ? h('div', { class: 'buttons dice-buttons' }, ...actions) : null,
    dice.phase === 'claim' && send && dice.turn === mine ? claims(dice, mine, send, hidden) : null,
    diceHelp(),
  ].filter((node): node is HTMLElement => node !== null)
}

/** Every player with their lives, the one to move marked. */
function lifeList(state: TableState, dice: MaexView): HTMLElement {
  return h(
    'ul',
    { class: 'lives' },
    ...dice.lives.map((lives, seat) =>
      h(
        'li',
        { class: `${seat === dice.turn ? 'to-move' : ''}${lives === 0 ? ' out' : ''}` },
        h('span', { class: 'name' }, seatName(state, seat)),
        h('span', {
          class: 'hearts',
          ariaLabel: lives === 0 ? t('diceOut') : t('diceLives', { n: lives }),
          textContent: lives === 0 ? t('diceOut') : '♥'.repeat(lives) + '♡'.repeat(LIVES - lives),
        }),
      ),
    ),
  )
}

/** The cup: the dice under it for whoever rolled them, else nothing but the cup. */
function cup(dice: MaexView, hidden: boolean): HTMLElement {
  const shown = dice.dice && !hidden ? dice.dice : null
  if (shown) {
    const value = throwOf(shown)
    return h(
      'div',
      {
        class: 'cup open',
        role: 'img',
        ariaLabel: t('diceUnder', { dice: shown.join(', '), value: throwName(value) }),
      } as Partial<HTMLDivElement>,
      h('span', { class: 'faces' }, faces(shown)),
      h('span', { class: 'value' }, throwName(value)),
    )
  }
  return h(
    'div',
    {
      class: 'cup',
      role: 'img',
      ariaLabel: t(dice.dice || dice.claim !== null ? 'diceCupShut' : 'diceCupEmpty'),
    } as Partial<HTMLDivElement>,
    h('span', { class: 'faces' }, dice.claim === null && !dice.dice ? '' : '?'),
  )
}

/** Every throw to say, from the lowest up; only those that beat what was said are open. */
function claims(
  dice: MaexView,
  mine: number,
  send: (move: Move) => void,
  hidden: boolean,
): HTMLElement {
  const own = dice.dice && !hidden ? throwOf(dice.dice) : null
  return h(
    'div',
    { class: 'claims', role: 'group', ariaLabel: t('diceSay') } as Partial<HTMLDivElement>,
    ...THROWS.map((value) => {
      const move: MaexMove = { kind: 'claim', value }
      const classes = [
        'claim',
        value % 11 === 0 ? 'double' : '',
        value === MAEXCHEN ? 'maexchen' : '',
        value === own ? 'true' : '',
      ]
      return h('button', {
        type: 'button',
        class: classes.filter(Boolean).join(' '),
        textContent: value === MAEXCHEN ? t('maexchenName') : String(value),
        ariaLabel: value === own ? `${throwName(value)}: ${t('diceTrue')}` : throwName(value),
        disabled: !allowed(dice, mine, move),
        onclick: () => send(encode(move)),
      })
    }),
  )
}

/** On a split screen: shows or hides the player's own dice. */
function diceToggle(picker: Picker): HTMLElement {
  return h('button', {
    type: 'button',
    class: 'own-toggle',
    textContent: t(picker.showOwn ? 'hideDice' : 'showDice'),
    ariaPressed: String(picker.showOwn),
    onclick: () => {
      picker.showOwn = !picker.showOwn
      picker.onChange()
    },
  })
}

/** Whether the help is open: it stays as the player left it while the table redraws. */
let helpOpen = true

/** How the throws rank and what each move does, for players learning the game. */
function diceHelp(): HTMLElement {
  const ladder = [...THROWS].reverse().map(throwName).join(' › ')
  const details = h(
    'details',
    { class: 'card-help dice-help', open: helpOpen },
    h('summary', {}, t('diceHelp')),
    h(
      'ul',
      {},
      h('li', {}, t('diceHelpRead')),
      h('li', {}, t('diceHelpRank')),
      h('li', { class: 'ladder' }, ladder),
      h('li', {}, t('diceHelpSay')),
      h('li', {}, t('diceHelpDoubt')),
      h('li', {}, t('diceHelpMaexchen', { lives: LIVES })),
    ),
  )
  details.addEventListener('toggle', () => {
    helpOpen = details.open
  })
  return details
}
