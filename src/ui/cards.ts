import {
  allowed,
  type Card,
  JACK,
  type MiauMove,
  type MiauView,
  rankOf,
  SUITS,
  suitOf,
} from '../core/miaumiau'
import { type TextKey, t } from '../i18n'
import { h } from './dom'

const SUIT_SYMBOLS = ['♣', '♠', '♥', '♦'] as const
const SUIT_NAMES: readonly TextKey[] = ['clubs', 'spades', 'hearts', 'diamonds']
const FACES: readonly TextKey[] = ['jack', 'queen', 'king', 'ace']
const FACE_MARKS: readonly TextKey[] = ['jackMark', 'queenMark', 'kingMark', 'aceMark']

/** A suit's symbol, as cards show it. */
export const suitSymbol = (suit: number): string => SUIT_SYMBOLS[suit] ?? '?'

/** The rank as a card shows it in its corner: 7, 10, or the face's letter. */
function rankMark(card: Card): string {
  const rank = rankOf(card)
  return rank < JACK ? String(rank + 2) : t(FACE_MARKS[rank - JACK] as TextKey)
}

/** A card's name, for screen readers and messages: "Seven of hearts". */
export function cardName(card: Card): string {
  const rank = rankOf(card)
  const name = rank < JACK ? String(rank + 2) : t(FACES[rank - JACK] as TextKey)
  return t('cardName', { rank: name, suit: t(SUIT_NAMES[suitOf(card)] as TextKey) })
}

/** One card's face: its rank and suit, red or black. */
function face(card: Card): Node[] {
  const red = suitOf(card) >= 2
  return [
    h('span', { class: `rank${red ? ' red' : ''}` }, rankMark(card)),
    h('span', { class: `suit${red ? ' red' : ''}` }, suitSymbol(suitOf(card))),
  ]
}

/** Hands sorted by suit, then by rank, so a player finds their cards. */
function sorted(hand: readonly Card[]): Card[] {
  return [...hand].sort((a, b) => a - b)
}

/**
 * The game of Miau-Miau as one seat sees it: the others' cards face down, the stock and the
 * pile, and this seat's hand. `onMove` gets a move when this phone may make one; otherwise the
 * cards only show. `seat` is -1 for those who watch.
 */
export function cardsView(
  view: MiauView,
  seat: number,
  names: readonly string[],
  onMove: ((move: MiauMove) => void) | null,
): HTMLElement {
  const over = view.winner !== null || view.stuck
  const may = (move: MiauMove) => onMove !== null && allowed(view, move)

  const others = h(
    'ul',
    { class: 'opponents' },
    ...view.counts.map((count, other) =>
      other === seat
        ? null
        : h(
            'li',
            { class: `opponent${other === view.turn && !over ? ' turn' : ''}` },
            h('span', { class: 'name' }, names[other] ?? '?'),
            h(
              'span',
              { class: 'backs', ariaLabel: t(count === 1 ? 'oneCard' : 'cards', { n: count }) },
              ...Array.from({ length: Math.min(count, 12) }, () => h('span', { class: 'back' })),
            ),
            h('span', { class: 'count' }, String(count)),
            count === 1 && !over ? h('span', { class: 'miau' }, t('miau')) : null,
          ),
    ),
  )

  const draw: MiauMove = { kind: 'draw' }
  const stock = h(
    'button',
    {
      type: 'button',
      class: 'stock',
      ariaLabel:
        view.penalty > 0 ? t('drawMany', { n: view.penalty }) : `${t('drawOne')} (${view.stock})`,
      disabled: !may(draw),
      onclick: () => onMove?.(draw),
    },
    h('span', { class: 'back' }),
    h(
      'span',
      { class: 'label' },
      view.penalty > 0 ? t('drawMany', { n: view.penalty }) : t('drawOne'),
    ),
  )
  const pile = h(
    'div',
    { class: 'pile', role: 'img', ariaLabel: cardName(view.top) } as Partial<HTMLDivElement>,
    h('span', { class: 'card' }, ...face(view.top)),
    view.wish !== null
      ? h(
          'span',
          { class: `wish${view.wish >= 2 ? ' red' : ''}` },
          t('wished', { suit: suitSymbol(view.wish) }),
        )
      : null,
  )
  const middle = h('div', { class: 'middle' }, stock, pile)

  // A jack asks for a suit: four buttons take the place of the hand until one is chosen.
  const choice = h('div', { class: 'suit-choice', hidden: true })
  const hand = h('div', { class: 'hand', ariaLabel: t('yourCards') } as Partial<HTMLDivElement>)
  const chooseSuit = (card: Card) => {
    choice.replaceChildren(
      h('p', {}, t('wishSuit')),
      ...Array.from({ length: SUITS }, (_, suit) =>
        h('button', {
          type: 'button',
          class: `suit-button${suit >= 2 ? ' red' : ''}`,
          ariaLabel: t(SUIT_NAMES[suit] as TextKey),
          textContent: suitSymbol(suit),
          onclick: () => onMove?.({ kind: 'play', card, suit }),
        }),
      ),
      h('button', {
        type: 'button',
        textContent: t('cancel'),
        onclick: () => {
          choice.hidden = true
          hand.hidden = false
        },
      }),
    )
    choice.hidden = false
    hand.hidden = true
  }
  for (const card of sorted(view.hand)) {
    const jack = rankOf(card) === JACK
    const move: MiauMove = jack ? { kind: 'play', card, suit: 0 } : { kind: 'play', card }
    const playable = may(move)
    hand.append(
      h(
        'button',
        {
          type: 'button',
          class: `card${card === view.drawn ? ' drawn' : ''}${playable ? ' playable' : ''}`,
          ariaLabel: cardName(card),
          disabled: !playable,
          onclick: () => (jack ? chooseSuit(card) : onMove?.(move)),
        },
        ...face(card),
      ),
    )
  }

  const pass: MiauMove = { kind: 'pass' }
  const buttons = may(pass)
    ? h(
        'div',
        { class: 'buttons' },
        h('button', {
          type: 'button',
          textContent: view.drawn !== null ? t('keep') : t('pass'),
          onclick: () => onMove?.(pass),
        }),
      )
    : null

  return h(
    'div',
    { class: `cards${onMove ? ' active' : ''}` },
    others,
    middle,
    seat >= 0 ? hand : null,
    choice,
    buttons,
  )
}

/** What a player whose turn it is should know about it, beyond whose turn it is. */
export function cardsHint(view: MiauView): string | null {
  if (view.winner !== null || view.stuck) return null
  if (view.penalty > 0) return t('mustDraw', { n: view.penalty })
  if (view.drawn !== null) return t('playDrawn', { card: cardName(view.drawn) })
  return null
}
