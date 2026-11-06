import { EARLY, POINTS_TO_WIN, type ReactionView } from '../core/reaction'
import type { TableState } from '../core/table'
import { t } from '../i18n'
import { seatName } from './boards'
import { banner, colour, type LiveOptions, themeColour } from './canvas'
import { h } from './dom'
import { type TapAt, type Zone, ZoneField } from './zones'

/**
 * Reaction's field: a big button for each seat played here, calm while everyone waits, bright
 * once the signal shows. This screen measures each tap's time itself, from the frame that first
 * showed the signal, so the network's delay counts for nobody.
 */
export class ReactionField extends ZoneField {
  private readonly points = h('p', { class: 'reaction-points' })
  private pointsShown = ''
  /** The signal this screen first showed, and when (in `performance.now()` time). */
  private shownSignal = -1
  private shownAt = 0
  /** The signal each seat played here has answered, so that it answers once. */
  private readonly answered = new Map<number, number>()

  constructor(viewer: number, shared: boolean, options: LiveOptions) {
    super(viewer, shared, options, t('reaction'), 'reaction')
    this.element.append(this.points)
  }

  protected override newGame(): void {
    this.answered.clear()
    this.shownSignal = -1
  }

  override update(state: TableState): void {
    super.update(state)
    const game = state.reaction
    if (!game) return
    const text = JSON.stringify(game.points)
    if (text === this.pointsShown) return
    this.pointsShown = text
    this.points.replaceChildren(
      ...game.points.map((points, seat) =>
        h(
          'span',
          { class: 'reaction-point' },
          h('span', { class: `piece seat-${seat}` }, '●'),
          ` ${seatName(state, seat)} ${points}`,
        ),
      ),
      h('span', { class: 'muted' }, t('reactionGoal', { n: POINTS_TO_WIN })),
    )
  }

  protected tap(seat: number, _at: TapAt, time: number): void {
    const state = this.state
    const game = state?.reaction
    if (!state || !game || state.outcome !== null) return
    if (this.answered.get(seat) === game.signal || game.answers[seat] !== null) return
    let answer: number
    if (game.phase === 'wait') answer = EARLY
    else if (game.phase === 'go') {
      // A tap before this screen showed the signal was too early, whatever the host knew.
      answer =
        this.shownSignal === game.signal ? Math.max(0, Math.round(time - this.shownAt)) : EARLY
    } else return
    this.answered.set(seat, game.signal)
    const id = state.seats[seat]
    if (id !== undefined) this.options.send(id, [state.round, game.signal, answer])
  }

  protected drawZone(context: CanvasRenderingContext2D, zone: Zone, now: number): void {
    const state = this.state
    const game = state?.reaction
    if (!state || !game) return
    if (game.phase === 'go' && this.shownSignal !== game.signal) {
      this.shownSignal = game.signal
      this.shownAt = now
    }
    // What the field shows, once drawn, for tests and tools that cannot see the canvas.
    this.element.dataset.phase = game.phase
    const { seat } = zone
    const mine = seat >= 0 ? game.answers[seat] : null
    const go = game.phase === 'go' && mine === null
    const early = mine === EARLY || (seat >= 0 && this.early(seat, game))
    context.fillStyle = early
      ? themeColour('poor')
      : go
        ? themeColour('signal')
        : themeColour('field')
    context.fillRect(zone.x, zone.y, zone.width, zone.height)
    if (seat >= 0 && this.seats.length > 1) {
      context.fillStyle = colour(seat)
      context.fillRect(zone.x, zone.y, zone.width, Math.max(6, zone.height * 0.04))
    }
    const x = zone.x + zone.width / 2
    const y = zone.y + zone.height / 2
    const size = Math.min(zone.width, zone.height)
    if (seat >= 0 && this.seats.length > 1) {
      banner(context, seatName(state, seat), x, zone.y + size * 0.14, size / 12)
    }
    banner(context, this.word(game, seat, early), x, y, size / (go ? 5 : 9))
    const result = this.result(game, seat)
    if (result) banner(context, result, x, y + size * 0.2, size / 14)
  }

  /** Whether a seat played here has tapped too early, before the host says so. */
  private early(seat: number, game: ReactionView): boolean {
    return game.phase === 'wait' && this.answered.get(seat) === game.signal
  }

  /** The big word in a seat's part: wait, tap, too early, or its time. */
  private word(game: ReactionView, seat: number, early: boolean): string {
    if (early) return t('reactionEarly')
    const mine = seat >= 0 ? game.answers[seat] : null
    if (game.phase === 'ready') return t('reactionReady')
    if (game.phase === 'wait') return t('reactionWait')
    if (game.phase === 'go') {
      if (mine === null || mine === undefined) return seat >= 0 ? t('reactionTap') : t('reactionGo')
      return t('reactionMs', { ms: mine })
    }
    if (game.scored.includes(seat)) return t('reactionFastest')
    if (mine === null || mine === undefined) return seat >= 0 ? t('reactionTooSlow') : ''
    return t('reactionMs', { ms: mine })
  }

  /** Under the word, once a signal is over: who was fastest, and how fast. */
  private result(game: ReactionView, seat: number): string {
    if (game.phase !== 'result' || !this.state) return ''
    const state = this.state
    const best = game.scored[0]
    if (best === undefined) return t('reactionNobody')
    const time = game.answers[best] ?? 0
    if (game.scored.includes(seat)) return t('reactionMs', { ms: time })
    const names = game.scored.map((s) => seatName(state, s)).join(', ')
    return t('reactionWinner', { name: names, ms: time })
  }
}
