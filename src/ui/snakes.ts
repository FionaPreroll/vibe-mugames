import { COLUMNS, columnOf, ROWS, rowOf, type SnakesView, WIN_LENGTH } from '../core/snakes'
import type { TableState } from '../core/table'
import { t } from '../i18n'
import { seatName } from './boards'
import { banner, colour, type LiveOptions, themeColour } from './canvas'
import { h } from './dom'
import { type Steered, SteeredField } from './race'

/**
 * Snakes' field: the grid with its apples and every snake, steered like Lichtrenner's riders,
 * and how long each snake is, above it.
 */
export class SnakesField extends SteeredField {
  private readonly lengths = h('p', { class: 'snake-lengths' })
  private lengthsShown = ''

  constructor(viewer: number, shared: boolean, options: LiveOptions) {
    super(viewer, shared, options, t('snakes'), 'snakes')
    this.element.prepend(this.lengths)
  }

  protected steered(state: TableState): readonly Steered[] | null {
    return state.snakes?.snakes ?? null
  }

  override update(state: TableState): void {
    super.update(state)
    const game = state.snakes
    if (!game) return
    const text = JSON.stringify(game.snakes.map((s) => [s.body.length, s.alive]))
    if (text === this.lengthsShown) return
    this.lengthsShown = text
    this.lengths.replaceChildren(
      ...game.snakes.map((snake, seat) =>
        h(
          'span',
          { class: `snake-length${snake.alive ? '' : ' out'}` },
          h('span', { class: `piece seat-${seat}` }, '●'),
          ` ${seatName(state, seat)} ${snake.body.length}`,
        ),
      ),
      h('span', { class: 'muted' }, t('snakesGoal', { n: WIN_LENGTH })),
    )
  }

  protected draw(context: CanvasRenderingContext2D, width: number, height: number): void {
    const state = this.state
    const game = state?.snakes
    context.clearRect(0, 0, width, height)
    if (!state || !game) return
    const size = Math.min(width, height)
    const left = (width - size) / 2
    const top = (height - size) / 2
    const cell = size / COLUMNS
    context.fillStyle = themeColour('field')
    context.fillRect(left, top, size, size)
    context.strokeStyle = themeColour('field-line')
    context.lineWidth = 1
    context.beginPath()
    for (let line = 0; line <= COLUMNS; line += 4) {
      context.moveTo(left + line * cell, top)
      context.lineTo(left + line * cell, top + size)
    }
    for (let line = 0; line <= ROWS; line += 4) {
      context.moveTo(left, top + line * cell)
      context.lineTo(left + size, top + line * cell)
    }
    context.stroke()
    const centre = (at: number) => ({
      x: left + (columnOf(at) + 0.5) * cell,
      y: top + (rowOf(at) + 0.5) * cell,
    })
    drawApples(context, game, cell, centre)
    drawSnakes(context, game, cell, centre)

    const mine = state.seats.indexOf(this.viewer)
    if (game.countdown > 0) {
      const head = game.snakes[mine]?.body[0]
      if (mine >= 0 && !this.shared && head !== undefined) {
        const { x, y } = centre(head)
        context.strokeStyle = themeColour('text')
        context.lineWidth = 2
        context.beginPath()
        context.arc(x, y, cell * 2.2, 0, 2 * Math.PI)
        context.stroke()
        banner(context, t('snakesGetReady'), left + size / 2, top + size * 0.8, size / 22)
      }
      banner(context, String(Math.ceil(game.countdown)), left + size / 2, top + size / 2, size / 4)
    } else if (mine >= 0 && !this.shared && state.outcome === null && !game.snakes[mine]?.alive) {
      banner(context, t('snakesOut'), left + size / 2, top + size / 2, size / 18)
    }
  }
}

type Centre = (at: number) => { x: number; y: number }

/** The apples: round, glowing, with a leaf. */
function drawApples(
  context: CanvasRenderingContext2D,
  game: SnakesView,
  cell: number,
  centre: Centre,
): void {
  context.save()
  for (const apple of game.apples) {
    const { x, y } = centre(apple)
    context.fillStyle = themeColour('apple')
    context.shadowColor = themeColour('apple')
    context.shadowBlur = cell * 0.8
    context.beginPath()
    context.arc(x, y + cell * 0.05, cell * 0.34, 0, 2 * Math.PI)
    context.fill()
    context.shadowBlur = 0
    context.fillStyle = themeColour('apple-leaf')
    context.beginPath()
    context.ellipse(
      x + cell * 0.12,
      y - cell * 0.32,
      cell * 0.14,
      cell * 0.07,
      -0.6,
      0,
      2 * Math.PI,
    )
    context.fill()
  }
  context.restore()
}

/** Every snake: a thick line through its cells, its head round and bright, faded once out. */
function drawSnakes(
  context: CanvasRenderingContext2D,
  game: SnakesView,
  cell: number,
  centre: Centre,
): void {
  // Snakes still in on top of those out, which no longer block anything.
  const order = [...game.snakes.entries()].sort(([, a], [, b]) => Number(a.alive) - Number(b.alive))
  for (const [seat, snake] of order) {
    const points = snake.body.map(centre)
    const head = points[0]
    if (!head) continue
    context.save()
    context.globalAlpha = snake.alive ? 1 : 0.3
    context.strokeStyle = colour(seat)
    context.fillStyle = colour(seat)
    context.lineWidth = cell * 0.72
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.shadowColor = colour(seat)
    context.shadowBlur = snake.alive ? cell * 0.6 : 0
    context.beginPath()
    context.moveTo(head.x, head.y)
    for (const point of points.slice(1)) context.lineTo(point.x, point.y)
    if (points.length === 1) context.lineTo(head.x + 0.01, head.y)
    context.stroke()
    context.beginPath()
    context.arc(head.x, head.y, cell * 0.48, 0, 2 * Math.PI)
    context.fill()
    // Eyes, looking where the snake heads.
    const dx = snake.heading === 1 ? 1 : snake.heading === 3 ? -1 : 0
    const dy = snake.heading === 2 ? 1 : snake.heading === 0 ? -1 : 0
    context.shadowBlur = 0
    context.fillStyle = themeColour('rider')
    for (const side of [-1, 1]) {
      const ex = head.x + dx * cell * 0.18 + -dy * side * cell * 0.2
      const ey = head.y + dy * cell * 0.18 + dx * side * cell * 0.2
      context.beginPath()
      context.arc(ex, ey, cell * 0.09, 0, 2 * Math.PI)
      context.fill()
    }
    context.restore()
  }
}
