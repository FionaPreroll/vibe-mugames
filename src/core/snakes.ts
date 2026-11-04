import { isWant, turn, type Want } from './lichtrenner'

/**
 * Snakes, in real time, as pure rules: two to six snakes crawl across a grid at once, each
 * steered by its player. A snake that eats an apple grows by one; one that crawls into the
 * edge, into itself or into another snake is out. The first snake as long as WIN_LENGTH wins,
 * or the last one still crawling. Snakes out of the game leave the grid free where they lay.
 *
 * Snakes move one cell a step, STEPS_PER_SECOND steps a second, after a countdown, and turn as
 * Lichtrenner's riders do: a quarter turn a step, never straight back (`turn`), with the same
 * input, a heading plus 4 for a turn to the left.
 */

export const COLUMNS = 24
export const ROWS = 24
export const CELLS = COLUMNS * ROWS
export const MIN_SNAKES = 2
export const MAX_SNAKES = 6
export const STEPS_PER_SECOND = 7
/** Seconds before the snakes start. */
export const COUNTDOWN = 3
export const START_LENGTH = 3
/** A snake this long wins. */
export const WIN_LENGTH = 15

export { isWant, type Want }

export interface Snake {
  /** The snake's cells, head first: each next to the one before. */
  readonly body: readonly number[]
  /** Where the head is heading: 0 up, 1 right, 2 down, 3 left. */
  readonly heading: number
  readonly alive: boolean
}

export interface SnakesState {
  readonly snakes: readonly Snake[]
  /** The cells with an apple: one more than there are snakes. */
  readonly apples: readonly number[]
  /** Seconds before the start; 0 once the snakes crawl. */
  readonly countdown: number
  /** Seconds of crawling not yet made into a step. */
  readonly clock: number
  /** Steps crawled so far. */
  readonly steps: number
}

/** What every phone sees: all of it but the time not yet made into a step. */
export type SnakesView = Omit<SnakesState, 'clock'>

export const columnOf = (cell: number): number => cell % COLUMNS
export const rowOf = (cell: number): number => Math.floor(cell / COLUMNS)

/** The cell one step from `cell` towards `heading`, or null past the edge. */
export function ahead(cell: number, heading: number): number | null {
  const column = columnOf(cell) + (heading === 1 ? 1 : heading === 3 ? -1 : 0)
  const row = rowOf(cell) + (heading === 2 ? 1 : heading === 0 ? -1 : 0)
  if (column < 0 || column >= COLUMNS || row < 0 || row >= ROWS) return null
  return row * COLUMNS + column
}

/** How many apples lie on the grid for `snakes` snakes. */
export const appleCount = (snakes: number): number => snakes + 1

/**
 * Where snakes start: half of them on the left, heading right, the others on the right,
 * heading left, spread out from top to bottom, each with its tail behind it.
 */
export function starts(snakes: number): Snake[] {
  const left = Math.ceil(snakes / 2)
  const right = snakes - left
  return Array.from({ length: snakes }, (_, seat) => {
    const side = seat % 2
    const index = Math.floor(seat / 2)
    const count = side === 0 ? left : right
    const row = Math.min(Math.round(((index + 1) * ROWS) / (count + 1)), ROWS - 1)
    const head = side === 0 ? START_LENGTH + 1 : COLUMNS - START_LENGTH - 2
    const back = side === 0 ? -1 : 1
    const body = Array.from({ length: START_LENGTH }, (_, i) => row * COLUMNS + head + i * back)
    return { body, heading: side === 0 ? 1 : 3, alive: true }
  })
}

/** A game of `snakes` snakes before the countdown, with its apples placed by `random`. */
export function start(snakes: number, random: () => number): SnakesState {
  if (snakes < MIN_SNAKES || snakes > MAX_SNAKES) throw new RangeError(`${snakes} snakes`)
  const placed = starts(snakes)
  return {
    snakes: placed,
    apples: refill(placed, [], appleCount(snakes), random),
    countdown: COUNTDOWN,
    clock: 0,
    steps: 0,
  }
}

/** The apples, with new ones on free cells until there are `count`. */
function refill(
  snakes: readonly Snake[],
  apples: readonly number[],
  count: number,
  random: () => number,
): number[] {
  const taken = new Set([...apples, ...snakes.flatMap((snake) => (snake.alive ? snake.body : []))])
  const free = Array.from({ length: CELLS }, (_, cell) => cell).filter((cell) => !taken.has(cell))
  const next = [...apples]
  while (next.length < count && free.length > 0) {
    const index = Math.min(free.length - 1, Math.floor(random() * free.length))
    next.push(...free.splice(index, 1))
  }
  return next
}

/**
 * One step: every snake still in turns as its player wants and crawls on, all at once. A tail
 * moves away in the same step, so a head may follow it; a snake that eats keeps its tail.
 */
export function step(
  state: SnakesState,
  wants: readonly (Want | null)[],
  random: () => number,
): SnakesState {
  const headings = state.snakes.map((snake, seat) =>
    snake.alive ? turn(snake.heading, wants[seat] ?? null) : snake.heading,
  )
  const targets = state.snakes.map((snake, seat) => {
    const head = snake.body[0]
    return snake.alive && head !== undefined ? ahead(head, headings[seat] ?? snake.heading) : null
  })
  const eats = targets.map((target) => target !== null && state.apples.includes(target))
  const blocked = new Set<number>()
  for (const [seat, snake] of state.snakes.entries()) {
    if (!snake.alive) continue
    const body = eats[seat] ? snake.body : snake.body.slice(0, -1)
    for (const cell of body) blocked.add(cell)
  }
  const crashed = state.snakes.map((snake, seat) => {
    if (!snake.alive) return false
    const target = targets[seat] ?? null
    if (target === null || blocked.has(target)) return true
    // Two heads into the same cell: both are out.
    return targets.some((other, i) => i !== seat && other === target)
  })
  const snakes = state.snakes.map((snake, seat): Snake => {
    const heading = headings[seat] ?? snake.heading
    const target = targets[seat]
    if (!snake.alive) return snake
    if (crashed[seat] || target === null || target === undefined) {
      return { body: snake.body, heading, alive: false }
    }
    const body = eats[seat] ? [target, ...snake.body] : [target, ...snake.body.slice(0, -1)]
    return { body, heading, alive: true }
  })
  const eaten = new Set(targets.filter((target, seat) => eats[seat] && !crashed[seat]))
  const apples = refill(
    snakes,
    state.apples.filter((apple) => !eaten.has(apple)),
    appleCount(snakes.length),
    random,
  )
  return { ...state, snakes, apples, steps: state.steps + 1 }
}

/**
 * The game `seconds` later: the countdown runs down, then the snakes take as many steps as the
 * time makes, each with the wants of now. Nothing moves once the game is over.
 */
export function advance(
  state: SnakesState,
  wants: readonly (Want | null)[],
  seconds: number,
  random: () => number,
): SnakesState {
  if (outcome(state) !== null) return state
  let time = Math.max(0, seconds)
  let next = state
  if (next.countdown > 0) {
    const left = next.countdown - time
    if (left > 0) return { ...next, countdown: left }
    time = -left
    next = { ...next, countdown: 0 }
  }
  let clock = next.clock + time
  const stepTime = 1 / STEPS_PER_SECOND
  while (clock >= stepTime && outcome(next) === null) {
    next = step(next, wants, random)
    clock -= stepTime
  }
  return { ...next, clock: outcome(next) === null ? clock : 0 }
}

/**
 * How the game ended: the seat of the snake that grew to WIN_LENGTH (the longest, if several
 * did at once) or of the last one still in; 'draw' if the last ones went out at once, or as
 * many grew as long at once; null while it goes on.
 */
export function outcome(state: SnakesState | SnakesView): number | 'draw' | null {
  const alive = state.snakes.flatMap((snake, seat) => (snake.alive ? [seat] : []))
  const grown = alive.filter((seat) => (state.snakes[seat]?.body.length ?? 0) >= WIN_LENGTH)
  if (grown.length > 0) {
    const longest = Math.max(...grown.map((seat) => state.snakes[seat]?.body.length ?? 0))
    const first = grown.filter((seat) => state.snakes[seat]?.body.length === longest)
    return first.length === 1 ? (first[0] ?? 'draw') : 'draw'
  }
  if (alive.length > 1) return null
  return alive[0] ?? 'draw'
}

/** The game as every phone sees it. */
export function view(state: SnakesState): SnakesView {
  return {
    snakes: state.snakes,
    apples: state.apples,
    countdown: Math.round(state.countdown * 10) / 10,
    steps: state.steps,
  }
}

/** Whether cells make a snake's body: on the grid, each next to the one before, none twice. */
export function isBody(body: readonly number[]): boolean {
  if (body.length === 0 || body.length > WIN_LENGTH) return false
  if (new Set(body).size !== body.length) return false
  return body.every((cell, i) => {
    if (!Number.isInteger(cell) || cell < 0 || cell >= CELLS) return false
    const before = body[i - 1]
    if (before === undefined) return true
    return [0, 1, 2, 3].some((heading) => ahead(before, heading) === cell)
  })
}
