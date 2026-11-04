import {
  clampMallet,
  type Disc,
  fromRink,
  GOAL_WIDTH,
  GOALS_TO_WIN,
  HALF,
  type HockeyView,
  LENGTH,
  MALLET,
  PUCK,
  toRink,
  WIDTH,
} from '../core/airhockey'
import type { TableState } from '../core/table'
import { t } from '../i18n'
import { arrivalPuck, OwnMallet, RinkSmoother } from '../net/smooth'
import { settings } from '../storage'
import {
  banner,
  colour,
  keyDirection,
  keysLabel,
  type LiveOptions,
  type LiveView,
  Painter,
  pointOn,
  themeColour,
  typing,
} from './canvas'
import { h } from './dom'

/** How fast keys move a mallet, in rink lengths a second. */
const KEY_SPEED = 1.6

type Point = { readonly x: number; readonly y: number }

/** Where the rink is on the canvas, and how points of the rink and of the screen match. */
interface Frame {
  /** CSS pixels for one rink length. */
  readonly scale: number
  toScreen(point: Point): Point
  toRink(point: Point): Point
}

/**
 * Seat `seat`'s half alone, its goal at the bottom; `top` puts it against the top edge of the
 * screen, where the other phone's half meets it.
 */
export function halfFrame(seat: number, width: number, height: number, top: boolean): Frame {
  const scale = Math.min(width / WIDTH, height / HALF)
  const left = (width - WIDTH * scale) / 2
  const above = top ? 0 : (height - HALF * scale) / 2
  return {
    scale,
    toScreen: (point) => {
      const own = fromRink(seat, point)
      return { x: left + own.x * scale, y: above + (HALF - own.y) * scale }
    },
    toRink: (point) =>
      toRink(seat, { x: (point.x - left) / scale, y: HALF - (point.y - above) / scale }),
  }
}

/** The whole rink as seat `seat` sees it, from their end: their goal at the bottom. */
export function playerFrame(seat: number, width: number, height: number): Frame {
  const scale = Math.min(width / WIDTH, height / LENGTH)
  const left = (width - WIDTH * scale) / 2
  const top = (height - LENGTH * scale) / 2
  return {
    scale,
    toScreen: (point) => {
      const own = fromRink(seat, point)
      return { x: left + own.x * scale, y: top + (LENGTH - own.y) * scale }
    },
    toRink: (point) =>
      toRink(seat, { x: (point.x - left) / scale, y: LENGTH - (point.y - top) / scale }),
  }
}

/** The whole rink: up the screen from seat 0's goal, or across it where that is bigger. */
function wholeFrame(width: number, height: number): Frame {
  if (Math.min(width / LENGTH, height / WIDTH) > Math.min(width / WIDTH, height / LENGTH)) {
    const scale = Math.min(width / LENGTH, height / WIDTH)
    const left = (width - LENGTH * scale) / 2
    const top = (height - WIDTH * scale) / 2
    return {
      scale,
      toScreen: (point) => ({ x: left + point.y * scale, y: top + point.x * scale }),
      toRink: (point) => ({ x: (point.y - top) / scale, y: (point.x - left) / scale }),
    }
  }
  const scale = Math.min(width / WIDTH, height / LENGTH)
  const left = (width - WIDTH * scale) / 2
  const top = (height - LENGTH * scale) / 2
  return {
    scale,
    toScreen: (point) => ({ x: left + point.x * scale, y: top + (LENGTH - point.y) * scale }),
    toRink: (point) => ({ x: (point.x - left) / scale, y: LENGTH - (point.y - top) / scale }),
  }
}

/**
 * The air hockey rink. A player at the board sees the whole rink from their end, their goal at
 * the bottom; or, as the settings choose, only their own half, against the top of the screen,
 * so that two phones laid top edge to top edge make the whole rink, and the puck leaves one
 * screen at the top and comes in at the top of the other. Everyone else, and a screen everyone
 * shares, sees the whole rink. A finger on a half moves its mallet there; on one device, keys do
 * too.
 *
 * Smoothing, as the settings choose, draws the game by the host's clock as filtered here
 * (src/net/clock.ts) instead of from when each state arrived: the puck and the other mallet
 * glide on at an even pace, a correction fades in, and a mallet steered here is drawn moving to
 * the finger at once, as the host will move it, instead of a round trip later.
 */
export class RinkView implements LiveView {
  readonly element: HTMLElement
  private readonly canvas: HTMLCanvasElement
  private readonly score: HTMLElement
  private readonly help: HTMLElement
  private readonly stopButton: HTMLButtonElement | null
  private readonly painter: Painter
  private state: TableState | null = null
  /** When the newest state came, for drawing the puck gliding on between states. */
  private since = 0
  private round = -1
  /** Where each seat steered here wants its mallet, on the rink. */
  private readonly aims = new Map<number, Point>()
  /** Which seat each finger on the screen moves. */
  private readonly fingers = new Map<number, number>()
  /** The keys held down, by seat: directions on the screen. */
  private readonly held = new Map<number, Set<number>>()
  private frame: Frame | null = null
  private last = 0
  /** The host's clock, filtered, and what it draws by it, for smoothing (src/net/smooth.ts). */
  private readonly smoother = new RinkSmoother()
  /** The mallets steered here, drawn where the host is going to have them. */
  private readonly own = new Map<number, OwnMallet>()

  constructor(
    private readonly viewer: number,
    private readonly shared: boolean,
    private readonly options: LiveOptions,
  ) {
    this.canvas = h('canvas', {
      class: 'live-field rink-field',
      role: 'img',
      ariaLabel: t('airhockey'),
    } as Partial<HTMLCanvasElement>)
    this.score = h('p', { class: 'rink-score' })
    // On a phone, the player's half covers the screen: the bar says what to do.
    this.help = h('p', { class: 'rink-help muted' }, options.local ? '' : t('hockeyHint'))
    // The host stops the game here while their half covers the screen.
    this.stopButton = options.stop
      ? h('button', { type: 'button', textContent: t('stopGame'), onclick: options.stop })
      : null
    const bar = h('div', { class: 'rink-bar' }, this.score, this.help, this.stopButton)
    this.element = h('div', { class: 'live rink' }, this.canvas, bar)
    this.canvas.addEventListener('pointerdown', this.down)
    this.canvas.addEventListener('pointermove', this.moved)
    this.canvas.addEventListener('pointerup', this.up)
    this.canvas.addEventListener('pointercancel', this.up)
    addEventListener('keydown', this.key)
    addEventListener('keyup', this.key)
    this.painter = new Painter(
      this.canvas,
      (context, width, height) => this.draw(context, width, height),
      () => {
        removeEventListener('keydown', this.key)
        removeEventListener('keyup', this.key)
      },
    )
  }

  get stopped(): boolean {
    return this.painter.stopped
  }

  stop(): void {
    this.painter.stop()
  }

  /** The seat this view is drawn for, from its end, or null for a screen everyone looks at. */
  private mine(state: TableState): number | null {
    const seat = state.seats.indexOf(this.viewer)
    return seat >= 0 && !this.shared ? seat : null
  }

  /** The seat whose half this view shows alone, or null for the whole rink. */
  private half(state: TableState): number | null {
    return settings().hockeyWhole ? null : this.mine(state)
  }

  /** Whether to draw by the host's filtered clock: on a phone of its own, if chosen. */
  private smooth(): boolean {
    return !this.options.local && settings().hockeySmooth
  }

  update(state: TableState): void {
    const now = performance.now()
    this.state = state
    this.since = now
    const rink = state.rink
    if (!rink) return
    if (this.smooth() && state.round === this.round)
      this.smoother.observe(rink, now / 1000, state.outcome !== null)
    // On a phone at the board, the player's rink fills the screen while the game is on.
    const arena = !this.options.local && this.mine(state) !== null && state.outcome === null
    this.element.classList.toggle('arena', arena)
    this.score.textContent = this.scoreText(state, rink)
    if (!this.options.local)
      this.help.textContent = t(settings().hockeyWhole ? 'hockeyHintWhole' : 'hockeyHint')
    if (state.round !== this.round) {
      this.round = state.round
      this.aims.clear()
      this.fingers.clear()
      this.own.clear()
      this.smoother.reset()
      for (const [seat, id] of state.seats.entries()) {
        const mallet = rink.mallets[seat]
        if (mallet && this.options.steers.includes(id)) this.aims.set(seat, mallet)
      }
      if (this.options.local) this.help.textContent = this.keysHelp(state)
    }
    this.help.hidden = this.options.local ? this.aims.size === 0 : !arena
    if (this.stopButton) this.stopButton.hidden = !arena
  }

  /** The goals, the viewer's first, with a word of what to do. */
  private scoreText(state: TableState, rink: HockeyView): string {
    const mine = this.mine(state) ?? 0
    const other = 1 - mine
    const name = (seat: number) =>
      state.players.find((p) => p.id === state.seats[seat])?.name ?? '?'
    const score = t('hockeyScore', {
      a: name(mine),
      goalsA: rink.goals[mine] ?? 0,
      goalsB: rink.goals[other] ?? 0,
      b: name(other),
    })
    return `${score} · ${t('hockeyFirstTo', { n: GOALS_TO_WIN })}`
  }

  /** A seat's mallet should go to `point` on the rink: within its half, and sent at once. */
  private aim(seat: number, point: Point): void {
    const state = this.state
    const id = state?.seats[seat]
    if (!state || id === undefined || state.outcome !== null) return
    const aim = clampMallet(seat, point)
    this.aims.set(seat, aim)
    const own = fromRink(seat, aim)
    this.options.send(id, [this.round, round(own.x), round(own.y)])
  }

  private readonly down = (event: PointerEvent) => {
    const state = this.state
    const frame = this.frame
    if (!state || !frame) return
    const point = frame.toRink(pointOn(this.canvas, event))
    const seat = this.mine(state) ?? (point.y < HALF ? 0 : 1)
    if (!this.aims.has(seat)) return
    this.fingers.set(event.pointerId, seat)
    this.canvas.setPointerCapture?.(event.pointerId)
    this.aim(seat, point)
  }

  private readonly moved = (event: PointerEvent) => {
    const seat = this.fingers.get(event.pointerId)
    if (seat === undefined || !this.frame) return
    this.aim(seat, this.frame.toRink(pointOn(this.canvas, event)))
  }

  private readonly up = (event: PointerEvent) => {
    this.fingers.delete(event.pointerId)
  }

  private readonly key = (event: KeyboardEvent) => {
    if (typing(event)) return
    const state = this.state
    const own = state && !this.options.local ? this.mine(state) : null
    const pressed = keyDirection(event.code, this.options.local ? null : own)
    if (!pressed || !this.aims.has(pressed.seat)) return
    event.preventDefault()
    const held = this.held.get(pressed.seat) ?? new Set<number>()
    if (event.type === 'keydown') held.add(pressed.direction)
    else held.delete(pressed.direction)
    this.held.set(pressed.seat, held)
  }

  /** Moves the mallets of held keys on, in the direction the keys show on the screen. */
  private steer(seconds: number): void {
    const frame = this.frame
    if (!frame) return
    for (const [seat, held] of this.held) {
      const aim = this.aims.get(seat)
      if (!aim || held.size === 0) continue
      const step = KEY_SPEED * frame.scale * seconds
      const dx = (held.has(1) ? step : 0) - (held.has(3) ? step : 0)
      const dy = (held.has(2) ? step : 0) - (held.has(0) ? step : 0)
      if (dx === 0 && dy === 0) continue
      const on = frame.toScreen(aim)
      this.aim(seat, frame.toRink({ x: on.x + dx, y: on.y + dy }))
    }
  }

  private draw(context: CanvasRenderingContext2D, width: number, height: number): void {
    const now = performance.now()
    const seconds = this.last === 0 ? 0 : Math.min(0.1, (now - this.last) / 1000)
    this.last = now
    context.clearRect(0, 0, width, height)
    const state = this.state
    const rink = state?.rink
    if (!state || !rink) return
    const half = this.half(state)
    const mine = this.mine(state)
    const frame =
      half !== null
        ? halfFrame(half, width, height, this.element.classList.contains('arena'))
        : mine !== null
          ? playerFrame(mine, width, height)
          : wholeFrame(width, height)
    this.frame = frame
    this.steer(seconds)
    const k = frame.scale
    const corner = (a: Point, b: Point) => {
      const p = frame.toScreen(a)
      const q = frame.toScreen(b)
      return {
        x: Math.min(p.x, q.x),
        y: Math.min(p.y, q.y),
        w: Math.abs(p.x - q.x),
        h: Math.abs(p.y - q.y),
      }
    }
    // The ice, its middle line and circle, and the two goals in their players' colours.
    const ice = corner({ x: 0, y: 0 }, { x: WIDTH, y: LENGTH })
    context.fillStyle = themeColour('rink')
    context.fillRect(ice.x, ice.y, ice.w, ice.h)
    context.strokeStyle = themeColour('rink-line')
    context.lineWidth = Math.max(2, k * 0.012)
    context.beginPath()
    const left = frame.toScreen({ x: 0, y: HALF })
    const right = frame.toScreen({ x: WIDTH, y: HALF })
    context.moveTo(left.x, left.y)
    context.lineTo(right.x, right.y)
    const middle = frame.toScreen({ x: WIDTH / 2, y: HALF })
    context.moveTo(middle.x + k * 0.2, middle.y)
    context.arc(middle.x, middle.y, k * 0.2, 0, 2 * Math.PI)
    context.stroke()
    context.strokeRect(ice.x, ice.y, ice.w, ice.h)
    for (const seat of [0, 1]) {
      const end = seat === 0 ? 0 : LENGTH
      const depth = seat === 0 ? -0.03 : 0.03
      const goal = corner(
        { x: WIDTH / 2 - GOAL_WIDTH / 2, y: end - depth },
        { x: WIDTH / 2 + GOAL_WIDTH / 2, y: end + depth },
      )
      context.fillStyle = colour(seat)
      context.fillRect(goal.x, goal.y, goal.w, goal.h)
    }

    // The goals of each player, large and faint in their half.
    for (const seat of [0, 1]) {
      const at = frame.toScreen({ x: WIDTH / 2, y: seat === 0 ? HALF / 2 : LENGTH - HALF / 2 })
      context.save()
      context.globalAlpha = 0.18
      context.fillStyle = colour(seat)
      context.font = `700 ${Math.round(k * 0.5)}px system-ui, sans-serif`
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(String(rink.goals[seat] ?? 0), at.x, at.y)
      context.restore()
    }

    const smooth = this.smooth() && this.smoother.clock.started()
    const over = state.outcome !== null
    for (const [seat, mallet] of rink.mallets.entries()) {
      const at = frame.toScreen(this.mallet(seat, mallet, smooth, over, now / 1000, seconds))
      context.save()
      context.fillStyle = colour(seat)
      context.shadowColor = 'rgb(0 0 0 / 0.5)'
      context.shadowBlur = k * 0.03
      context.beginPath()
      context.arc(at.x, at.y, MALLET * k, 0, 2 * Math.PI)
      context.fill()
      context.restore()
      context.fillStyle = 'rgb(0 0 0 / 0.25)'
      context.beginPath()
      context.arc(at.x, at.y, MALLET * k * 0.45, 0, 2 * Math.PI)
      context.fill()
    }
    const glided =
      (smooth ? this.smoother.puck(now / 1000, seconds) : null) ??
      arrivalPuck(rink, over, (now - this.since) / 1000)
    const puck = frame.toScreen(glided)
    context.fillStyle = themeColour('puck')
    context.beginPath()
    context.arc(puck.x, puck.y, PUCK * k, 0, 2 * Math.PI)
    context.fill()

    if (state.outcome !== null) return
    const centre = frame.toScreen({
      x: WIDTH / 2,
      y: half === null ? HALF : half === 0 ? HALF / 2 : LENGTH - HALF / 2,
    })
    if (rink.scored !== null) {
      const name = state.players.find((p) => p.id === state.seats[rink.scored ?? 0])?.name ?? '?'
      banner(context, t('hockeyGoal', { name }), centre.x, centre.y, k * 0.1)
    } else if (rink.pause > 0) {
      banner(context, String(Math.ceil(rink.pause)), centre.x, centre.y, k * 0.35)
    }
  }

  /**
   * Where to draw a seat's mallet. On a phone of its own, one steered here moves to its finger at
   * once, as the host is going to move it, with or without smoothing (`OwnMallet`). Another
   * glides on from the host's word when smoothed, its corrections faded in, and is drawn where
   * the host's newest state has it otherwise; so is every mallet on one device, whose table has
   * no network to wait for, and once the game is over.
   */
  private mallet(
    seat: number,
    mallet: Disc,
    smooth: boolean,
    over: boolean,
    local: number,
    seconds: number,
  ): Disc {
    const aim = this.aims.get(seat)
    if (aim && !this.options.local && !over) {
      let own = this.own.get(seat)
      if (!own) {
        own = new OwnMallet(seat)
        this.own.set(seat, own)
      }
      return own.at(mallet, aim, seconds)
    }
    return (smooth ? this.smoother.mallet(seat, local, seconds) : null) ?? mallet
  }

  /** The keys of each seat steered here, for one device. */
  private keysHelp(state: TableState): string {
    return [...this.aims.keys()]
      .map((seat) => {
        const name = state.players.find((p) => p.id === state.seats[seat])?.name ?? '?'
        return t('keysOf', { name, keys: keysLabel(seat) })
      })
      .join(' · ')
  }
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}
