/**
 * Sea Battle (_Schiffe versenken_), as pure rules: two players, each with a fleet hidden on a
 * sea of 10 by 10 squares. They shoot at each other's sea in turns, one square a shot; whoever
 * sinks the whole other fleet first wins.
 *
 * - Each player first places their fleet: one ship of five squares, one of four, two of three
 *   and one of two, each straight across or down. Ships may not touch, not even at a corner.
 *   Both players place at the same time; the shooting starts once both fleets are on the sea.
 * - A shot that hits a ship lets its player shoot again; a miss passes the turn on.
 * - A ship is sunk once every one of its squares is hit, and both players learn which it was.
 *   As ships never touch, the squares around a sunk ship are water, and nobody shoots there.
 *
 * Seat 0 shoots first.
 */

/** Squares on each side of the sea. */
export const SEA = 10
export const SEA_CELLS = SEA * SEA
/** The sizes of the ships in a fleet, in the order a fleet lists them. */
export const FLEET = [5, 4, 3, 3, 2] as const
export const SEA_SEATS = 2

/** A ship: its first square, the top or left one, whether it lies down or across, its size. */
export interface Ship {
  readonly cell: number
  readonly down: boolean
  readonly size: number
}

export type Fleet = readonly Ship[]

/** A move: placing a whole fleet, or a shot at a square of the other player's sea. */
export type SeaMove =
  | { readonly kind: 'place'; readonly fleet: Fleet }
  | { readonly kind: 'shoot'; readonly cell: number }

/** The whole game, as only the host knows it. */
export interface SeaState {
  /** Every seat's fleet, null until placed. */
  readonly fleets: readonly (Fleet | null)[]
  /** The squares each seat has shot at in the other's sea, in order. */
  readonly shots: readonly (readonly number[])[]
  /** The seat whose turn it is to shoot. */
  readonly turn: number
  /** The seat who sank the other's fleet, or null while the game goes on. */
  readonly winner: number | null
}

/** One sea as everyone may see it: the shots that fell on it, which hit, and the ships sunk. */
export interface SeaSide {
  readonly shots: readonly number[]
  /** The shots that hit a ship, in the order they fell. */
  readonly hits: readonly number[]
  readonly sunk: Fleet
}

/** What one seat may see of the game: their own fleet, and every shot and what it did. */
export interface SeaView {
  /** Each seat's fleet as this seat may see it: their own, and all of them once the game is over. */
  readonly fleets: readonly (Fleet | null)[]
  /** Which seats have placed their fleet. */
  readonly placed: readonly boolean[]
  /** Each seat's sea, by the seat whose fleet is in it. */
  readonly seas: readonly SeaSide[]
  readonly turn: number
  readonly winner: number | null
}

/** A move as numbers, as the table and the protocol carry it: see `decode`. */
export function encode(move: SeaMove): number[] {
  if (move.kind === 'shoot') return [move.cell]
  return move.fleet.map((ship) => ship.cell + (ship.down ? SEA_CELLS : 0))
}

/**
 * The move these numbers stand for, or undefined: one number is a shot at that square; one for
 * each ship of the fleet places it, at its square, plus SEA_CELLS for a ship lying down.
 */
export function decode(numbers: readonly number[]): SeaMove | undefined {
  if (!numbers.every((n) => Number.isInteger(n))) return undefined
  if (numbers.length === 1) {
    const cell = numbers[0] as number
    return isCell(cell) ? { kind: 'shoot', cell } : undefined
  }
  if (numbers.length !== FLEET.length) return undefined
  if (!numbers.every((n) => n >= 0 && n < 2 * SEA_CELLS)) return undefined
  const fleet = numbers.map((n, i) => ({
    cell: n % SEA_CELLS,
    down: n >= SEA_CELLS,
    size: FLEET[i] as number,
  }))
  return { kind: 'place', fleet }
}

/** Whether a value is a square of a sea, 0 to 99. */
export function isCell(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < SEA_CELLS
}

/** The squares a ship covers, or null if it does not fit on the sea. */
export function shipCells(ship: Ship): number[] | null {
  if (!isCell(ship.cell) || !Number.isInteger(ship.size) || ship.size < 1) return null
  const x = ship.cell % SEA
  const y = Math.floor(ship.cell / SEA)
  if ((ship.down ? y : x) + ship.size > SEA) return null
  return Array.from({ length: ship.size }, (_, i) => ship.cell + i * (ship.down ? SEA : 1))
}

/** The squares around a ship, at its sides and corners, that are on the sea. */
export function around(ship: Ship): number[] {
  const cells = shipCells(ship) ?? []
  const result = new Set<number>()
  for (const cell of cells) {
    const x = cell % SEA
    const y = Math.floor(cell / SEA)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= SEA || ny < 0 || ny >= SEA) continue
        result.add(ny * SEA + nx)
      }
    }
  }
  for (const cell of cells) result.delete(cell)
  return [...result].sort((a, b) => a - b)
}

/** Whether `ship` fits on the sea beside the ships of `others`, touching none of them. */
export function fitsBeside(others: Fleet, ship: Ship): boolean {
  const cells = shipCells(ship)
  if (!cells) return false
  const taken = new Set(others.flatMap((other) => [...(shipCells(other) ?? []), ...around(other)]))
  return cells.every((cell) => !taken.has(cell))
}

/** Whether a fleet has every ship of FLEET, in its order, on the sea, none touching another. */
export function isFleet(fleet: Fleet): boolean {
  if (fleet.length !== FLEET.length) return false
  return fleet.every(
    (ship, i) =>
      ship.size === FLEET[i] &&
      typeof ship.down === 'boolean' &&
      fitsBeside(fleet.slice(0, i), ship),
  )
}

/** A fleet placed at random: `random` gives numbers from 0 up to, not including, 1. */
export function randomFleet(random: () => number): Ship[] {
  for (;;) {
    const fleet: Ship[] = []
    for (const size of FLEET) {
      for (let tries = 0; tries < 200; tries++) {
        const ship = {
          cell: Math.min(SEA_CELLS - 1, Math.floor(random() * SEA_CELLS)),
          down: random() < 0.5,
          size,
        }
        if (fitsBeside(fleet, ship)) {
          fleet.push(ship)
          break
        }
      }
    }
    if (fleet.length === FLEET.length) return fleet
  }
}

/** A new game: no fleet placed yet, no shot fired. */
export function start(): SeaState {
  return { fleets: [null, null], shots: [[], []], turn: 0, winner: null }
}

/** Whether the players are still placing their fleets. */
export function placing(state: { readonly placed: readonly boolean[] }): boolean {
  return state.placed.some((placed) => !placed)
}

/** The seat who places next, while they place: the first who has not; null once all have. */
export function nextToPlace(state: { readonly placed: readonly boolean[] }): number | null {
  const seat = state.placed.indexOf(false)
  return seat < 0 ? null : seat
}

/** The seat whose sea `seat` shoots at. */
export const target = (seat: number): number => 1 - seat

/** How the game ended: the seat who won, or null while it goes on. */
export function outcome(state: SeaState): number | null {
  return state.winner
}

/** Whether `seat` may make this move now. */
export function legal(state: SeaState, seat: number, move: SeaMove): boolean {
  return allowed(view(state, seat), seat, move)
}

/**
 * Whether `seat`, whose view this is, may make this move now: the same answer as `legal`, from
 * what the seat sees, so that a phone can tell where it may shoot.
 */
export function allowed(view: SeaView, seat: number, move: SeaMove): boolean {
  if (view.winner !== null || seat < 0 || seat >= SEA_SEATS) return false
  if (move.kind === 'place') return view.placed[seat] === false && isFleet(move.fleet)
  if (placing(view) || seat !== view.turn) return false
  const sea = view.seas[target(seat)]
  return sea !== undefined && isCell(move.cell) && !known(sea).has(move.cell)
}

/** The squares of a sea nobody needs to shoot at: those shot at, and the water around sunk ships. */
export function known(sea: SeaSide): Set<number> {
  return new Set([...sea.shots, ...sea.sunk.flatMap(around)])
}

/** The game after `seat`'s move, which must be legal. */
export function play(state: SeaState, seat: number, move: SeaMove): SeaState {
  if (move.kind === 'place') {
    return { ...state, fleets: state.fleets.map((fleet, i) => (i === seat ? move.fleet : fleet)) }
  }
  const shots = state.shots.map((list, i) => (i === seat ? [...list, move.cell] : list))
  const fleet = state.fleets[target(seat)] ?? []
  const hit = fleet.some((ship) => shipCells(ship)?.includes(move.cell))
  const after = { ...state, shots }
  if (!hit) return { ...after, turn: target(seat) }
  const fired = new Set(shots[seat])
  const allSunk = fleet.every((ship) => (shipCells(ship) ?? []).every((cell) => fired.has(cell)))
  return allSunk ? { ...after, winner: seat } : after
}

/** One sea as everyone sees it: the shots of `shooter` at the fleet in it. */
function side(fleet: Fleet | null, shots: readonly number[]): SeaSide {
  const ships = fleet ?? []
  const fired = new Set(shots)
  const cells = new Set(ships.flatMap((ship) => shipCells(ship) ?? []))
  return {
    shots,
    hits: shots.filter((cell) => cells.has(cell)),
    sunk: ships.filter((ship) => (shipCells(ship) ?? []).every((cell) => fired.has(cell))),
  }
}

/** What `seat` may see of the game; a seat of -1, or any that does not play, only watches. */
export function view(state: SeaState, seat: number): SeaView {
  const over = state.winner !== null
  return {
    fleets: state.fleets.map((fleet, i) => (i === seat || over ? fleet : null)),
    placed: state.fleets.map((fleet) => fleet !== null),
    seas: state.fleets.map((fleet, owner) => side(fleet, state.shots[target(owner)] ?? [])),
    turn: state.turn,
    winner: state.winner,
  }
}

/** The ships of a sea not yet sunk, by size, for the player hunting them. */
export function afloat(sea: SeaSide): number[] {
  const left: number[] = [...FLEET]
  for (const ship of sea.sunk) {
    const index = left.indexOf(ship.size)
    if (index >= 0) left.splice(index, 1)
  }
  return left
}
