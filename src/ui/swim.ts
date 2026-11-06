import type { Move } from '../core/board'
import type { Card } from '../core/miaumiau'
import {
  allowed,
  bestSuit,
  COINS,
  decode,
  encode,
  playing,
  SCHNAUZ,
  type SwimMove,
  type SwimReveal,
  type SwimView,
  score,
  THREE_OF_A_KIND,
} from '../core/schwimmen'
import type { TableState } from '../core/table'
import { t } from '../i18n'
import { type Picker, seatName } from './boards'
import { cardName, face, suitSymbol } from './cards'
import { h } from './dom'

/**
 * Schwimmen on the screen: everyone's coins, the three cards in the middle, this player's hand
 * with what it counts, and for the player to move what they may do: swap a card, swap all three,
 * pass or knock. A card is swapped by tapping it in the hand, then the card in the middle to take
 * for it. A split screen hides the hand until its player asks to see it.
 */

export interface SwimOptions {
  /** The player whose view this is. */
  readonly viewer: number
  /** The card of the hand picked for a swap, and whether a hidden hand shows. */
  readonly picker: Picker
  /** Makes a move as the viewer; null when the viewer may not move now. */
  readonly move: ((move: Move) => void) | null
  /** A screen everyone shares: players are named instead of "you". */
  readonly shared: boolean
  /** The viewer's hand is hidden, as others see the same screen, unless they ask to see it. */
  readonly hideOwn: boolean
}

/** Points as players say them: 30½ for three of a rank. */
export function pointsText(points: number): string {
  return points === THREE_OF_A_KIND ? '30½' : String(points)
}

/** What a hand counts, and in which suit: "21 in ♥", "30½: three of a rank". */
export function handValue(hand: readonly Card[]): string {
  const points = score(hand)
  if (points === THREE_OF_A_KIND) return t('swimThree')
  const suit = bestSuit(hand)
  return t('swimPoints', { n: points, suit: suit === null ? '' : suitSymbol(suit) })
}

/** What the game asks of everyone now, or how it ended. */
export function swimStatus(state: TableState, swim: SwimView, viewer: number, shared: boolean) {
  const name = (seat: number) => seatName(state, seat)
  const mine = state.seats.indexOf(viewer)
  if (swim.winner !== null) {
    return swim.winner === mine && !shared ? t('youWin') : t('theyWin', { name: name(swim.winner) })
  }
  if (mine < 0) return t('watchingAll', { names: state.seats.map((_, i) => name(i)).join(', ') })
  if (swim.out[mine] && !shared) return t('swimYouAreOut', { name: name(swim.turn) })
  if (swim.turn !== mine) return t('theirTurn', { name: name(swim.turn) })
  return shared ? t('yourTurnName', { name: name(mine) }) : t('yourTurn')
}

/**
 * Lines for everyone: how the last round ended while the new one starts, what the player before
 * did, and that someone knocked; and for the player to move, what they may do.
 */
export function swimHints(
  state: TableState,
  swim: SwimView,
  viewer: number,
  picked: boolean,
): string[] {
  if (swim.winner !== null) return [revealText(state, swim.reveal)]
  const mine = state.seats.indexOf(viewer)
  const name = (seat: number) => seatName(state, seat)
  const lines: string[] = []
  const fresh = swim.turns < playing(swim).length
  if (fresh && swim.reveal) lines.push(revealText(state, swim.reveal))
  if (swim.turns > 0) lines.push(lastText(state, swim))
  if (swim.knocker !== null) {
    lines.push(
      swim.turn === mine
        ? t('swimLastTurn', { name: name(swim.knocker) })
        : t('swimKnocked', { name: name(swim.knocker) }),
    )
  }
  if (swim.turn === mine && !swim.out[mine]) {
    lines.push(t(picked ? 'swimTakeHint' : 'swimHint'))
  }
  return lines.filter(Boolean)
}

/** What the player before did: the card they swapped, all three, passing or knocking. */
function lastText(state: TableState, swim: SwimView): string {
  const move = state.last && decode(state.last)
  if (!move) return ''
  // The player before the one to move, among those still in.
  const seats = swim.out.length
  let mover = swim.turn
  for (let step = 1; step <= seats; step++) {
    const seat = (swim.turn - step + seats) % seats
    if (!swim.out[seat]) {
      mover = seat
      break
    }
  }
  const name = seatName(state, mover)
  if (move.kind === 'swap') {
    return t('swimSwapped', { name, gave: cardName(move.card), took: cardName(move.middle) })
  }
  if (move.kind === 'swapAll') return t('swimSwappedAll', { name })
  if (move.kind === 'knock') return ''
  return swim.passes === 0 && swim.knocker === null
    ? t('swimNewMiddle', { name })
    : t('swimPassed', { name })
}

/** How a round ended: who knocked or showed 31, and who lost a coin, or their place. */
export function revealText(state: TableState, reveal: SwimReveal | null): string {
  if (reveal === null) return ''
  const name = (seat: number) => seatName(state, seat)
  const why =
    reveal.why === 'knock'
      ? t('swimEndKnock', { name: name(reveal.by ?? 0) })
      : reveal.why === 'schnauz'
        ? t('swimEndSchnauz', { name: name(reveal.by ?? 0) })
        : t('swimEndPasses')
  if (reveal.losers.length === 0) return `${why} ${t('swimNobodyLoses')}`
  const low = pointsText(score(reveal.hands[reveal.losers[0] ?? 0] ?? []))
  const names = reveal.losers.map(name).join(', ')
  return `${why} ${t(reveal.losers.length === 1 ? 'swimLoses' : 'swimLoseAll', { names, n: low })}`
}

/** Schwimmen as one player sees it: everyone's coins, the middle, their hand, what they may do. */
export function swimView(state: TableState, swim: SwimView, options: SwimOptions): HTMLElement[] {
  const mine = state.seats.indexOf(options.viewer)
  const over = swim.winner !== null
  const hidden = options.hideOwn && !options.picker.showOwn && !over
  const send = options.move
  const may = (move: SwimMove) => send !== null && !hidden && allowed(swim, mine, move)
  const path = options.picker.current(state)
  const picked = path[0] !== undefined && swim.hand.includes(path[0]) ? path[0] : null
  const act = (move: SwimMove) => send?.(encode(move))

  const middle = h(
    'div',
    {
      class: 'swim-middle',
      role: 'group',
      ariaLabel: t('swimMiddle'),
    } as Partial<HTMLDivElement>,
    ...swim.middle.map((card) => {
      const move: SwimMove | null =
        picked === null ? null : { kind: 'swap', card: picked, middle: card }
      const open = move !== null && may(move)
      return h(
        'button',
        {
          type: 'button',
          class: `card${open ? ' playable' : ''}`,
          ariaLabel: cardName(card),
          disabled: !open,
          onclick: () => move && act(move),
        },
        ...face(card, false),
      )
    }),
  )
  const middleArea = h(
    'div',
    { class: 'swim-area' },
    h('p', { class: 'swim-label muted' }, t('swimMiddle')),
    middle,
  )

  const handArea =
    mine >= 0 && swim.hand.length > 0
      ? h(
          'div',
          { class: 'swim-area' },
          h(
            'p',
            { class: 'swim-label muted' },
            hidden ? t('yourCards') : `${t('yourCards')}: ${handValue(swim.hand)}`,
          ),
          hidden
            ? h(
                'div',
                {
                  class: 'hand',
                  role: 'group',
                  ariaLabel: t('yourCards'),
                } as Partial<HTMLDivElement>,
                ...swim.hand.map(() => h('span', { class: 'card face-down' })),
              )
            : h(
                'div',
                {
                  class: 'hand',
                  role: 'group',
                  ariaLabel: t('yourCards'),
                } as Partial<HTMLDivElement>,
                ...swim.hand.map((card) => {
                  const open = may({ kind: 'swapAll' })
                  return h(
                    'button',
                    {
                      type: 'button',
                      class: `card${open ? ' playable' : ''}${card === picked ? ' picked' : ''}`,
                      ariaLabel: cardName(card),
                      ariaPressed: String(card === picked),
                      disabled: !open,
                      onclick: () => options.picker.set(card === picked ? [] : [card]),
                    },
                    ...face(card, false),
                  )
                }),
              ),
          options.hideOwn && !over ? ownToggle(options.picker) : null,
        )
      : null

  const button = (text: string, move: SwimMove, primary = false) =>
    may(move)
      ? h('button', {
          type: 'button',
          class: primary ? 'primary' : '',
          textContent: text,
          onclick: () => act(move),
        })
      : null
  const actions = [
    button(t('swimSwapAll'), { kind: 'swapAll' }),
    button(t('swimPass'), { kind: 'pass' }),
    button(t('swimKnock'), { kind: 'knock' }, true),
  ].filter((node): node is HTMLButtonElement => node !== null)

  return [
    coinList(state, swim),
    h(
      'div',
      { class: `cards swim${send ? ' active' : ''}` },
      middleArea,
      handArea,
      actions.length > 0 ? h('div', { class: 'buttons swim-buttons' }, ...actions) : null,
      swim.reveal ? lastRound(state, swim.reveal, swim.turns < playing(swim).length || over) : null,
      swimHelp(),
    ),
  ]
}

/** Every player with their coins: the one to move marked, those swimming, and those out. */
function coinList(state: TableState, swim: SwimView): HTMLElement {
  return h(
    'ul',
    { class: 'lives coins' },
    ...swim.coins.map((coins, seat) => {
      const out = swim.out[seat] ?? false
      const label = out
        ? t('swimOut')
        : coins === 0
          ? t('swimSwimming')
          : t('swimCoins', { n: coins })
      const marks = [
        seat === swim.dealer ? t('swimDealer') : '',
        seat === swim.knocker ? t('swimKnockMark') : '',
      ].filter(Boolean)
      return h(
        'li',
        {
          class: `${seat === swim.turn && swim.winner === null ? 'to-move' : ''}${out ? ' out' : ''}`,
        },
        h('span', { class: 'name' }, seatName(state, seat)),
        h('span', {
          class: 'hearts',
          ariaLabel: label,
          title: label,
          textContent: out
            ? t('swimOut')
            : coins === 0
              ? '🏊'
              : '●'.repeat(coins) + '○'.repeat(COINS - coins),
        }),
        marks.length > 0 ? h('span', { class: 'muted' }, marks.join(' ')) : null,
      )
    }),
  )
}

/** Every hand of the round before, with what it counted; those who lost marked. */
function lastRound(state: TableState, reveal: SwimReveal, open: boolean): HTMLElement {
  return h(
    'details',
    { class: 'card-help swim-reveal', open },
    h('summary', {}, t('swimLastRound')),
    h(
      'ul',
      {},
      ...reveal.hands.map((hand, seat) =>
        hand.length === 0
          ? null
          : h(
              'li',
              { class: reveal.losers.includes(seat) ? 'lost' : '' },
              h('span', { class: 'name' }, seatName(state, seat)),
              h(
                'span',
                {
                  class: 'mini-hand',
                  ariaLabel: hand.map(cardName).join(', '),
                } as Partial<HTMLSpanElement>,
                ...hand.map((card) => h('span', { class: 'card mini' }, ...face(card, false))),
              ),
              h(
                'span',
                { class: 'points' },
                score(hand) === SCHNAUZ ? '31!' : pointsText(score(hand)),
              ),
            ),
      ),
    ),
  )
}

/** On a split screen: shows or hides the player's own hand. */
function ownToggle(picker: Picker): HTMLElement {
  return h('button', {
    type: 'button',
    class: 'own-toggle',
    textContent: t(picker.showOwn ? 'hideCards' : 'showCards'),
    ariaPressed: String(picker.showOwn),
    onclick: () => {
      picker.showOwn = !picker.showOwn
      picker.onChange()
    },
  })
}

/** Whether the help is open: it stays as the player left it while the table redraws. */
let helpOpen = true

/** What the cards count and what each move does, for players learning the game. */
function swimHelp(): HTMLElement {
  const details = h(
    'details',
    { class: 'card-help swim-help', open: helpOpen },
    h('summary', {}, t('swimHelp')),
    h(
      'ul',
      {},
      h('li', {}, t('swimHelpPoints')),
      h('li', {}, t('swimHelpThree')),
      h('li', {}, t('swimHelpMoves')),
      h('li', {}, t('swimHelpKnock')),
      h('li', {}, t('swimHelpLose', { coins: COINS })),
    ),
  )
  details.addEventListener('toggle', () => {
    helpOpen = details.open
  })
  return details
}
