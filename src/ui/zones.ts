import type { TableState } from '../core/table'
import {
  type Direction,
  keyDirection,
  type LiveOptions,
  type LiveView,
  Painter,
  pointOn,
  typing,
} from './canvas'
import { h } from './dom'

/** A part of a field that belongs to one seat, in the canvas's CSS pixels. */
export interface Zone {
  /** The seat it belongs to, or -1 for a field nobody here plays on. */
  readonly seat: number
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * A field of games in real time that are played by tapping, Reaction and Colour Echo: a part of
 * its own for each seat this screen plays for, side by side on a screen everyone shares, and
 * each seat's keys. A phone has one part, for its player, or for nobody while they watch.
 */
export abstract class ZoneField implements LiveView {
  readonly element: HTMLElement
  protected readonly canvas: HTMLCanvasElement
  private readonly painter: Painter
  protected state: TableState | null = null
  /** The game the seats were found for: see `TableState.round`. */
  protected round = -1
  /** The seats this screen plays for, in seat order. */
  protected seats: number[] = []
  private laidOut: Zone[] = []

  constructor(
    protected readonly viewer: number,
    protected readonly shared: boolean,
    protected readonly options: LiveOptions,
    label: string,
    kind: string,
  ) {
    this.canvas = h('canvas', {
      class: `live-field zone-field ${kind}-field`,
      role: 'img',
      ariaLabel: label,
    } as Partial<HTMLCanvasElement>)
    this.element = h('div', { class: `live ${kind}` }, this.canvas)
    this.canvas.addEventListener('pointerdown', this.down)
    addEventListener('keydown', this.key)
    this.painter = new Painter(
      this.canvas,
      (context, width, height) => this.paint(context, width, height),
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
    if (state.round === this.round) return
    this.round = state.round
    this.seats = state.seats.flatMap((id, seat) => (this.options.steers.includes(id) ? [seat] : []))
    const { columns, rows } = grid(Math.max(1, this.seats.length))
    this.canvas.style.aspectRatio = `${columns} / ${rows}`
    this.newGame(state)
  }

  /** A new game has started: the seats are found. */
  protected newGame(_state: TableState): void {}

  /** A seat played here taps its part at (x, y), or presses one of its keys (`direction`). */
  protected abstract tap(seat: number, at: TapAt, time: number): void

  /** Draws a seat's part of the field. */
  protected abstract drawZone(context: CanvasRenderingContext2D, zone: Zone, now: number): void

  /** The parts of the field: one for each seat played here, or one for nobody. */
  protected zones(width: number, height: number): Zone[] {
    const seats = this.seats.length > 0 ? this.seats : [-1]
    const { columns, rows } = grid(seats.length)
    const gap = seats.length > 1 ? 6 : 0
    const w = (width - gap * (columns - 1)) / columns
    const hh = (height - gap * (rows - 1)) / rows
    return seats.map((seat, i) => ({
      seat,
      x: (i % columns) * (w + gap),
      y: Math.floor(i / columns) * (hh + gap),
      width: w,
      height: hh,
    }))
  }

  private paint(context: CanvasRenderingContext2D, width: number, height: number): void {
    context.clearRect(0, 0, width, height)
    if (!this.state) return
    const now = performance.now()
    this.laidOut = this.zones(width, height)
    for (const zone of this.laidOut) {
      context.save()
      context.beginPath()
      context.rect(zone.x, zone.y, zone.width, zone.height)
      context.clip()
      this.drawZone(context, zone, now)
      context.restore()
    }
  }

  private readonly down = (event: PointerEvent) => {
    const at = pointOn(this.canvas, event)
    const zone = this.laidOut.find(
      (z) => at.x >= z.x && at.x < z.x + z.width && at.y >= z.y && at.y < z.y + z.height,
    )
    if (!zone || zone.seat < 0) return
    event.preventDefault()
    this.tap(zone.seat, { x: at.x - zone.x, y: at.y - zone.y, zone }, event.timeStamp)
  }

  private readonly key = (event: KeyboardEvent) => {
    if (typing(event) || event.repeat) return
    const own = this.seats.length === 1 && !this.options.local ? (this.seats[0] ?? null) : null
    const pressed = keyDirection(event.code, this.options.local ? null : own)
    const seat = pressed?.seat ?? (event.code === 'Space' || event.code === 'Enter' ? own : null)
    if (seat === null || !this.seats.includes(seat)) return
    event.preventDefault()
    this.tap(seat, { direction: pressed?.direction ?? null }, event.timeStamp)
  }
}

/** Where a tap was: a point in a seat's part, or a key with its direction (null for Space). */
export type TapAt =
  | { readonly x: number; readonly y: number; readonly zone: Zone }
  | { readonly direction: Direction | null }

/** How the parts of `count` seats lie: side by side, then in two rows. */
export function grid(count: number): { columns: number; rows: number } {
  const columns = count <= 3 ? count : count === 4 ? 2 : 3
  return { columns, rows: Math.ceil(count / columns) }
}
