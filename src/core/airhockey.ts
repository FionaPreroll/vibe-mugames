/**
 * Air hockey, in real time, as pure rules: two players, each with a mallet in their own half
 * of the rink, hit a puck that glides and bounces off the sides. A puck that slides into a
 * goal is a point for the other player; the first to GOALS_TO_WIN wins.
 *
 * The rink is WIDTH wide and LENGTH long, seat 0's goal at y = 0 and seat 1's at y = LENGTH.
 * Laid out on two phones, top edge to top edge, each phone shows its player's half, with their
 * own goal at the bottom. Players say where they want their mallet in their own half, as they
 * see it (`Target`); the mallet slides there, fast but not at once, so that it hits the puck
 * on its way instead of jumping through it.
 */

export const WIDTH = 1
export const HALF = 1.5
export const LENGTH = 2 * HALF
export const MALLET = 0.08
export const PUCK = 0.05
export const GOAL_WIDTH = 0.4
export const GOALS_TO_WIN = 7
/** Seconds before the first face-off, and after each goal. */
export const COUNTDOWN = 3
export const AFTER_GOAL = 1.5
/** Speeds in rink lengths a second. */
export const MALLET_SPEED = 6
export const MAX_PUCK_SPEED = 4.5
/** How much speed the puck keeps bouncing off a side, and what it loses a second gliding. */
const BOUNCE = 0.9
const HIT = 0.95
const FRICTION = 0.15
/** The simulation's own step, in seconds: small enough that nothing jumps through anything. */
const SUBSTEP = 1 / 240

export interface Disc {
  readonly x: number
  readonly y: number
  readonly vx: number
  readonly vy: number
}

/** Where a player wants their mallet: across their half from their left, and up from their goal. */
export interface Target {
  readonly x: number
  readonly y: number
}

export interface HockeyState {
  readonly puck: Disc
  /** By seat. */
  readonly mallets: readonly [Disc, Disc]
  /** Goals scored, by seat. */
  readonly goals: readonly [number, number]
  /** Seconds before the puck is free; it waits on its spot until then. */
  readonly pause: number
  /** The seat that scored last, while the puck waits after the goal; else null. */
  readonly scored: number | null
}

export type HockeyView = HockeyState

const still = (x: number, y: number): Disc => ({ x, y, vx: 0, vy: 0 })

/** Where a seat's mallet waits at a face-off: in front of its goal. */
function home(seat: number): Disc {
  return still(WIDTH / 2, seat === 0 ? 0.3 : LENGTH - 0.3)
}

/** A game before the first face-off: the puck in the middle, the mallets at their goals. */
export function start(): HockeyState {
  return {
    puck: still(WIDTH / 2, HALF),
    mallets: [home(0), home(1)],
    goals: [0, 0],
    pause: COUNTDOWN,
    scored: null,
  }
}

/** A point in seat `seat`'s own view of their half, as a point on the rink. */
export function toRink(seat: number, target: Target): { x: number; y: number } {
  return seat === 0 ? { x: target.x, y: target.y } : { x: WIDTH - target.x, y: LENGTH - target.y }
}

/** A point on the rink as seat `seat` sees it from their end. */
export function fromRink(seat: number, point: { x: number; y: number }): Target {
  return toRink(seat, point)
}

/** Where a seat's mallet may be: inside the rink, in its own half. */
export function clampMallet(
  seat: number,
  point: { x: number; y: number },
): { x: number; y: number } {
  const x = clamp(point.x, MALLET, WIDTH - MALLET)
  const y =
    seat === 0
      ? clamp(point.y, MALLET, HALF - MALLET)
      : clamp(point.y, HALF + MALLET, LENGTH - MALLET)
  return { x, y }
}

/** Whether a target is a point a player can mean: finite, and about the size of their half. */
export function isTarget(x: number, y: number): boolean {
  return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x) <= 2 && Math.abs(y) <= 2 * HALF
}

/** The game `seconds` later, with each seat's mallet sliding towards its target (or staying). */
export function advance(
  state: HockeyState,
  targets: readonly (Target | null)[],
  seconds: number,
): HockeyState {
  if (outcome(state) !== null) return state
  let next = state
  // A long pause, such as a page in the background, does not run the game on for minutes.
  let left = Math.min(Math.max(0, seconds), 2)
  while (left > 1e-9) {
    const dt = Math.min(SUBSTEP, left)
    next = substep(next, targets, dt)
    left -= dt
    if (outcome(next) !== null) break
  }
  return next
}

function substep(state: HockeyState, targets: readonly (Target | null)[], dt: number): HockeyState {
  const mallets = state.mallets.map((mallet, seat) => {
    const target = targets[seat]
    const aim = target && isTarget(target.x, target.y) ? toRink(seat, target) : mallet
    const goal = clampMallet(seat, aim)
    const dx = goal.x - mallet.x
    const dy = goal.y - mallet.y
    const distance = Math.hypot(dx, dy)
    const reach = MALLET_SPEED * dt
    const share = distance > reach ? reach / distance : 1
    const x = mallet.x + dx * share
    const y = mallet.y + dy * share
    return { x, y, vx: (x - mallet.x) / dt, vy: (y - mallet.y) / dt }
  }) as unknown as [Disc, Disc]

  if (state.pause > 0) {
    const pause = Math.max(0, state.pause - dt)
    return { ...state, mallets, pause, scored: pause > 0 ? state.scored : null }
  }

  const slow = Math.max(0, 1 - FRICTION * dt)
  let puck: Disc = {
    x: state.puck.x + state.puck.vx * dt,
    y: state.puck.y + state.puck.vy * dt,
    vx: state.puck.vx * slow,
    vy: state.puck.vy * slow,
  }
  for (const mallet of mallets) puck = hit(puck, mallet)
  puck = bounce(puck)

  // A goal, once the puck is past the goal line by its middle.
  const scorer = puck.y < 0 ? 1 : puck.y > LENGTH ? 0 : null
  if (scorer !== null) {
    const goals: [number, number] = [...state.goals]
    goals[scorer] = (goals[scorer] ?? 0) + 1
    // The puck goes to the player who let the goal in, on their side.
    const conceded = 1 - scorer
    return {
      puck: still(WIDTH / 2, conceded === 0 ? HALF / 2 : LENGTH - HALF / 2),
      mallets,
      goals,
      pause: AFTER_GOAL,
      scored: scorer,
    }
  }
  return { ...state, puck, mallets }
}

/** The puck after touching a mallet: pushed off it, and sent away as hard as it was hit. */
export function hit(puck: Disc, mallet: Disc): Disc {
  const dx = puck.x - mallet.x
  const dy = puck.y - mallet.y
  const distance = Math.hypot(dx, dy)
  const touch = PUCK + MALLET
  if (distance >= touch) return puck
  // Right on top of each other: push it towards the far end.
  const nx = distance > 1e-9 ? dx / distance : 0
  const ny = distance > 1e-9 ? dy / distance : mallet.y < HALF ? 1 : -1
  const x = mallet.x + nx * touch
  const y = mallet.y + ny * touch
  const closing = (puck.vx - mallet.vx) * nx + (puck.vy - mallet.vy) * ny
  if (closing >= 0) return { ...puck, x, y }
  return limit({
    x,
    y,
    vx: puck.vx - (1 + HIT) * closing * nx,
    vy: puck.vy - (1 + HIT) * closing * ny,
  })
}

/** The puck off the sides, and off the ends beside the goals. */
export function bounce(puck: Disc): Disc {
  let { x, y, vx, vy } = puck
  if (x < PUCK) {
    x = PUCK
    vx = Math.abs(vx) * BOUNCE
  } else if (x > WIDTH - PUCK) {
    x = WIDTH - PUCK
    vx = -Math.abs(vx) * BOUNCE
  }
  const inMouth = Math.abs(x - WIDTH / 2) < GOAL_WIDTH / 2 - PUCK / 2
  if (!inMouth && y < PUCK) {
    y = PUCK
    vy = Math.abs(vy) * BOUNCE
  } else if (!inMouth && y > LENGTH - PUCK) {
    y = LENGTH - PUCK
    vy = -Math.abs(vy) * BOUNCE
  }
  return { x, y, vx, vy }
}

function limit(puck: Disc): Disc {
  const speed = Math.hypot(puck.vx, puck.vy)
  if (speed <= MAX_PUCK_SPEED) return puck
  const share = MAX_PUCK_SPEED / speed
  return { ...puck, vx: puck.vx * share, vy: puck.vy * share }
}

/** The seat that has scored GOALS_TO_WIN goals, or null while the game goes on. */
export function outcome(state: HockeyState): number | null {
  const winner = state.goals.findIndex((goals) => goals >= GOALS_TO_WIN)
  return winner < 0 ? null : winner
}

/** The game as every phone sees it, rounded: a few digits are plenty for drawing. */
export function view(state: HockeyState): HockeyView {
  const disc = (d: Disc): Disc => ({
    x: round(d.x),
    y: round(d.y),
    vx: round(d.vx),
    vy: round(d.vy),
  })
  return {
    puck: disc(state.puck),
    mallets: [disc(state.mallets[0]), disc(state.mallets[1])],
    goals: state.goals,
    pause: Math.round(state.pause * 10) / 10,
    scored: state.scored,
  }
}

/**
 * Where the puck is `seconds` after a view of it, gliding as the rules let it, for phones that
 * draw it between the host's states.
 */
export function glide(puck: Disc, seconds: number): Disc {
  return bounce({
    x: puck.x + puck.vx * seconds,
    y: puck.y + puck.vy * seconds,
    vx: puck.vx,
    vy: puck.vy,
  })
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000
}
