import { COLOURS, type EchoView, litAt, packTaps } from '../core/echo'
import type { TableState } from '../core/table'
import { t } from '../i18n'
import { seatName } from './boards'
import { banner, colour, type LiveOptions, themeColour } from './canvas'
import { type TapAt, type Zone, ZoneField } from './zones'

/** Seconds a colour tapped here stays lit. */
const FLASH = 0.25

/**
 * Colour Echo's field: a pad of four colours for each seat played here, which lights up the
 * row as the host shows it, and takes the seat's taps: on the pad, or by its keys, each key the
 * colour on that side.
 */
export class EchoField extends ZoneField {
  /** The taps of each seat played here in this row, all of which go to the host each time. */
  private readonly taps = new Map<number, number[]>()
  /** The row the taps are for. */
  private row = ''
  /** The colour each seat tapped last, and when, to light it up a moment. */
  private readonly flashes = new Map<number, { colour: number; at: number }>()
  /** When the newest state came, for lighting up the row between states. */
  private since = 0

  constructor(viewer: number, shared: boolean, options: LiveOptions) {
    super(viewer, shared, options, t('echo'), 'echo')
  }

  override update(state: TableState): void {
    super.update(state)
    this.since = performance.now()
    const game = state.echo
    if (!game) return
    // What the field shows, for tests and tools that cannot see the canvas.
    this.element.dataset.phase = game.phase
    const row = `${state.round}:${game.length}`
    if (row !== this.row) {
      this.row = row
      this.taps.clear()
    }
    // The viewer's taps the host has, should this field have come after some of them.
    const mine = state.seats.indexOf(this.viewer)
    if (mine >= 0 && game.entries.length > (this.taps.get(mine)?.length ?? 0)) {
      this.taps.set(mine, [...game.entries])
    }
  }

  protected tap(seat: number, at: TapAt, time: number): void {
    const state = this.state
    const game = state?.echo
    if (!state || !game || state.outcome !== null || game.phase !== 'repeat') return
    if (game.out[seat] !== null) return
    const taps = this.taps.get(seat) ?? []
    if (taps.length >= game.length) return
    const tapped =
      'direction' in at ? at.direction : wedgeAt(at.zone, this.seats.length > 1, at.x, at.y)
    if (tapped === null) return
    taps.push(tapped)
    this.taps.set(seat, taps)
    this.flashes.set(seat, { colour: tapped, at: time })
    const id = state.seats[seat]
    if (id !== undefined) this.options.send(id, [state.round, game.length, ...packTaps(taps)])
  }

  protected drawZone(context: CanvasRenderingContext2D, zone: Zone, now: number): void {
    const state = this.state
    const game = state?.echo
    if (!state || !game) return
    const { seat } = zone
    context.fillStyle = themeColour('field')
    context.fillRect(zone.x, zone.y, zone.width, zone.height)
    const named = seat >= 0 && this.seats.length > 1
    const { x, y, outer, inner, top } = padOf(zone, named)
    const cx = zone.x + x
    const cy = zone.y + y
    const lit = this.lit(game, seat, now)
    if (game.phase === 'show') this.element.dataset.lit = lit === null ? '' : String(lit)
    const out = seat >= 0 && game.out[seat] !== null
    for (let wedge = 0; wedge < COLOURS; wedge++) {
      // Wedge 0 points up; the others follow clockwise.
      const middle = -Math.PI / 2 + (wedge * Math.PI) / 2
      const gap = 0.07
      context.save()
      context.globalAlpha = lit === wedge ? 1 : out ? 0.15 : 0.32
      context.fillStyle = colour(wedge)
      if (lit === wedge) {
        context.shadowColor = colour(wedge)
        context.shadowBlur = outer * 0.25
      }
      context.beginPath()
      context.arc(cx, cy, outer, middle - Math.PI / 4 + gap, middle + Math.PI / 4 - gap)
      context.arc(
        cx,
        cy,
        inner,
        middle + Math.PI / 4 - gap * 2,
        middle - Math.PI / 4 + gap * 2,
        true,
      )
      context.closePath()
      context.fill()
      context.restore()
    }
    if (named) banner(context, seatName(state, seat), cx, zone.y + top / 2 + 2, top * 0.6)
    banner(context, this.centre(game, seat), cx, cy, inner * 0.42)
  }

  /** The colour lit on a seat's pad now: the row as it shows, or the seat's own tap. */
  private lit(game: EchoView, seat: number, now: number): number | null {
    if (game.phase === 'show') return litAt(game.pattern, game.clock + (now - this.since) / 1000)
    const flash = this.flashes.get(seat)
    return flash && now - flash.at < FLASH * 1000 ? flash.colour : null
  }

  /** What the middle of a seat's pad says: watch, how far it is, done, or out. */
  private centre(game: EchoView, seat: number): string {
    if (seat >= 0 && game.out[seat] !== null) return t(game.late[seat] ? 'echoLate' : 'echoWrong')
    if (game.phase === 'show') return t('echoWatch')
    if (game.phase === 'pause') return '✓'
    if (seat < 0) return String(game.length)
    const taps = Math.max(game.progress[seat] ?? 0, this.taps.get(seat)?.length ?? 0)
    return taps >= game.length ? '✓' : `${taps}/${game.length}`
  }
}

/** Where a seat's pad lies in its part, `named` with the player's name above it. */
export function padOf(
  zone: Zone,
  named: boolean,
): { x: number; y: number; outer: number; inner: number; top: number } {
  const top = named ? Math.min(zone.height * 0.12, 32) : 0
  const size = Math.min(zone.width, zone.height - top)
  const outer = size * 0.46
  return {
    x: zone.width / 2,
    y: top + (zone.height - top) / 2,
    outer,
    inner: outer * 0.38,
    top,
  }
}

/** The colour at (x, y) in a seat's part, or null off the pad's ring of colours. */
export function wedgeAt(zone: Zone, named: boolean, x: number, y: number): number | null {
  const pad = padOf(zone, named)
  const dx = x - pad.x
  const dy = y - pad.y
  const distance = Math.hypot(dx, dy)
  if (distance > pad.outer * 1.08 || distance < pad.inner * 0.6) return null
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 1 : 3
  return dy < 0 ? 0 : 2
}
