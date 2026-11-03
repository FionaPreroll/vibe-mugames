import type { Move } from '../core/board'
import {
  afloat,
  allowed,
  around,
  encode,
  type Fleet,
  fitsBeside,
  placing,
  randomFleet,
  SEA,
  SEA_CELLS,
  type SeaSide,
  type SeaView,
  type Ship,
  shipCells,
  target,
} from '../core/seeschlacht'
import type { TableState } from '../core/table'
import { t } from '../i18n'
import { random } from '../random'
import { type Picker, seatName } from './boards'
import { h } from './dom'

/**
 * Sea Battle on the screen: placing a fleet, then the other player's sea to shoot at and the
 * player's own fleet with the shots that fell on it. Each phone gets only its own fleet from the
 * host; a split screen hides it too, until its player asks to see it.
 */

export interface SeaOptions {
  /** The player whose view this is. */
  readonly viewer: number
  /** The fleet being placed, the ship picked, and whether a hidden fleet shows. */
  readonly picker: Picker
  /** Makes a move as the viewer; null when the viewer may not move now. */
  readonly move: ((move: Move) => void) | null
  /** A screen everyone shares: players are named instead of "you". */
  readonly shared: boolean
  /** The viewer's own fleet is hidden, as others see the same screen, unless they ask to see it. */
  readonly hideOwn: boolean
}

/** What the game asks of everyone now, with whose turn it is, or how it ended. */
export function seaStatus(
  state: TableState,
  sea: SeaView,
  viewer: number,
  shared: boolean,
): string {
  const name = (seat: number) => seatName(state, seat)
  const mine = state.seats.indexOf(viewer)
  if (state.outcome !== null && state.outcome !== 'draw') {
    const winner = state.outcome.winner
    return winner === mine && !shared ? t('youWin') : t('theyWin', { name: name(winner) })
  }
  if (placing(sea)) {
    if (mine < 0) return t('watchPlacing')
    if (!sea.placed[mine])
      return shared ? t('placeFleetName', { name: name(mine) }) : t('placeFleet')
    return t('waitPlacing', { name: name(target(mine)) })
  }
  if (mine < 0) return t('watching', { a: name(0), b: name(1) })
  if (shared) return t('yourTurnName', { name: name(sea.turn) })
  return sea.turn === mine ? t('yourTurn') : t('theirTurn', { name: name(sea.turn) })
}

/** Whether the viewer has something to do now: place their fleet, or shoot. */
export function seaToMove(state: TableState, sea: SeaView, viewer: number): boolean {
  const mine = state.seats.indexOf(viewer)
  if (mine < 0 || state.outcome !== null) return false
  return placing(sea) ? !sea.placed[mine] : sea.turn === mine
}

/** What the last shot did, for everyone to learn from; '' before the first. */
export function shotText(state: TableState, sea: SeaView, viewer: number): string {
  const cell = state.last?.length === 1 ? state.last[0] : undefined
  if (cell === undefined || placing(sea)) return ''
  const mine = state.seats.indexOf(viewer)
  // A hit keeps the turn, a miss passes it on: so whoever has the turn hit, or the other missed.
  const hunted = sea.seas[target(sea.turn)]
  const hit = hunted?.hits[hunted.hits.length - 1] === cell && hunted.shots.at(-1) === cell
  const shooter = hit ? sea.turn : target(sea.turn)
  const name = seatName(state, shooter)
  const me = shooter === mine
  if (!hit)
    return me ? t('youMissed', { name: seatName(state, sea.turn) }) : t('theyMissed', { name })
  if (state.outcome !== null) return ''
  const sunk = hunted?.sunk.find((ship) => shipCells(ship)?.includes(cell))
  if (sunk) return me ? t('youSank', { size: sunk.size }) : t('theySank', { name, size: sunk.size })
  return me ? t('youHit') : t('theyHit', { name })
}

/** Sea Battle as one player sees it: placing their fleet, or both seas once the shooting starts. */
export function seaView(state: TableState, sea: SeaView, options: SeaOptions): HTMLElement[] {
  const mine = state.seats.indexOf(options.viewer)
  if (mine >= 0 && !sea.placed[mine] && state.outcome === null) return placement(options)
  const name = (seat: number) => seatName(state, seat)
  const heading = (owner: number) => t('seaOf', { name: name(owner) })
  if (mine < 0) {
    // Those who watch see both seas, and no ship until it sinks.
    return [seas(seaPart(sea, 0, heading(0), 'target'), seaPart(sea, 1, heading(1), 'target'))]
  }
  const shooting = !placing(sea) && seaToMove(state, sea, options.viewer) ? options.move : null
  const other = target(mine)
  const enemy = seaPart(sea, other, heading(other), shooting ? 'target active' : 'target', {
    shoot: shooting,
    viewer: mine,
  })
  const hiding = options.hideOwn && !options.picker.showOwn && state.outcome === null
  const own = seaPart(
    sea,
    mine,
    options.shared ? t('fleetOf', { name: name(mine) }) : t('yourFleet'),
    'own',
    {
      hidden: hiding,
      toggle: options.hideOwn && state.outcome === null ? fleetToggle(options.picker) : null,
    },
  )
  return [seas(enemy, own)]
}

/** The seas side by side where there is room, else one above the other. */
function seas(...parts: HTMLElement[]): HTMLElement {
  return h('div', { class: 'seas' }, ...parts)
}

/** A line of help for the player to move: where to shoot, or how to place. */
export function seaHint(state: TableState, sea: SeaView, viewer: number): string {
  if (!seaToMove(state, sea, viewer)) return ''
  if (placing(sea)) return t('placeHelp')
  return t('shootHelp', { name: seatName(state, target(state.seats.indexOf(viewer))) })
}

/**
 * One sea as a grid of squares, with its heading and the ships still afloat. `shoot` makes its
 * squares a target for `viewer`; `hidden` leaves out the ships not yet sunk; `toggle` shows or
 * hides them.
 */
function seaPart(
  sea: SeaView,
  owner: number,
  heading: string,
  kind: string,
  options: {
    shoot?: ((move: Move) => void) | null
    viewer?: number
    hidden?: boolean
    toggle?: HTMLElement | null
  } = {},
): HTMLElement {
  const side = sea.seas[owner] ?? { shots: [], hits: [], sunk: [] }
  const fleet = options.hidden ? side.sunk : (sea.fleets[owner] ?? side.sunk)
  const shoot = options.shoot ?? null
  const viewer = options.viewer ?? -1
  const grid = seaGrid({
    fleet,
    side,
    kind,
    open: (cell) => shoot !== null && allowed(sea, viewer, { kind: 'shoot', cell }),
    tap: (cell) => shoot?.(encode({ kind: 'shoot', cell })),
  })
  grid.dataset.owner = String(owner)
  return h(
    'div',
    { class: `sea-part ${kind.split(' ')[0]}` },
    h('div', { class: 'sea-heading' }, h('h3', {}, heading), options.toggle ?? null),
    grid,
    afloatLine(side),
  )
}

interface GridOptions {
  /** The ships to draw. */
  readonly fleet: Fleet
  /** The shots that fell on this sea, if any. */
  readonly side?: SeaSide
  /** The squares of the ship picked, while placing. */
  readonly picked?: readonly number[]
  readonly kind: string
  /** Whether a tap on the square does something. */
  readonly open: (cell: number) => boolean
  readonly tap: (cell: number) => void
}

/** A sea of 10 by 10 squares, A1 at the top left. */
function seaGrid(options: GridOptions): HTMLElement {
  const side = options.side ?? { shots: [], hits: [], sunk: [] }
  const ships = new Set(options.fleet.flatMap((ship) => shipCells(ship) ?? []))
  const sunk = new Set(side.sunk.flatMap((ship) => shipCells(ship) ?? []))
  const water = new Set(side.sunk.flatMap(around))
  const shots = new Set(side.shots)
  const hits = new Set(side.hits)
  const picked = new Set(options.picked ?? [])
  const last = side.shots.at(-1)
  const grid = h('div', { class: `sea ${options.kind}`, role: 'grid' } as Partial<HTMLDivElement>)
  for (let cell = 0; cell < SEA_CELLS; cell++) {
    const what = sunk.has(cell)
      ? t('seaSunk')
      : hits.has(cell)
        ? t('seaHit')
        : shots.has(cell) || water.has(cell)
          ? t('seaWater')
          : ships.has(cell)
            ? t('seaShip')
            : ''
    const label = squareName(cell)
    const classes = [
      'square-sea',
      ships.has(cell) || sunk.has(cell) ? 'ship' : '',
      hits.has(cell) ? 'hit' : '',
      sunk.has(cell) ? 'sunk' : '',
      shots.has(cell) && !hits.has(cell) ? 'miss' : '',
      water.has(cell) && !shots.has(cell) ? 'water' : '',
      cell === last ? 'last' : '',
      picked.has(cell) ? 'picked' : '',
    ]
    const button = h('button', {
      type: 'button',
      class: classes.filter(Boolean).join(' '),
      ariaLabel: [label, what, picked.has(cell) ? t('seaPicked') : ''].filter(Boolean).join(': '),
      textContent: hits.has(cell) ? '✕' : shots.has(cell) ? '•' : '',
      disabled: !options.open(cell),
      onclick: () => options.tap(cell),
    })
    button.dataset.cell = String(cell)
    grid.append(button)
  }
  return grid
}

/** A square's name, as players of Sea Battle call it: A1 at the top left, J10 at the bottom right. */
export function squareName(cell: number): string {
  return `${String.fromCharCode(65 + (cell % SEA))}${Math.floor(cell / SEA) + 1}`
}

/** The ships of a sea still afloat, and those sunk, struck through. */
function afloatLine(side: SeaSide): HTMLElement {
  const left = afloat(side)
  const ship = (size: number, sunk: boolean) =>
    h('span', {
      class: `fleet-ship${sunk ? ' sunk' : ''}`,
      ariaLabel: `${t('shipOf', { size })}${sunk ? `: ${t('seaSunk')}` : ''}`,
      textContent: '■'.repeat(size),
    })
  return h(
    'p',
    { class: 'afloat muted' },
    h('span', {}, t('afloat')),
    ...left.map((size) => ship(size, false)),
    ...side.sunk.map((sunk) => ship(sunk.size, true)),
  )
}

/** On a split screen: shows or hides the player's own fleet. */
function fleetToggle(picker: Picker): HTMLElement {
  return h('button', {
    type: 'button',
    class: 'fleet-toggle',
    textContent: t(picker.showOwn ? 'hideFleet' : 'showFleet'),
    ariaPressed: String(picker.showOwn),
    onclick: () => {
      picker.showOwn = !picker.showOwn
      picker.onChange()
    },
  })
}

/**
 * Placing the fleet: it starts shuffled; a tap on a ship picks it, a tap on it again turns it,
 * and a tap on the sea moves the ship picked there. Ready sends the fleet to the host.
 */
function placement(options: SeaOptions): HTMLElement[] {
  const { picker } = options
  if (picker.fleet === null) picker.fleet = randomFleet(random)
  const fleet = picker.fleet
  const hidden = options.hideOwn && !picker.showOwn
  const change = (next: Ship[] | null, ship: number, misfit = false) => {
    picker.fleet = next
    picker.ship = ship
    picker.misfit = misfit
    picker.onChange()
  }
  const chosen = fleet[picker.ship]
  /** The fleet with the ship picked moved or turned, if it fits there. */
  const moved = (ship: Ship): Ship[] | null => {
    const others = fleet.filter((_, i) => i !== picker.ship)
    return fitsBeside(others, ship) ? fleet.map((s, i) => (i === picker.ship ? ship : s)) : null
  }
  const shipAt = (cell: number) => fleet.findIndex((ship) => shipCells(ship)?.includes(cell))
  const tap = (cell: number) => {
    const at = shipAt(cell)
    if (at >= 0 && at !== picker.ship) return change(fleet, at)
    if (!chosen) return
    if (at === picker.ship) {
      const turned = moved({ ...chosen, down: !chosen.down })
      return turned ? change(turned, picker.ship) : change(fleet, picker.ship, true)
    }
    const next = moved({ ...chosen, cell }) ?? moved({ ...chosen, cell, down: !chosen.down })
    return next ? change(next, picker.ship) : change(fleet, picker.ship, true)
  }
  const grid = seaGrid({
    fleet: hidden ? [] : fleet,
    picked: hidden || !chosen ? [] : (shipCells(chosen) ?? []),
    kind: `own placing${hidden ? '' : ' active'}`,
    open: () => !hidden && options.move !== null,
    tap,
  })
  const turnShip = () => {
    if (!chosen) return
    const turned = moved({ ...chosen, down: !chosen.down })
    change(turned ?? fleet, picker.ship, turned === null)
  }
  const send = options.move
  return [
    picker.misfit ? h('p', { class: 'notice misfit' }, t('shipsTouch')) : null,
    grid,
    h(
      'div',
      { class: 'buttons fleet-buttons' },
      hidden
        ? null
        : h('button', {
            type: 'button',
            textContent: t('turnShip'),
            disabled: !chosen,
            onclick: turnShip,
          }),
      h('button', {
        type: 'button',
        textContent: t('shuffleFleet'),
        onclick: () => change(randomFleet(random), -1),
      }),
      h('button', {
        type: 'button',
        class: 'primary',
        textContent: t('fleetReady'),
        disabled: send === null,
        onclick: () => {
          picker.ship = -1
          picker.misfit = false
          send?.(encode({ kind: 'place', fleet }))
        },
      }),
    ),
    options.hideOwn ? fleetToggle(picker) : null,
  ].filter((node): node is HTMLElement => node !== null)
}
