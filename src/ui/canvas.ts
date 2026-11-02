import type { TableState } from '../core/table'
import { t } from '../i18n'

/**
 * What the fields of games in real time share: colours, keys, fingers, and a canvas drawn
 * every frame.
 */

/** The seats' colours, as in the style sheet. */
export const SEAT_COLOURS = ['#e5484d', '#f5c542', '#4fb3a9', '#8f7cf0', '#e98ac0', '#8fc75b']

export const colour = (seat: number): string => SEAT_COLOURS[seat % SEAT_COLOURS.length] ?? '#fff'

/** Keys for players on one keyboard, by seat: four directions each. */
export const KEY_SETS = [
  { up: 'KeyW', left: 'KeyA', down: 'KeyS', right: 'KeyD', label: 'W A S D' },
  { up: 'ArrowUp', left: 'ArrowLeft', down: 'ArrowDown', right: 'ArrowRight', label: '' },
  { up: 'KeyI', left: 'KeyJ', down: 'KeyK', right: 'KeyL', label: 'I J K L' },
  { up: 'Numpad8', left: 'Numpad4', down: 'Numpad5', right: 'Numpad6', label: '8 4 5 6' },
] as const

/** The screen directions, as Lichtrenner's headings: 0 up, 1 right, 2 down, 3 left. */
export type Direction = 0 | 1 | 2 | 3

/** A set's label, for the key help. */
export function keysLabel(seat: number): string {
  const set = KEY_SETS[seat]
  return set ? set.label || t('arrowKeys') : ''
}

/**
 * The direction a key stands for, and for which seat: `own` is the seat of a phone's player,
 * who may use both the arrow keys and W A S D; without one, every seat has its own keys.
 */
export function keyDirection(
  code: string,
  own: number | null,
): { seat: number; direction: Direction } | null {
  for (const [index, set] of KEY_SETS.entries()) {
    const direction = ([set.up, set.right, set.down, set.left] as string[]).indexOf(code)
    if (direction < 0) continue
    if (own !== null && index > 1) return null
    return { seat: own ?? index, direction: direction as Direction }
  }
  return null
}

/** Whether a key went to a field for typing, which keeps its keys. */
export function typing(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null
  return target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA'
}

/** What a field in real time needs to know of the screen it is on. */
export interface LiveOptions {
  /** The players this screen steers: a phone's own, or everyone on one device. */
  readonly steers: readonly number[]
  /** Sends what a player wants now: see `Table.input`. */
  readonly send: (id: number, values: number[]) => void
  /** One device for everyone: each seat has its own keys, and the field is drawn whole. */
  readonly local: boolean
  /** Stops the game, for whoever keeps the table; on a phone's own half of the rink. */
  readonly stop?: () => void
}

export interface LiveView {
  readonly element: HTMLElement
  /** Draws the table's newest state, from the next frame on. */
  update(state: TableState): void
  /** Lets go of the keys and stops drawing. */
  stop(): void
  readonly stopped: boolean
}

/**
 * Draws a canvas every frame while it is on the page, at the screen's own pixels: `draw` gets
 * the context in CSS pixels and the canvas's size. It stops by itself once the canvas has left
 * the page, or when `stop` is called.
 */
export class Painter {
  private frame = 0
  stopped = false

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly draw: (
      context: CanvasRenderingContext2D,
      width: number,
      height: number,
    ) => void,
    private readonly onStop: () => void,
  ) {
    this.frame = requestFrame(() => this.paint())
  }

  private paint(): void {
    if (this.stopped) return
    if (!this.canvas.isConnected) {
      this.stop()
      return
    }
    const width = this.canvas.clientWidth
    const height = this.canvas.clientHeight
    const ratio = globalThis.devicePixelRatio || 1
    const pixelsWide = Math.round(width * ratio)
    const pixelsHigh = Math.round(height * ratio)
    if (this.canvas.width !== pixelsWide) this.canvas.width = pixelsWide
    if (this.canvas.height !== pixelsHigh) this.canvas.height = pixelsHigh
    const context = this.canvas.getContext('2d')
    if (context && width > 0 && height > 0) {
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      this.draw(context, width, height)
    }
    this.frame = requestFrame(() => this.paint())
  }

  stop(): void {
    if (this.stopped) return
    this.stopped = true
    cancelFrame(this.frame)
    this.onStop()
  }
}

function requestFrame(callback: () => void): number {
  return typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame(callback)
    : (setTimeout(callback, 16) as unknown as number)
}

function cancelFrame(frame: number): void {
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame)
  else clearTimeout(frame)
}

/**
 * A point of a pointer event on a canvas, in the canvas's CSS pixels, as the player sees it:
 * on a part of a split screen turned round, the other way round.
 */
export function pointOn(canvas: HTMLCanvasElement, event: PointerEvent): { x: number; y: number } {
  const box = canvas.getBoundingClientRect()
  const x = event.clientX - box.left
  const y = event.clientY - box.top
  return canvas.closest('.turned') ? { x: box.width - x, y: box.height - y } : { x, y }
}

/** A big line of text in the middle of a field, with a shadow, for countdowns and goals. */
export function banner(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
): void {
  context.save()
  context.font = `700 ${Math.round(size)}px system-ui, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.shadowColor = 'rgb(0 0 0 / 0.8)'
  context.shadowBlur = size / 4
  context.fillStyle = '#f1ece2'
  context.fillText(text, x, y)
  context.restore()
}
