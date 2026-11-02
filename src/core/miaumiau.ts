/**
 * Miau-Miau, the Spielekiste's Mau-Mau, as pure rules: 2 to 6 players, each with a hand of
 * cards only they see. Whoever is first to play their last card wins.
 *
 * - A card goes on the pile if it has the suit or the rank of the card on top.
 * - A jack goes on any card, and its player wishes a suit: the next card must have that suit, or
 *   be a jack again.
 * - A seven makes the next player draw two cards, unless they answer with a seven of their own:
 *   then the player after them draws four, and so on.
 * - An eight makes the next player miss their turn; with two players, its player goes again.
 * - Instead of playing, a player draws one card. If it fits, they may play it at once, or keep
 *   it and pass; if not, the turn moves on.
 * - When the stock runs out, the pile but its top card is shuffled into a new stock. If every
 *   player in turn can draw nothing and passes, the game is a draw.
 *
 * The first card on the pile has no effect. Up to four players use the 32 cards of a Skat deck
 * (seven to ace), five and six players the 52 cards of a full deck. Everyone starts with five.
 */

/**
 * A card is a number from 0 to 51: its suit is `card / 13` rounded down (0 clubs, 1 spades,
 * 2 hearts, 3 diamonds), its rank `card % 13` (0 the two, 8 the ten, 9 the jack, 10 the queen,
 * 11 the king, 12 the ace).
 */
export type Card = number

export const SUITS = 4
export const RANKS = 13
export const SEVEN = 5
export const EIGHT = 6
export const JACK = 9
export const MIN_SEATS = 2
export const MAX_SEATS = 6
export const HAND = 5
/** Cards in the largest deck, the full one. */
export const DECK = SUITS * RANKS

export const suitOf = (card: Card): number => Math.floor(card / RANKS)
export const rankOf = (card: Card): number => card % RANKS

/** A move: a card to play (a jack with the suit its player wishes), drawing, or passing. */
export type MiauMove =
  | { readonly kind: 'play'; readonly card: Card; readonly suit?: number }
  | { readonly kind: 'draw' }
  | { readonly kind: 'pass' }

/** A move as the table and the protocol carry it, a list of numbers: see `encode`. */
const DRAW_CODE = DECK
const PASS_CODE = DECK + 1

/** A move as numbers: the card (and a jack's suit), or 52 to draw, 53 to pass. */
export function encode(move: MiauMove): number[] {
  if (move.kind === 'draw') return [DRAW_CODE]
  if (move.kind === 'pass') return [PASS_CODE]
  return move.suit === undefined ? [move.card] : [move.card, move.suit]
}

/** The move these numbers stand for, or undefined if they stand for none. */
export function decode(numbers: readonly number[]): MiauMove | undefined {
  const [first, suit, ...rest] = numbers
  if (!Number.isInteger(first) || rest.length > 0) return undefined
  if (first === DRAW_CODE || first === PASS_CODE) {
    if (suit !== undefined) return undefined
    return { kind: first === DRAW_CODE ? 'draw' : 'pass' }
  }
  if (!isCard(first)) return undefined
  if (suit === undefined) return { kind: 'play', card: first }
  return isSuit(suit) ? { kind: 'play', card: first, suit } : undefined
}

/** Whether a value is a card, 0 to 51. */
export function isCard(value: unknown): value is Card {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < DECK
}

/** The whole game, as only the host knows it. */
export interface MiauState {
  /** Every seat's cards. */
  readonly hands: readonly (readonly Card[])[]
  /** The cards to draw from; the last one is drawn first. */
  readonly stock: readonly Card[]
  /** The cards played; the last one is on top. */
  readonly pile: readonly Card[]
  /** The seat whose turn it is. */
  readonly turn: number
  /** The suit a jack on top asks for, or null. */
  readonly wish: number | null
  /** Cards the seat whose turn it is must draw for the sevens played on them; 0 if none. */
  readonly penalty: number
  /** The card the seat whose turn it is just drew, and may still play; null if none. */
  readonly drawn: Card | null
  /** Turns in a row in which nobody could draw or play: as many as seats make a draw. */
  readonly passes: number
  /** The seat who played their last card, or null while the game goes on. */
  readonly winner: number | null
}

/** What one seat may see of the game: their own hand, and how many cards everyone holds. */
export interface MiauView {
  /** This seat's cards; none for those who watch. */
  readonly hand: readonly Card[]
  /** How many cards each seat holds. */
  readonly counts: readonly number[]
  readonly top: Card
  /** How many cards are left to draw. */
  readonly stock: number
  /** How many cards are on the pile, the top one too. */
  readonly pile: number
  readonly turn: number
  readonly wish: number | null
  readonly penalty: number
  /** The card this seat just drew and may still play, only on their own turn. */
  readonly drawn: Card | null
  readonly winner: number | null
  /** Whether the game ended in a draw. */
  readonly stuck: boolean
}

/** The cards a game for `seats` players is played with. */
export function deck(seats: number): Card[] {
  const lowest = seats > 4 ? 0 : SEVEN
  const cards: Card[] = []
  for (let suit = 0; suit < SUITS; suit++) {
    for (let rank = lowest; rank < RANKS; rank++) cards.push(suit * RANKS + rank)
  }
  return cards
}

/** The cards in a random order: `random` gives numbers from 0 up to, not including, 1. */
export function shuffle<T>(cards: readonly T[], random: () => number): T[] {
  const result = [...cards]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)))
    const swap = result[i] as T
    result[i] = result[j] as T
    result[j] = swap
  }
  return result
}

/** A new game: shuffles, deals five cards to each seat, and turns up the first card. */
export function deal(seats: number, random: () => number): MiauState {
  if (!Number.isInteger(seats) || seats < MIN_SEATS || seats > MAX_SEATS) {
    throw new RangeError(`Miau-Miau is for ${MIN_SEATS} to ${MAX_SEATS} players`)
  }
  const stock = shuffle(deck(seats), random)
  const hands: Card[][] = []
  for (let seat = 0; seat < seats; seat++) hands.push(stock.splice(-HAND))
  const top = stock.pop() as Card
  return {
    hands,
    stock,
    pile: [top],
    turn: 0,
    wish: null,
    penalty: 0,
    drawn: null,
    passes: 0,
    winner: null,
  }
}

/** Whether a card may go on `top`, with the wished suit and the sevens' penalty as given. */
export function fits(card: Card, top: Card, wish: number | null, penalty: number): boolean {
  if (penalty > 0) return rankOf(card) === SEVEN
  if (rankOf(card) === JACK) return true
  if (wish !== null) return suitOf(card) === wish
  return suitOf(card) === suitOf(top) || rankOf(card) === rankOf(top)
}

/** How the game ended: the seat who won, 'draw', or null while it goes on. */
export function outcome(state: MiauState): number | 'draw' | null {
  if (state.winner !== null) return state.winner
  return state.passes >= state.hands.length ? 'draw' : null
}

/** Whether `seat` may make this move now. */
export function legal(state: MiauState, seat: number, move: MiauMove): boolean {
  return seat === state.turn && allowed(view(state, seat), move)
}

/**
 * Whether the seat whose view this is may make this move now: the same answer as `legal`, from
 * what the seat sees, so that a phone can tell which of its cards it may play.
 */
export function allowed(view: MiauView, move: MiauMove): boolean {
  if (view.winner !== null || view.stuck) return false
  const canDraw = view.stock > 0 || view.pile > 1
  switch (move.kind) {
    case 'play': {
      if (!view.hand.includes(move.card)) return false
      if (view.drawn !== null && move.card !== view.drawn) return false
      const jack = rankOf(move.card) === JACK
      if (jack ? !isSuit(move.suit) : move.suit !== undefined) return false
      return fits(move.card, view.top, view.wish, view.penalty)
    }
    case 'draw':
      return view.drawn === null && (view.penalty > 0 || canDraw)
    case 'pass':
      return view.drawn !== null || (view.penalty === 0 && !canDraw)
  }
}

/** Every move the seat whose turn it is may make now; jacks once for each suit. */
export function moves(state: MiauState): MiauMove[] {
  const seat = state.turn
  const all: MiauMove[] = [{ kind: 'draw' }, { kind: 'pass' }]
  for (const card of state.hands[seat] ?? []) {
    if (rankOf(card) === JACK) {
      for (let suit = 0; suit < SUITS; suit++) all.push({ kind: 'play', card, suit })
    } else all.push({ kind: 'play', card })
  }
  return all.filter((move) => legal(state, seat, move))
}

/**
 * The game after `seat`'s move, which must be legal. `random` shuffles the pile into a new
 * stock when the stock runs out.
 */
export function play(
  state: MiauState,
  seat: number,
  move: MiauMove,
  random: () => number,
): MiauState {
  const seats = state.hands.length
  const next = (steps: number) => (seat + steps) % seats
  switch (move.kind) {
    case 'play': {
      const hand = (state.hands[seat] ?? []).filter((card) => card !== move.card)
      const hands = replace(state.hands, seat, hand)
      const rank = rankOf(move.card)
      const played = {
        ...state,
        hands,
        pile: [...state.pile, move.card],
        wish: rank === JACK ? (move.suit ?? null) : null,
        drawn: null,
        passes: 0,
      }
      if (hand.length === 0) return { ...played, penalty: 0, winner: seat }
      if (rank === SEVEN) return { ...played, penalty: state.penalty + 2, turn: next(1) }
      return { ...played, turn: next(rank === EIGHT ? 2 : 1) }
    }
    case 'draw': {
      const count = state.penalty > 0 ? state.penalty : 1
      const { drawn, stock, pile } = draw(state, count, random)
      const hands = replace(state.hands, seat, [...(state.hands[seat] ?? []), ...drawn])
      const after = { ...state, hands, stock, pile, penalty: 0, drawn: null }
      const card = drawn[0]
      if (drawn.length === 0) return { ...after, turn: next(1), passes: state.passes + 1 }
      // A card drawn for sevens may not be played at once; a card drawn by choice may, if it fits.
      if (state.penalty === 0 && card !== undefined && fits(card, top(after), state.wish, 0)) {
        return { ...after, drawn: card, passes: 0 }
      }
      return { ...after, turn: next(1), passes: 0 }
    }
    case 'pass':
      return {
        ...state,
        drawn: null,
        turn: next(1),
        passes: state.drawn === null ? state.passes + 1 : 0,
      }
  }
}

/** What `seat` may see of the game; a seat of -1, or any that does not play, only watches. */
export function view(state: MiauState, seat: number): MiauView {
  return {
    hand: state.hands[seat] ?? [],
    counts: state.hands.map((hand) => hand.length),
    top: top(state),
    stock: state.stock.length,
    pile: state.pile.length,
    turn: state.turn,
    wish: state.wish,
    penalty: state.penalty,
    drawn: seat === state.turn ? state.drawn : null,
    winner: state.winner,
    stuck: outcome(state) === 'draw',
  }
}

/** Whether a value is a suit, 0 to 3. */
export function isSuit(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < SUITS
}

function top(state: MiauState): Card {
  return state.pile[state.pile.length - 1] as Card
}

/** Takes up to `count` cards from the stock, turning the pile into a new stock when it runs out. */
function draw(
  state: MiauState,
  count: number,
  random: () => number,
): { drawn: Card[]; stock: Card[]; pile: Card[] } {
  let stock = [...state.stock]
  let pile = [...state.pile]
  const drawn: Card[] = []
  while (drawn.length < count) {
    if (stock.length === 0) {
      if (pile.length <= 1) break
      stock = shuffle(pile.slice(0, -1), random)
      pile = pile.slice(-1)
    }
    drawn.push(stock.pop() as Card)
  }
  return { drawn, stock, pile }
}

function replace<T>(list: readonly T[], index: number, value: T): T[] {
  return list.map((item, i) => (i === index ? value : item))
}
