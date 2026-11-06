import type { Move } from '../core/board'
import {
  DRAW_SECONDS,
  ERASER,
  encode,
  GRID,
  INKS,
  MAX_GUESS,
  MAX_INK,
  MAX_STROKE,
  names,
  type SketchView,
} from '../core/montagsmaler'
import type { TableState } from '../core/table'
import { cleanText } from '../core/text'
import { currentLanguage, type TextKey, t } from '../i18n'
import { type Picker, seatName } from './boards'
import { themeColour } from './canvas'
import { h } from './dom'
import { keptPlace } from './keep'

/**
 * Montagsmaler on the screen: the paper, which the one drawing draws on with a finger or the
 * mouse and everyone else watches fill, the word or its letters, the guesses, and the points.
 * The paper and the guess field stay while the table redraws.
 */

export interface SketchOptions {
  readonly viewer: number
  readonly picker: Picker
  /** Makes a move as the viewer; null when the viewer only watches. */
  readonly move: ((move: Move) => void) | null
  /** A screen everyone shares: players are named instead of "you". */
  readonly shared: boolean
  /** The word is hidden until asked for, as the others see this screen too. */
  readonly hideOwn: boolean
}

/** The tokens of the inks, the last one the eraser's paper. */
const INK_TOKENS = ['ink', 'card-red', 'card-blue', 'seat-2', 'seat-1', 'paper'] as const
const INK_NAMES: readonly TextKey[] = [
  'inkBlack',
  'inkRed',
  'inkBlue',
  'inkGreen',
  'inkYellow',
  'inkEraser',
]

/** The word drawn, in the player's language. */
export function wordName(word: number | null): string {
  return word === null ? '?' : (names(word, currentLanguage())[0] ?? '?')
}

/** Whether the viewer has something to do: choose, draw, or guess. */
export function sketchToMove(state: TableState, sketch: SketchView, viewer: number): boolean {
  const mine = state.seats.indexOf(viewer)
  if (state.outcome !== null || mine < 0 || sketch.winner !== null) return false
  if (mine === sketch.drawer) return sketch.phase !== 'show'
  return sketch.phase === 'draw' && !sketch.together && !sketch.guessed.includes(mine)
}

/** What the turn asks of the viewer now, or how the game ended. */
export function sketchStatus(
  state: TableState,
  sketch: SketchView,
  viewer: number,
  shared: boolean,
): string {
  const mine = state.seats.indexOf(viewer)
  const name = seatName(state, sketch.drawer)
  if (sketch.winner === 'draw') return t('draw')
  if (sketch.winner !== null) {
    return sketch.winner === mine && !shared
      ? t('youWin')
      : t('theyWin', { name: seatName(state, sketch.winner) })
  }
  const drawing = mine === sketch.drawer
  if (sketch.phase === 'choose') {
    if (shared) return t('sketchChooseName', { name })
    return drawing ? t('sketchChoose') : t('sketchChooses', { name })
  }
  if (sketch.phase === 'show') return t('sketchWas', { word: wordName(sketch.word) })
  const n = sketch.left
  if (sketch.together) return t('sketchAloud', { name, n })
  if (drawing) return t('sketchDraw', { n })
  if (sketch.guessed.includes(mine)) return t('sketchYouGot', { n })
  return t(mine < 0 ? 'sketchWatching' : 'sketchGuess', { name, n })
}

/** The paper of one turn, kept between redraws: drawn on by the one drawing, watched by all. */
class Paper {
  readonly canvas = h('canvas', { class: 'paper-canvas' })
  readonly element: HTMLElement
  /** Sends a move as the viewer: set anew with every redraw. */
  send: ((move: Move) => void) | null = null
  /** The drawing as this phone shows it: the table's, or what the one drawing drew. */
  private ink: number[] = []
  /** How much of `ink` went to the host already, for the one drawing. */
  private sent = 0
  private drawing = false
  /** Whether this phone draws. */
  private mine = false
  /** The ink the one drawing draws with now. */
  pen = 0
  private timer: ReturnType<typeof setInterval> | null = null
  private frame = 0
  private last = -1

  constructor() {
    this.element = h('div', { class: 'paper' }, this.canvas)
    this.canvas.addEventListener('pointerdown', (event) => this.down(event))
    this.canvas.addEventListener('pointermove', (event) => this.moveTo(event))
    this.canvas.addEventListener('pointerup', () => this.up())
    this.canvas.addEventListener('pointercancel', () => this.up())
  }

  /** Brings the paper up to the table: the one drawing keeps their own strokes. */
  update(sketch: SketchView, mine: boolean): void {
    this.mine = mine
    this.canvas.classList.toggle('drawing', mine)
    if (!mine) this.ink = [...sketch.ink]
    else if (sketch.ink.length > this.ink.length) {
      // Back on this phone after a while: the host's drawing is the whole one.
      this.ink = [...sketch.ink]
      this.sent = this.ink.length
    }
    this.paint()
  }

  /** Whether more can be drawn. */
  get full(): boolean {
    return this.ink.length >= MAX_INK - 2
  }

  undo(): void {
    this.flush()
    const last = this.ink.findLastIndex((n) => n < 0)
    this.ink = this.ink.slice(0, Math.max(0, last))
    this.sent = this.ink.length
    this.send?.(encode({ kind: 'undo' }))
    this.paint()
  }

  clear(): void {
    this.flush()
    this.ink = []
    this.sent = 0
    this.send?.(encode({ kind: 'clear' }))
    this.paint()
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer)
    this.timer = null
  }

  private point(event: PointerEvent): number {
    const box = this.canvas.getBoundingClientRect()
    const along = (value: number, size: number) =>
      Math.max(0, Math.min(GRID - 1, Math.round((value / Math.max(1, size)) * (GRID - 1))))
    return (
      along(event.clientX - box.left, box.width) * GRID + along(event.clientY - box.top, box.height)
    )
  }

  private down(event: PointerEvent): void {
    if (!this.mine || !this.send || this.full) return
    event.preventDefault()
    this.canvas.setPointerCapture?.(event.pointerId)
    this.drawing = true
    const point = this.point(event)
    this.ink.push(-1 - this.pen, point)
    this.last = point
    this.timer ??= setInterval(() => this.flush(), 100)
    this.paint()
  }

  private moveTo(event: PointerEvent): void {
    if (!this.drawing) return
    event.preventDefault()
    const point = this.point(event)
    if (point === this.last || this.full) return
    this.ink.push(point)
    this.last = point
    this.paint()
  }

  private up(): void {
    if (!this.drawing) return
    this.drawing = false
    this.flush()
  }

  /** Sends what was drawn since the last time, in moves small enough. */
  private flush(): void {
    while (this.sent < this.ink.length) {
      const part = this.ink.slice(this.sent, this.sent + MAX_STROKE)
      this.sent += part.length
      this.send?.(encode({ kind: 'draw', ink: part }))
    }
    if (!this.drawing) this.stop()
  }

  /** Draws the paper at the next frame, once it has its size on the page. */
  private paint(): void {
    if (this.frame) return
    const draw = () => {
      this.frame = 0
      this.draw()
    }
    if (typeof requestAnimationFrame === 'function') this.frame = requestAnimationFrame(draw)
    else draw()
  }

  private draw(): void {
    const ratio = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1
    const size = Math.round((this.canvas.clientWidth || 300) * ratio)
    if (this.canvas.width !== size) {
      this.canvas.width = size
      this.canvas.height = size
    }
    const context = this.canvas.getContext?.('2d')
    if (!context) return
    const unit = size / (GRID - 1)
    context.fillStyle = themeColour('paper')
    context.fillRect(0, 0, size, size)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    let open = false
    let first = false
    for (const n of this.ink) {
      if (n < 0) {
        if (open) context.stroke()
        const ink = -1 - n
        context.beginPath()
        context.strokeStyle = themeColour(INK_TOKENS[ink] ?? 'ink')
        context.lineWidth = unit * (ink === ERASER ? 5 : 0.9)
        open = true
        first = true
        continue
      }
      if (!open) continue
      const x = Math.floor(n / GRID) * unit
      const y = (n % GRID) * unit
      // A stroke begins at its first point, and a single point shows as a dot.
      if (first) context.moveTo(x - 0.01, y)
      first = false
      context.lineTo(x, y)
    }
    if (open) context.stroke()
  }
}

/** The guess field of one turn, kept between redraws. */
class GuessField {
  readonly input: HTMLInputElement
  readonly button: HTMLButtonElement
  readonly element: HTMLElement
  send: ((move: Move) => void) | null = null

  constructor() {
    this.input = h('input', {
      type: 'text',
      maxLength: MAX_GUESS,
      autocomplete: 'off',
      spellcheck: false,
      enterKeyHint: 'send',
      ariaLabel: t('sketchGuessLabel'),
      placeholder: t('sketchGuessLabel'),
      onkeydown: (event: KeyboardEvent) => {
        if (event.key !== 'Enter') return
        event.preventDefault()
        this.submit()
      },
    })
    this.button = h('button', {
      type: 'button',
      class: 'primary',
      textContent: t('sketchSend'),
      onclick: () => this.submit(),
    })
    this.element = h('div', { class: 'guess-field' }, this.input, this.button)
  }

  update(open: boolean): void {
    this.input.disabled = !open
    this.button.disabled = !open
  }

  private submit(): void {
    const text = cleanText(this.input.value, MAX_GUESS)
    if (!text || !this.send) return
    this.send(encode({ kind: 'guess', text }))
    this.input.value = ''
  }
}

const papers = new WeakMap<HTMLElement, Paper>()
const guesses = new WeakMap<HTMLElement, GuessField>()

/** Montagsmaler as one player sees it. */
export function sketchView(
  state: TableState,
  sketch: SketchView,
  options: SketchOptions,
): HTMLElement[] {
  const mine = state.seats.indexOf(options.viewer)
  const drawing = mine === sketch.drawer && sketch.winner === null
  const nodes: (HTMLElement | null)[] = []
  nodes.push(turnLine(state, sketch))
  if (sketch.phase === 'choose') {
    if (drawing && options.move) nodes.push(choices(sketch, options.move))
    nodes.push(scoreList(state, sketch), sketchHelp())
    return nodes.filter((node): node is HTMLElement => node !== null)
  }
  nodes.push(wordLine(sketch, mine, options))
  const key = `sketch:${sketch.turn}`
  const paperElement = options.picker.keep(state, `${key}:paper`, () => {
    const paper = new Paper()
    papers.set(paper.element, paper)
    return paper.element
  })
  const paper = papers.get(paperElement)
  const canDraw = drawing && sketch.phase === 'draw' && options.move !== null
  if (paper) {
    paper.send = options.move
    paper.update(sketch, canDraw)
  }
  nodes.push(keptPlace(paperElement))
  if (canDraw && paper) nodes.push(tools(paper, options.picker))
  if (canDraw && options.move) nodes.push(gotButtons(state, sketch, options.move))
  const guessing =
    !sketch.together && mine >= 0 && !drawing && sketch.phase === 'draw' && sketch.winner === null
  if (guessing) {
    const fieldElement = options.picker.keep(state, `${key}:guess`, () => {
      const field = new GuessField()
      guesses.set(field.element, field)
      return field.element
    })
    const field = guesses.get(fieldElement)
    if (field) {
      field.send = options.move
      field.update(options.move !== null && !sketch.guessed.includes(mine))
    }
    nodes.push(keptPlace(fieldElement))
  }
  nodes.push(feedList(state, sketch, mine), scoreList(state, sketch), sketchHelp())
  return nodes.filter((node): node is HTMLElement => node !== null)
}

/** Which turn this is, and who draws. */
function turnLine(state: TableState, sketch: SketchView): HTMLElement {
  return h(
    'p',
    { class: 'sketch-turn muted' },
    t('sketchTurn', { n: sketch.turn + 1, of: sketch.turns, name: seatName(state, sketch.drawer) }),
    sketch.phase === 'draw'
      ? h('span', { class: `time${sketch.left <= 10 ? ' short' : ''}` }, ` · ${sketch.left} s`)
      : null,
  )
}

/** The three words the one drawing chooses from. */
function choices(sketch: SketchView, move: (move: Move) => void): HTMLElement {
  return h(
    'div',
    { class: 'buttons column word-choices' },
    ...sketch.options.map((word, option) =>
      h('button', {
        type: 'button',
        class: 'big',
        textContent: wordName(word),
        onclick: () => move(encode({ kind: 'choose', option })),
      }),
    ),
  )
}

/** The word: for the one drawing, hidden on a shared screen until asked; for the others, its letters. */
function wordLine(sketch: SketchView, mine: number, options: SketchOptions): HTMLElement | null {
  if (sketch.phase === 'show' || sketch.winner !== null) {
    return h('p', { class: 'sketch-word shown' }, wordName(sketch.word))
  }
  if (mine === sketch.drawer && sketch.word !== null) {
    const hide = (options.shared || options.hideOwn) && !options.picker.showOwn
    const toggle =
      options.shared || options.hideOwn
        ? h('button', {
            type: 'button',
            class: 'own-toggle',
            textContent: t(options.picker.showOwn ? 'sketchHideWord' : 'sketchShowWord'),
            ariaPressed: String(options.picker.showOwn),
            onclick: () => {
              options.picker.showOwn = !options.picker.showOwn
              options.picker.onChange()
            },
          })
        : null
    return h(
      'p',
      { class: 'sketch-word mine' },
      hide ? t('sketchWordHidden') : t('sketchYourWord', { word: wordName(sketch.word) }),
      toggle,
    )
  }
  if (sketch.together) return null
  const hint = sketch.hint[currentLanguage()]
  if (!hint) return null
  const letters = [...hint].filter((char) => char === '_' || /\p{L}/u.test(char)).length
  return h(
    'p',
    { class: 'sketch-word blanks-line', ariaLabel: t('sketchLetters', { n: letters }) },
    h('span', { class: 'blanks' }, hint),
    h('small', { class: 'muted' }, ` ${t('sketchLetters', { n: letters })}`),
  )
}

/** The inks, the eraser, undo and clear, for the one drawing. */
function tools(paper: Paper, picker: Picker): HTMLElement {
  const inks = Array.from({ length: INKS }, (_, ink) =>
    h('button', {
      type: 'button',
      class: `ink ink-${ink}${paper.pen === ink ? ' chosen' : ''}`,
      ariaLabel: t(INK_NAMES[ink] ?? 'inkBlack'),
      ariaPressed: String(paper.pen === ink),
      title: t(INK_NAMES[ink] ?? 'inkBlack'),
      textContent: ink === ERASER ? '⌫' : '',
      onclick: () => {
        paper.pen = ink
        picker.onChange()
      },
    }),
  )
  return h(
    'div',
    { class: 'sketch-tools' },
    ...inks,
    h('button', {
      type: 'button',
      textContent: t('sketchUndo'),
      onclick: () => paper.undo(),
    }),
    h('button', {
      type: 'button',
      textContent: t('sketchClear'),
      onclick: () => paper.clear(),
    }),
  )
}

/** For words said aloud: the one drawing taps who got it. */
function gotButtons(
  state: TableState,
  sketch: SketchView,
  move: (move: Move) => void,
): HTMLElement {
  const open = state.seats.flatMap((_, seat) =>
    seat !== sketch.drawer && !sketch.guessed.includes(seat) ? [seat] : [],
  )
  return h(
    'div',
    { class: 'got' },
    h('p', { class: 'muted' }, t(sketch.together ? 'sketchWhoGotTogether' : 'sketchWhoGot')),
    h(
      'div',
      { class: 'buttons' },
      ...open.map((seat) =>
        h('button', {
          type: 'button',
          textContent: seatName(state, seat),
          onclick: () => move(encode({ kind: 'got', seat })),
        }),
      ),
    ),
  )
}

/** The guesses of this turn, newest first. */
function feedList(state: TableState, sketch: SketchView, mine: number): HTMLElement | null {
  if (sketch.feed.length === 0) return null
  return h(
    'ul',
    { class: 'feed' },
    ...[...sketch.feed]
      .reverse()
      .map((guess) =>
        h(
          'li',
          { class: guess.text === null ? 'got-it' : guess.close ? 'close' : '' },
          h(
            'span',
            { class: 'name' },
            guess.seat === mine ? t('you') : seatName(state, guess.seat),
          ),
          ' ',
          guess.text === null
            ? t('sketchGotIt')
            : guess.close
              ? `${guess.text} · ${t('sketchClose')}`
              : guess.text,
        ),
      ),
  )
}

/** Everyone's points, with what they scored this turn. */
function scoreList(state: TableState, sketch: SketchView): HTMLElement {
  return h(
    'ul',
    { class: 'writers totals' },
    ...state.seats.map((_, seat) =>
      h(
        'li',
        {
          class: `${seat === sketch.drawer ? 'stopper' : ''}${sketch.winner === seat ? ' won' : ''}`,
        },
        h('span', { class: 'name' }, seatName(state, seat)),
        sketch.guessed.includes(seat) ? ' ✓' : seat === sketch.drawer ? ' ✎' : '',
        (sketch.gained[seat] ?? 0) > 0
          ? h('span', { class: 'muted' }, ` +${sketch.gained[seat]}`)
          : null,
        h('strong', { class: 'total' }, ` ${sketch.points[seat] ?? 0}`),
      ),
    ),
  )
}

let helpOpen = false

/** How a turn goes and what scores, for players learning the game. */
function sketchHelp(): HTMLElement {
  const details = h(
    'details',
    { class: 'card-help words-help sketch-help', open: helpOpen },
    h('summary', {}, t('sketchHelp')),
    h(
      'ul',
      {},
      h('li', {}, t('sketchHelpDraw', { n: DRAW_SECONDS })),
      h('li', {}, t('sketchHelpGuess')),
      h('li', {}, t('sketchHelpPoints')),
      h('li', {}, t('sketchHelpAloud')),
    ),
  )
  details.addEventListener('toggle', () => {
    helpOpen = details.open
  })
  return details
}
