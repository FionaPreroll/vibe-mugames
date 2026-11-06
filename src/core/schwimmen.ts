import { type Card, deck, isCard, RANKS, rankOf, SUITS, shuffle, suitOf } from './miaumiau'

/**
 * Schwimmen, also called 31, the old card game of swapping cards, as pure rules: 2 to 8 players,
 * the 32 cards of a Skat deck (seven to ace), and three coins each. The last player still in wins.
 *
 * - Each round, every player gets three cards only they see, and three more lie open in the
 *   middle. In turn, a player swaps one of their cards for one in the middle, swaps all three,
 *   passes, or knocks.
 * - A hand counts the points of its cards of one suit, the best suit: an ace 11, a king, queen
 *   or jack 10, the others their number. Three cards of the same rank count 30½. The most a hand
 *   can hold is 31: an ace with two tens or faces of its suit.
 * - Whoever knocks swaps nothing; every other player has one more turn, then all hands are shown.
 *   Whoever holds 31 after a swap shows it at once, and the round ends there.
 * - When everyone has passed in a row, the middle is put away and three new cards are laid out;
 *   if the stock has too few left, the hands are shown as after a knock.
 * - When the hands are shown, whoever holds the fewest points loses a coin, all of them if
 *   several hold as few; if all hold the same, nobody does. A player without a coin left still
 *   plays: they swim. Whoever loses while swimming is out.
 * - The deal moves on to the next player still in, and the player after the dealer starts.
 *
 * Cards are numbered as in Miau-Miau (`miaumiau.ts`): suit times 13 plus rank, 5 the seven.
 */

/** Coins each player starts with; with none left, they swim. */
export const COINS = 3
export const MIN_SWIM = 2
export const MAX_SWIM = 8
/** Cards in each hand, and in the middle. */
export const HAND = 3
/** The highest hand, which ends the round at once. */
export const SCHNAUZ = 31
/** What three cards of the same rank count. */
export const THREE_OF_A_KIND = 30.5

const ACE = RANKS - 1
const TEN = 8

/** A card's points: an ace 11, a ten, jack, queen or king 10, the others their number. */
export function points(card: Card): number {
  const rank = rankOf(card)
  if (rank === ACE) return 11
  return rank >= TEN ? 10 : rank + 2
}

/** What a hand of three counts: its best suit, or 30½ for three of a rank. */
export function score(hand: readonly Card[]): number {
  const [a, b, c] = hand
  if (hand.length === HAND && a !== undefined && b !== undefined && c !== undefined) {
    if (rankOf(a) === rankOf(b) && rankOf(b) === rankOf(c)) return THREE_OF_A_KIND
  }
  let best = 0
  for (let suit = 0; suit < SUITS; suit++) {
    const sum = hand
      .filter((card) => suitOf(card) === suit)
      .reduce((s, card) => s + points(card), 0)
    best = Math.max(best, sum)
  }
  return best
}

/** The suit a hand counts in, or null for three of a rank (or no cards). */
export function bestSuit(hand: readonly Card[]): number | null {
  if (hand.length === 0 || score(hand) === THREE_OF_A_KIND) return null
  let best = 0
  let found = 0
  for (let suit = 0; suit < SUITS; suit++) {
    const sum = hand
      .filter((card) => suitOf(card) === suit)
      .reduce((s, card) => s + points(card), 0)
    if (sum > best) {
      best = sum
      found = suit
    }
  }
  return found
}

/** A move: one card of the hand for one in the middle, all three, passing, or knocking. */
export type SwimMove =
  | { readonly kind: 'swap'; readonly card: Card; readonly middle: Card }
  | { readonly kind: 'swapAll' }
  | { readonly kind: 'pass' }
  | { readonly kind: 'knock' }

/** The numbers past the cards that stand for swapping all, passing and knocking. */
export const SWAP_ALL_CODE = SUITS * RANKS
export const PASS_CODE = SWAP_ALL_CODE + 1
export const KNOCK_CODE = SWAP_ALL_CODE + 2

/** A move as numbers, as the table and the protocol carry it: see `decode`. */
export function encode(move: SwimMove): number[] {
  if (move.kind === 'swap') return [move.card, move.middle]
  return [move.kind === 'swapAll' ? SWAP_ALL_CODE : move.kind === 'pass' ? PASS_CODE : KNOCK_CODE]
}

/** The move these numbers stand for: [card, middle card], [52] all, [53] pass, [54] knock. */
export function decode(numbers: readonly number[]): SwimMove | undefined {
  const [first, second, ...rest] = numbers
  if (rest.length > 0) return undefined
  if (second === undefined) {
    if (first === SWAP_ALL_CODE) return { kind: 'swapAll' }
    if (first === PASS_CODE) return { kind: 'pass' }
    if (first === KNOCK_CODE) return { kind: 'knock' }
    return undefined
  }
  return isCard(first) && isCard(second) && first !== second
    ? { kind: 'swap', card: first, middle: second }
    : undefined
}

/** Why a round ended: a knock, a 31 shown, or a middle nobody wanted with too few cards left. */
export type RoundEnd = 'knock' | 'schnauz' | 'passes'

/** How the last round ended, shown to everyone: every hand still in, and who lost a coin. */
export interface SwimReveal {
  /** The cards each seat held at the end; none for those already out. */
  readonly hands: readonly (readonly Card[])[]
  readonly why: RoundEnd
  /** Who knocked, or showed 31; null when the round ended by passing. */
  readonly by: number | null
  /** The seats who lost, with the fewest points: a coin each, or their place if swimming. */
  readonly losers: readonly number[]
}

/** The whole game, as only the host knows it. */
export interface SwimState {
  /** Coins left, by seat. */
  readonly coins: readonly number[]
  /** Seats who lost while swimming, and are out. */
  readonly out: readonly boolean[]
  readonly hands: readonly (readonly Card[])[]
  /** The three cards open in the middle. */
  readonly middle: readonly Card[]
  /** The cards left to lay out; the last one comes first. */
  readonly stock: readonly Card[]
  readonly dealer: number
  readonly turn: number
  /** The seat who knocked this round, or null. */
  readonly knocker: number | null
  /** Turns in a row in which a player passed, since the middle was laid out or swapped. */
  readonly passes: number
  /** Turns played in this round so far. */
  readonly turns: number
  /** How the last round ended; null in the first. */
  readonly reveal: SwimReveal | null
  readonly winner: number | null
}

/** What one seat may see: their own cards, the middle, and what everyone may know. */
export interface SwimView {
  /** This seat's cards; none for those who watch, or are out. */
  readonly hand: readonly Card[]
  readonly middle: readonly Card[]
  readonly coins: readonly number[]
  readonly out: readonly boolean[]
  /** How many cards are left to lay out. */
  readonly stock: number
  readonly dealer: number
  readonly turn: number
  readonly knocker: number | null
  readonly passes: number
  readonly turns: number
  readonly reveal: SwimReveal | null
  readonly winner: number | null
}

/** The seats still in. */
export function playing(state: { readonly out: readonly boolean[] }): number[] {
  return state.out.flatMap((out, seat) => (out ? [] : [seat]))
}

/** The next seat after `seat` still in. */
function nextIn(out: readonly boolean[], seat: number): number {
  for (let step = 1; step <= out.length; step++) {
    const next = (seat + step) % out.length
    if (!out[next]) return next
  }
  return seat
}

/** A new game: everyone gets three coins, and the last seat deals, so that seat 0 starts. */
export function start(seats: number, random: () => number): SwimState {
  if (!Number.isInteger(seats) || seats < MIN_SWIM || seats > MAX_SWIM) {
    throw new RangeError(`Schwimmen is for ${MIN_SWIM} to ${MAX_SWIM} players`)
  }
  return deal(
    {
      coins: Array(seats).fill(COINS),
      out: Array(seats).fill(false),
      hands: [],
      middle: [],
      stock: [],
      dealer: seats - 1,
      turn: 0,
      knocker: null,
      passes: 0,
      turns: 0,
      reveal: null,
      winner: null,
    },
    random,
  )
}

/** A new round: shuffles, deals three cards to everyone still in, and lays out three. */
function deal(state: SwimState, random: () => number): SwimState {
  const stock = shuffle(deck(2), random)
  const hands = state.out.map((out) => (out ? [] : stock.splice(-HAND)))
  const middle = stock.splice(-HAND)
  const dealt: SwimState = {
    ...state,
    hands,
    middle,
    stock,
    turn: nextIn(state.out, state.dealer),
    knocker: null,
    passes: 0,
    turns: 0,
  }
  // A hand dealt with 31 is shown at once.
  const lucky = playing(dealt).find((seat) => score(hands[seat] ?? []) === SCHNAUZ)
  return lucky === undefined ? dealt : endRound(dealt, 'schnauz', lucky, random)
}

/** Shows every hand: the fewest points lose, then the next round is dealt, or the game is won. */
function endRound(
  state: SwimState,
  why: RoundEnd,
  by: number | null,
  random: () => number,
): SwimState {
  const seats = playing(state)
  const scores = seats.map((seat) => score(state.hands[seat] ?? []))
  const low = Math.min(...scores)
  const losers = scores.every((s) => s === low) ? [] : seats.filter((_, i) => scores[i] === low)
  const coins = state.coins.map((n, seat) => (losers.includes(seat) && n > 0 ? n - 1 : n))
  const out = state.out.map(
    (out, seat) => out || (losers.includes(seat) && (state.coins[seat] ?? 0) === 0),
  )
  const reveal: SwimReveal = { hands: state.hands, why, by, losers }
  const left = playing({ out })
  const ended = { ...state, coins, out, reveal, knocker: null, passes: 0 }
  if (left.length === 1) return { ...ended, winner: left[0] ?? null }
  return deal({ ...ended, dealer: nextIn(out, state.dealer) }, random)
}

/** Whether `seat` may make this move now. */
export function legal(state: SwimState, seat: number, move: SwimMove): boolean {
  return seat === state.turn && allowed(view(state, seat), seat, move)
}

/**
 * Whether the seat whose view this is may make this move now: the same answer as `legal`, from
 * what the seat sees, so that a phone can tell what it may do.
 */
export function allowed(view: SwimView, seat: number, move: SwimMove): boolean {
  if (view.winner !== null || seat !== view.turn || view.out[seat]) return false
  switch (move.kind) {
    case 'swap':
      return view.hand.includes(move.card) && view.middle.includes(move.middle)
    case 'swapAll':
    case 'pass':
      return true
    case 'knock':
      return view.knocker === null
  }
}

/** Every move the seat whose turn it is may make now. */
export function moves(state: SwimState): SwimMove[] {
  const seat = state.turn
  const all: SwimMove[] = [{ kind: 'swapAll' }, { kind: 'pass' }, { kind: 'knock' }]
  for (const card of state.hands[seat] ?? []) {
    for (const middle of state.middle) all.push({ kind: 'swap', card, middle })
  }
  return all.filter((move) => legal(state, seat, move))
}

/**
 * The game after `seat`'s move, which must be legal. `random` shuffles the cards for the next
 * round when this one ends.
 */
export function play(
  state: SwimState,
  seat: number,
  move: SwimMove,
  random: () => number,
): SwimState {
  const hand = state.hands[seat] ?? []
  let after: SwimState = { ...state, turns: state.turns + 1 }
  if (move.kind === 'swap') {
    const hands = replace(state.hands, seat, [
      ...hand.map((card) => (card === move.card ? move.middle : card)),
    ])
    const middle = state.middle.map((card) => (card === move.middle ? move.card : card))
    after = { ...after, hands, middle, passes: 0 }
  } else if (move.kind === 'swapAll') {
    after = {
      ...after,
      hands: replace(state.hands, seat, [...state.middle]),
      middle: [...hand],
      passes: 0,
    }
  } else if (move.kind === 'knock') {
    after = { ...after, knocker: seat, passes: 0 }
  } else after = { ...after, passes: state.passes + 1 }

  if (move.kind === 'swap' || move.kind === 'swapAll') {
    if (score(after.hands[seat] ?? []) === SCHNAUZ) return endRound(after, 'schnauz', seat, random)
  }
  if (after.knocker === null && after.passes >= playing(after).length) {
    // Nobody wanted the middle: new cards, if there are enough.
    if (after.stock.length < HAND) return endRound(after, 'passes', null, random)
    const stock = [...after.stock]
    const middle = stock.splice(-HAND)
    after = { ...after, stock, middle, passes: 0 }
  }
  const next = nextIn(after.out, seat)
  if (after.knocker !== null && next === after.knocker) {
    return endRound(after, 'knock', after.knocker, random)
  }
  return { ...after, turn: next }
}

/** The seat who won, or null while the game goes on. */
export function outcome(state: SwimState): number | null {
  return state.winner
}

/** What `seat` may see of the game; a seat of -1, or any that does not play, only watches. */
export function view(state: SwimState, seat: number): SwimView {
  return {
    hand: state.hands[seat] ?? [],
    middle: state.middle,
    coins: state.coins,
    out: state.out,
    stock: state.stock.length,
    dealer: state.dealer,
    turn: state.turn,
    knocker: state.knocker,
    passes: state.passes,
    turns: state.turns,
    reveal: state.reveal,
    winner: state.winner,
  }
}

/** Whether a value is a card of the Skat deck Schwimmen is played with. */
export function isSwimCard(value: unknown): value is Card {
  return isCard(value) && rankOf(value) >= RANKS - 8
}

function replace<T>(list: readonly T[], index: number, value: T): T[] {
  return list.map((item, i) => (i === index ? value : item))
}
