/**
 * Lichtrenner (Light Racers), the Spielekiste's first game in real time, as pure rules: two to
 * six riders race across a grid, each leaving a wall of light behind. Whoever rides into a
 * wall, the edge or another rider is out; the last one riding wins. Riders who crash in the
 * same step as the last others make a draw.
 *
 * Riders move one cell a step, STEPS_PER_SECOND steps a second, after a countdown. Each step,
 * a rider turns to the heading its player wants, if that is a quarter turn: a rider cannot turn
 * back on itself. A player who wants the heading straight back, by turning twice before the
 * next step, gets the first of those turns now and the second a step later.
 */

export const COLUMNS = 40
export const ROWS = 40
export const CELLS = COLUMNS * ROWS
export const MIN_RIDERS = 2
export const MAX_RIDERS = 6
export const STEPS_PER_SECOND = 10
/** Seconds before the riders start. */
export const COUNTDOWN = 3

/** Where a rider heads, clockwise: 0 up, 1 right, 2 down, 3 left. */
export type Heading = number

/**
 * What a player wants, as the input carries it: a heading, plus 4 if their last turn was to
 * the left, so that a heading straight back is reached the same way round as it was asked for.
 */
export type Want = number

export const WANTS = 8

export interface Rider {
  /** The cells where the rider's wall starts and turns, and last its head. */
  readonly path: readonly number[]
  readonly heading: Heading
  readonly alive: boolean
}

export interface LichtState {
  readonly riders: readonly Rider[]
  /** Every cell: EMPTY (-1) or the seat whose wall is there. */
  readonly walls: readonly number[]
  /** Seconds before the start; 0 once the riders ride. */
  readonly countdown: number
  /** Seconds of riding not yet made into a step. */
  readonly clock: number
  /** Steps ridden so far. */
  readonly steps: number
}

/** What every phone sees of a race: the riders and their walls, as paths. */
export interface LichtView {
  readonly riders: readonly Rider[]
  readonly countdown: number
  readonly steps: number
}

const EMPTY = -1

export const columnOf = (cell: number): number => cell % COLUMNS
export const rowOf = (cell: number): number => Math.floor(cell / COLUMNS)

/** The cell one step from `cell` towards `heading`, or null past the edge. */
export function ahead(cell: number, heading: Heading): number | null {
  const column = columnOf(cell) + (heading === 1 ? 1 : heading === 3 ? -1 : 0)
  const row = rowOf(cell) + (heading === 2 ? 1 : heading === 0 ? -1 : 0)
  if (column < 0 || column >= COLUMNS || row < 0 || row >= ROWS) return null
  return row * COLUMNS + column
}

/**
 * Where riders start: half of them on the left, heading right, the others on the right,
 * heading left, spread out from top to bottom.
 */
export function starts(riders: number): { cell: number; heading: Heading }[] {
  const left = Math.ceil(riders / 2)
  const right = riders - left
  return Array.from({ length: riders }, (_, seat) => {
    const side = seat % 2
    const index = Math.floor(seat / 2)
    const count = side === 0 ? left : right
    const row = Math.round(((index + 1) * ROWS) / (count + 1))
    const column = side === 0 ? 4 : COLUMNS - 5
    return { cell: Math.min(row, ROWS - 1) * COLUMNS + column, heading: side === 0 ? 1 : 3 }
  })
}

/** A race of `riders` riders, before the countdown. */
export function start(riders: number): LichtState {
  if (riders < MIN_RIDERS || riders > MAX_RIDERS) throw new RangeError(`${riders} riders`)
  const walls: number[] = Array(CELLS).fill(EMPTY)
  const placed = starts(riders).map(({ cell, heading }, seat) => {
    walls[cell] = seat
    return { path: [cell], heading, alive: true }
  })
  return { riders: placed, walls, countdown: COUNTDOWN, clock: 0, steps: 0 }
}

/** Whether a number is a want: a heading, maybe with the left-turn mark. */
export function isWant(value: number): value is Want {
  return Number.isInteger(value) && value >= 0 && value < WANTS
}

/** The heading a rider takes, heading `heading`, for a player who wants `want`. */
export function turn(heading: Heading, want: Want | null): Heading {
  if (want === null) return heading
  const wanted = want % 4
  if (wanted === heading) return heading
  // Straight back: one quarter turn now, the way the player turned last.
  if (wanted === (heading + 2) % 4) return want >= 4 ? (heading + 3) % 4 : (heading + 1) % 4
  return wanted
}

/** One step: every rider still riding turns as its player wants and rides on, all at once. */
export function step(state: LichtState, wants: readonly (Want | null)[]): LichtState {
  const headings = state.riders.map((rider, seat) =>
    rider.alive ? turn(rider.heading, wants[seat] ?? null) : rider.heading,
  )
  const targets = state.riders.map((rider, seat) => {
    const head = rider.path[rider.path.length - 1] ?? 0
    return rider.alive ? ahead(head, headings[seat] ?? rider.heading) : null
  })
  const crashed = state.riders.map((rider, seat) => {
    if (!rider.alive) return false
    const target = targets[seat] ?? null
    if (target === null || state.walls[target] !== EMPTY) return true
    // Two riders into the same cell: both crash.
    return targets.some((other, i) => i !== seat && other === target)
  })
  const walls = [...state.walls]
  const riders = state.riders.map((rider, seat): Rider => {
    if (!rider.alive) return rider
    const heading = headings[seat] ?? rider.heading
    const target = targets[seat]
    if (crashed[seat] || target === null || target === undefined) {
      return { path: rider.path, heading, alive: false }
    }
    walls[target] = seat
    return { path: extend(rider.path, target), heading, alive: true }
  })
  return { ...state, riders, walls, steps: state.steps + 1 }
}

/** A path with its head moved on to `cell`: a straight wall grows, a turn starts a new one. */
function extend(path: readonly number[], cell: number): number[] {
  const head = path[path.length - 1]
  const before = path[path.length - 2]
  if (head === undefined || before === undefined) return [...path, cell]
  const straight =
    (rowOf(before) === rowOf(head) && rowOf(head) === rowOf(cell)) ||
    (columnOf(before) === columnOf(head) && columnOf(head) === columnOf(cell))
  return straight ? [...path.slice(0, -1), cell] : [...path, cell]
}

/**
 * The race `seconds` later: the countdown runs down, then the riders take as many steps as the
 * time makes, each with the wants of now. Nothing moves once the race is over.
 */
export function advance(
  state: LichtState,
  wants: readonly (Want | null)[],
  seconds: number,
): LichtState {
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
    next = step(next, wants)
    clock -= stepTime
  }
  return { ...next, clock: outcome(next) === null ? clock : 0 }
}

/** The seat of the last rider riding, 'draw' if the last ones crashed at once, else null. */
export function outcome(state: LichtState): number | 'draw' | null {
  const riding = state.riders.flatMap((rider, seat) => (rider.alive ? [seat] : []))
  if (riding.length > 1) return null
  return riding[0] ?? 'draw'
}

/** The race as every phone sees it: no walls cell by cell, only the riders' paths. */
export function view(state: LichtState): LichtView {
  return {
    riders: state.riders,
    countdown: Math.round(state.countdown * 10) / 10,
    steps: state.steps,
  }
}

/** The cells of a path, from its start to its head: the wall a rider has left so far. */
export function pathCells(path: readonly number[]): number[] {
  const cells: number[] = []
  path.forEach((cell, i) => {
    const from = path[i - 1]
    if (from === undefined) {
      cells.push(cell)
      return
    }
    const dx = Math.sign(columnOf(cell) - columnOf(from))
    const dy = Math.sign(rowOf(cell) - rowOf(from))
    let at = from
    while (at !== cell) {
      at += dy * COLUMNS + dx
      cells.push(at)
    }
  })
  return cells
}

/** Whether a path is made of straight walls on the grid, as `step` lays them. */
export function isPath(path: readonly number[]): boolean {
  if (path.length === 0) return false
  return path.every((cell, i) => {
    if (!Number.isInteger(cell) || cell < 0 || cell >= CELLS) return false
    const from = path[i - 1]
    if (from === undefined) return true
    const sameRow = rowOf(from) === rowOf(cell)
    const sameColumn = columnOf(from) === columnOf(cell)
    return from !== cell && (sameRow || sameColumn)
  })
}
