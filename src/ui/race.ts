import { COLUMNS, columnOf, type LichtView, ROWS, rowOf } from '../core/lichtrenner'
import type { TableState } from '../core/table'
import { t } from '../i18n'
import {
  banner,
  colour,
  type Direction,
  keyDirection,
  keysLabel,
  type LiveOptions,
  type LiveView,
  Painter,
  pointOn,
  typing,
} from './canvas'
import { h } from './dom'

/** How far a finger moves, in CSS pixels, to make a swipe. */
const SWIPE = 24

/** What a seat steered here wants: where to head, and whether its last turn was to the left. */
interface Want {
  heading: number
  left: boolean
}

/**
 * Lichtrenner's field: the grid with every rider's wall of light, and the turns of the riders
 * this screen steers, by swipes on the field, by the ⟲ and ⟳ buttons and by keys.
 */
export class RaceView implements LiveView {
  readonly element: HTMLElement
  private readonly canvas: HTMLCanvasElement
  private readonly controls: HTMLElement
  private readonly painter: Painter
  private state: TableState | null = null
  private round = -1
  /** The seats steered here, and what each wants. */
  private readonly wants = new Map<number, Want>()
  private swipe: { x: number; y: number; pointer: number } | null = null

  constructor(
    private readonly viewer: number,
    private readonly shared: boolean,
    private readonly options: LiveOptions,
  ) {
    this.canvas = h('canvas', {
      class: 'live-field race-field',
      role: 'img',
      ariaLabel: t('lichtrenner'),
    } as Partial<HTMLCanvasElement>)
    this.controls = h('div', { class: 'race-controls' })
    this.element = h('div', { class: 'live race' }, this.canvas, this.controls)
    this.canvas.addEventListener('pointerdown', this.down)
    this.canvas.addEventListener('pointermove', this.moved)
    this.canvas.addEventListener('pointerup', this.up)
    this.canvas.addEventListener('pointercancel', this.up)
    addEventListener('keydown', this.key)
    this.painter = new Painter(
      this.canvas,
      (context, width, height) => this.draw(context, width, height),
      () => removeEventListener('keydown', this.key),
    )
  }

  get stopped(): boolean {
    return this.painter.stopped
  }

  stop(): void {
    this.painter.stop()
  }

  update(state: TableState): void {
    this.state = state
    const race = state.race
    if (!race || state.round === this.round) return
    // A new race: every seat steered here starts with the heading it has.
    this.round = state.round
    this.wants.clear()
    for (const [seat, id] of state.seats.entries()) {
      const rider = race.riders[seat]
      if (rider && this.options.steers.includes(id)) {
        this.wants.set(seat, { heading: rider.heading, left: false })
      }
    }
    this.controls.replaceChildren(
      ...[...this.wants.keys()].map((seat) => this.buttons(state, seat)),
    )
  }

  /** ⟲ and ⟳ for a seat; on one device, with the player's name and keys. */
  private buttons(state: TableState, seat: number): HTMLElement {
    const name = state.players.find((p) => p.id === state.seats[seat])?.name ?? '?'
    const local = this.options.local
    const button = (side: 'left' | 'right') =>
      h('button', {
        type: 'button',
        class: `turn-button ${side}`,
        textContent: side === 'left' ? '⟲' : '⟳',
        ariaLabel: local
          ? t(side === 'left' ? 'turnLeftOf' : 'turnRightOf', { name })
          : t(side === 'left' ? 'turnLeft' : 'turnRight'),
        onclick: () => this.want(seat, side),
      })
    return h(
      'div',
      { class: 'turns' },
      button('left'),
      local
        ? h(
            'span',
            { class: 'turns-name' },
            h('span', { class: `piece seat-${seat}` }, '●'),
            ` ${t('keysOf', { name, keys: keysLabel(seat) })}`,
          )
        : null,
      button('right'),
    )
  }

  /** A seat steered here turns left or right, or heads a way, if its rider still rides. */
  private want(seat: number, turn: 'left' | 'right' | Direction): void {
    const want = this.wants.get(seat)
    const race = this.state?.race
    if (!want || !race?.riders[seat]?.alive || this.state?.outcome !== null) return
    if (turn === 'left') {
      want.heading = (want.heading + 3) % 4
      want.left = true
    } else if (turn === 'right') {
      want.heading = (want.heading + 1) % 4
      want.left = false
    } else {
      // A swipe straight back means nothing: riders cannot turn on the spot.
      if (turn === want.heading || turn === (want.heading + 2) % 4) return
      want.left = turn === (want.heading + 3) % 4
      want.heading = turn
    }
    const id = this.state?.seats[seat]
    if (id !== undefined) this.options.send(id, [this.round, want.heading + (want.left ? 4 : 0)])
  }

  /** The one seat a swipe steers: on a phone or a part of a split screen, not on one for all. */
  private swiper(): number | null {
    return this.wants.size === 1 ? ([...this.wants.keys()][0] ?? null) : null
  }

  private readonly down = (event: PointerEvent) => {
    if (this.swiper() === null) return
    const at = pointOn(this.canvas, event)
    this.swipe = { ...at, pointer: event.pointerId }
  }

  private readonly moved = (event: PointerEvent) => {
    const swipe = this.swipe
    const seat = this.swiper()
    if (!swipe || seat === null || swipe.pointer !== event.pointerId) return
    const at = pointOn(this.canvas, event)
    const dx = at.x - swipe.x
    const dy = at.y - swipe.y
    if (Math.hypot(dx, dy) < SWIPE) return
    const direction: Direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0
    this.want(seat, direction)
    // The finger may go on and swipe another way.
    this.swipe = { ...at, pointer: event.pointerId }
  }

  private readonly up = () => {
    this.swipe = null
  }

  private readonly key = (event: KeyboardEvent) => {
    if (typing(event) || event.repeat) return
    // A phone's player has the arrows and W A S D; on one device, each seat its own keys.
    const pressed = keyDirection(event.code, this.options.local ? null : this.swiper())
    if (!pressed || !this.wants.has(pressed.seat)) return
    event.preventDefault()
    this.want(pressed.seat, pressed.direction)
  }

  private draw(context: CanvasRenderingContext2D, width: number, height: number): void {
    const state = this.state
    const race = state?.race
    context.clearRect(0, 0, width, height)
    if (!state || !race) return
    const size = Math.min(width, height)
    const left = (width - size) / 2
    const top = (height - size) / 2
    const cell = size / COLUMNS
    context.fillStyle = '#0d1620'
    context.fillRect(left, top, size, size)
    context.strokeStyle = 'rgb(255 255 255 / 0.05)'
    context.lineWidth = 1
    context.beginPath()
    for (let line = 0; line <= COLUMNS; line += 5) {
      context.moveTo(left + line * cell, top)
      context.lineTo(left + line * cell, top + size)
    }
    for (let line = 0; line <= ROWS; line += 5) {
      context.moveTo(left, top + line * cell)
      context.lineTo(left + size, top + line * cell)
    }
    context.stroke()
    const centre = (at: number) => ({
      x: left + (columnOf(at) + 0.5) * cell,
      y: top + (rowOf(at) + 0.5) * cell,
    })
    drawRiders(context, race, cell, centre)

    const mine = state.seats.indexOf(this.viewer)
    if (race.countdown > 0) {
      if (mine >= 0 && !this.shared) {
        const head = race.riders[mine]?.path.at(-1)
        if (head !== undefined) {
          const { x, y } = centre(head)
          context.strokeStyle = '#f1ece2'
          context.lineWidth = 2
          context.beginPath()
          context.arc(x, y, cell * 2.2, 0, 2 * Math.PI)
          context.stroke()
          banner(context, t('lichtGetReady'), left + size / 2, top + size * 0.8, size / 22)
        }
      }
      banner(context, String(Math.ceil(race.countdown)), left + size / 2, top + size / 2, size / 4)
    } else if (mine >= 0 && !this.shared && state.outcome === null && !race.riders[mine]?.alive) {
      banner(context, t('lichtOut'), left + size / 2, top + size / 2, size / 18)
    }
  }
}

/** Every rider's wall, its head bright while it rides, and a cross where it crashed. */
function drawRiders(
  context: CanvasRenderingContext2D,
  race: LichtView,
  cell: number,
  centre: (at: number) => { x: number; y: number },
): void {
  for (const [seat, rider] of race.riders.entries()) {
    const points = rider.path.map(centre)
    const first = points[0]
    const head = points.at(-1)
    if (!first || !head) continue
    context.save()
    context.strokeStyle = colour(seat)
    context.globalAlpha = rider.alive ? 1 : 0.55
    context.lineWidth = cell * 0.6
    context.lineCap = 'square'
    context.lineJoin = 'miter'
    context.shadowColor = colour(seat)
    context.shadowBlur = cell
    context.beginPath()
    context.moveTo(first.x, first.y)
    for (const point of points.slice(1)) context.lineTo(point.x, point.y)
    context.stroke()
    context.restore()
    context.save()
    if (rider.alive) {
      context.fillStyle = '#fff'
      context.shadowColor = colour(seat)
      context.shadowBlur = cell * 1.5
      context.fillRect(head.x - cell / 2, head.y - cell / 2, cell, cell)
    } else {
      context.strokeStyle = '#fff'
      context.lineWidth = Math.max(1.5, cell / 4)
      const arm = cell * 0.9
      context.beginPath()
      context.moveTo(head.x - arm, head.y - arm)
      context.lineTo(head.x + arm, head.y + arm)
      context.moveTo(head.x + arm, head.y - arm)
      context.lineTo(head.x - arm, head.y + arm)
      context.stroke()
    }
    context.restore()
  }
}
