import type { Move } from '../core/board'
import {
  ALONE,
  CATEGORIES,
  type Category,
  encode,
  fits,
  letterOf,
  MAX_ANSWER,
  points,
  ROUNDS,
  SHARED,
  STOP_SECONDS,
  struck,
  UNIQUE,
  type WordsMove,
  type WordsView,
  writer,
} from '../core/stadtlandfluss'
import type { TableState } from '../core/table'
import { cleanText } from '../core/text'
import { type TextKey, t } from '../i18n'
import { type Picker, seatName } from './boards'
import { h } from './dom'
import { keptPlace } from './keep'

/**
 * Stadt, Land, Fluss on the screen: the round's letter and the time left, a field for each
 * category, which stays while the table redraws, Stop, and then every answer with its points,
 * which players tap to object to.
 */

export interface WordsOptions {
  readonly viewer: number
  /** Keeps the viewer's fields between redraws. */
  readonly picker: Picker
  /** Makes a move as the viewer; null when the viewer only watches. */
  readonly move: ((move: Move) => void) | null
  /** A screen everyone shares: players are named instead of "you". */
  readonly shared: boolean
}

const CATEGORY_NAMES: Record<Category, TextKey> = {
  city: 'catCity',
  country: 'catCountry',
  river: 'catRiver',
  name: 'catName',
  animal: 'catAnimal',
  job: 'catJob',
}

export const categoryName = (category: number): string => {
  const id = CATEGORIES[category]
  return id ? t(CATEGORY_NAMES[id]) : '?'
}

/** Seconds as minutes and seconds: 2:05. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Whether the viewer has something to do now: write, or check and say they are ready. */
export function wordsToMove(state: TableState, words: WordsView, viewer: number): boolean {
  const mine = state.seats.indexOf(viewer)
  if (state.outcome !== null || mine < 0 || words.winner !== null) return false
  if (words.phase === 'write') {
    return words.together ? writer(words) === mine : words.stopper !== mine && words.left > 0
  }
  return words.together || !words.ready[mine]
}

/** What the round asks of the viewer now, or how the game ended. */
export function wordsStatus(
  state: TableState,
  words: WordsView,
  viewer: number,
  shared: boolean,
): string {
  const mine = state.seats.indexOf(viewer)
  const name = (seat: number) => seatName(state, seat)
  const letter = letterOf(words)
  if (words.winner === 'draw') return t('draw')
  if (words.winner !== null) {
    return words.winner === mine && !shared
      ? t('youWin')
      : t('theyWin', { name: name(words.winner) })
  }
  if (words.phase === 'write') {
    if (words.together) {
      const now = writer(words)
      return t('wordsWrites', { name: name(now), letter })
    }
    if (words.stopper !== null) {
      return words.stopper === mine
        ? t('wordsYouStopped', { n: words.left })
        : t('wordsStopped', { name: name(words.stopper), n: words.left })
    }
    return t(mine < 0 ? 'wordsWatching' : 'wordsWrite', { letter })
  }
  if (words.together) return t('wordsCheckTogether')
  if (mine < 0 || words.ready[mine]) {
    const left = words.ready.filter((ready) => !ready).length
    return t(left === 1 ? 'waitingOne' : 'waitingMore', { n: left })
  }
  return t('wordsCheck')
}

/** The fields of one round, kept between redraws, and what they send. */
class Draft {
  readonly inputs: HTMLInputElement[]
  readonly stop: HTMLButtonElement
  readonly element: HTMLElement
  /** Sends a move as the viewer: set anew with every redraw. */
  send: ((move: Move) => void) | null = null
  private letter = ''
  private together = false
  private timers = new Map<number, ReturnType<typeof setTimeout>>()
  /** What each field said when it was last sent. */
  private sent: string[]

  constructor(answers: readonly string[]) {
    this.sent = [...answers]
    this.inputs = CATEGORIES.map((_, category) => {
      const input = h('input', {
        type: 'text',
        value: answers[category] ?? '',
        maxLength: MAX_ANSWER,
        autocomplete: 'off',
        spellcheck: false,
        enterKeyHint: category < CATEGORIES.length - 1 ? 'next' : 'done',
        ariaLabel: categoryName(category),
        oninput: () => {
          this.mark(category)
          this.later(category)
        },
        onchange: () => this.flush(category),
        onblur: () => this.flush(category),
        onkeydown: (event: KeyboardEvent) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          const next = this.inputs[category + 1]
          if (next) next.focus()
          else input.blur()
        },
      })
      input.setAttribute('autocapitalize', 'words')
      return input
    })
    this.stop = h('button', {
      type: 'button',
      class: 'primary big stop',
      onclick: () => {
        for (let category = 0; category < CATEGORIES.length; category++) this.flush(category)
        this.send?.(encode({ kind: 'stop' }))
      },
    })
    this.element = h(
      'div',
      { class: 'answer-fields' },
      ...this.inputs.map((input, category) =>
        h('label', { class: 'answer' }, h('span', {}, categoryName(category)), input),
      ),
      h('div', { class: 'buttons' }, this.stop),
    )
  }

  /** Brings the fields up to the table as it is now. */
  update(words: WordsView, canWrite: boolean): void {
    this.letter = letterOf(words)
    this.together = words.together
    for (const [category, input] of this.inputs.entries()) {
      input.disabled = !canWrite
      input.placeholder = `${this.letter}…`
      this.mark(category)
    }
    this.stop.hidden = !canWrite
    this.stop.textContent = t(words.together ? 'wordsDone' : 'wordsStop')
    this.markStop()
  }

  private mark(category: number): void {
    const input = this.inputs[category]
    if (!input) return
    const text = input.value.trim()
    input.classList.toggle('fits', text !== '' && fits(text, this.letter))
    input.classList.toggle('misfit', text !== '' && !fits(text, this.letter))
    this.markStop()
  }

  /** Stop needs a word for every category; Done on one device does not. */
  private markStop(): void {
    this.stop.disabled =
      !this.together && !this.inputs.every((input) => fits(input.value, this.letter))
  }

  /** Sends a field a moment after the player stops typing, not at every letter. */
  private later(category: number): void {
    clearTimeout(this.timers.get(category))
    this.timers.set(
      category,
      setTimeout(() => this.flush(category), 300),
    )
  }

  private flush(category: number): void {
    clearTimeout(this.timers.get(category))
    this.timers.delete(category)
    const input = this.inputs[category]
    if (!input || input.disabled) return
    const text = cleanText(input.value, MAX_ANSWER)
    if (text === this.sent[category]) return
    this.sent[category] = text
    this.send?.(encode({ kind: 'write', category, text }))
  }
}

/** Stadt, Land, Fluss as one player sees it. */
export function wordsView(
  state: TableState,
  words: WordsView,
  options: WordsOptions,
): HTMLElement[] {
  const mine = state.seats.indexOf(options.viewer)
  const letter = letterOf(words)
  const round = words.letters.length
  const head = h(
    'div',
    { class: 'letter-card' },
    h('span', { class: 'letter', ariaLabel: t('wordsLetter', { letter }) }, letter),
    h(
      'span',
      { class: 'round muted' },
      t('wordsRound', { n: round, of: ROUNDS }),
      words.phase === 'write' && !words.together
        ? h(
            'span',
            { class: `time${words.stopper !== null ? ' short' : ''}` },
            ` · ${clock(words.left)}`,
          )
        : null,
    ),
  )
  if (words.phase === 'write') {
    const nodes: (HTMLElement | null)[] = [head]
    const own = mine >= 0 ? words.answers[mine] : null
    if (own) {
      const draft = options.picker.keep(state, `words:${round}`, () => makeDraft(own))
      const fields = drafts.get(draft)
      const canWrite = options.move !== null && wordsToMove(state, words, options.viewer)
      if (fields) {
        fields.send = options.move
        fields.update(words, canWrite)
      }
      nodes.push(keptPlace(draft))
    } else if (mine >= 0 && words.together) {
      nodes.push(h('p', { class: 'muted' }, t('wordsNotYet')))
    }
    nodes.push(progress(state, words, mine))
    nodes.push(wordsHelp())
    return nodes.filter((node): node is HTMLElement => node !== null)
  }
  return [head, checkList(state, words, mine, options), totalsList(state, words), wordsHelp()]
}

/** The fields of each element made by `Draft`, to bring up to date with every redraw. */
const drafts = new WeakMap<HTMLElement, Draft>()
const makeDraft = (answers: readonly string[]): HTMLElement => {
  const draft = new Draft(answers)
  drafts.set(draft.element, draft)
  return draft.element
}

/** While everyone writes: how far each of the others is, or who has written on one device. */
function progress(state: TableState, words: WordsView, mine: number): HTMLElement {
  return h(
    'ul',
    { class: 'writers' },
    ...state.seats.map((_, seat) => {
      const note = words.together
        ? words.done[seat]
          ? '✓'
          : writer(words) === seat
            ? '✎'
            : ''
        : t('wordsFilled', { n: words.filled[seat] ?? 0, of: CATEGORIES.length })
      return h(
        'li',
        { class: seat === words.stopper ? 'stopper' : '' },
        h(
          'span',
          { class: 'name' },
          seat === mine && !words.together ? t('you') : seatName(state, seat),
        ),
        h('span', { class: 'muted' }, ` ${note}`),
      )
    }),
  )
}

/** Every answer of the round, by category, with its points; tapping one objects to it. */
function checkList(
  state: TableState,
  words: WordsView,
  mine: number,
  options: WordsOptions,
): HTMLElement {
  const scored = points(words)
  const letter = letterOf(words)
  const open = words.winner === null && options.move !== null && mine >= 0
  const others = state.seats.length - 1
  const sections = CATEGORIES.map((_, category) =>
    h(
      'section',
      { class: 'category' },
      h('h4', {}, categoryName(category)),
      h(
        'ul',
        {},
        ...state.seats.map((_, seat) => {
          const answer = words.answers[seat]?.[category] ?? ''
          const against = words.objections[seat]?.[category] ?? []
          const counts = scored[seat]?.[category] ?? 0
          const isStruck = struck(words, seat, category)
          const may =
            open &&
            fits(answer, letter) &&
            (words.together || (seat !== mine && !words.ready[mine]))
          const objected = words.together ? against.length > 0 : against.includes(mine)
          const text = answer === '' ? '—' : answer
          const label = [
            seatName(state, seat),
            text,
            t('wordsPoints', { n: counts }),
            against.length > 0 && !words.together
              ? t('wordsAgainst', { n: against.length, of: others })
              : '',
          ]
            .filter(Boolean)
            .join(', ')
          const content = [
            h('span', { class: 'name' }, seatName(state, seat)),
            h(
              'span',
              {
                class: `word${isStruck ? ' struck' : ''}${!fits(answer, letter) && answer ? ' misfit' : ''}`,
              },
              text,
            ),
            against.length > 0 && !words.together
              ? h('span', { class: 'against muted' }, `✗${against.length}`)
              : null,
            h('span', { class: `points p${counts}` }, String(counts)),
          ]
          return h(
            'li',
            {},
            may
              ? h(
                  'button',
                  {
                    type: 'button',
                    class: `answer-check${objected ? ' objected' : ''}`,
                    ariaPressed: String(objected),
                    ariaLabel: `${label}. ${t(objected ? 'wordsTakeBack' : 'wordsObject')}`,
                    onclick: () =>
                      options.move?.(encode({ kind: 'object', seat, category } as WordsMove)),
                  },
                  ...content,
                )
              : h('div', { class: 'answer-check' }, ...content),
          )
        }),
      ),
    ),
  )
  const ready =
    open && (words.together || !words.ready[mine])
      ? h(
          'div',
          { class: 'buttons' },
          h('button', {
            type: 'button',
            class: 'primary',
            textContent: t(words.letters.length >= ROUNDS ? 'wordsFinish' : 'wordsNext'),
            onclick: () => options.move?.(encode({ kind: 'ready' })),
          }),
        )
      : null
  return h(
    'div',
    { class: 'answers-check' },
    open ? h('p', { class: 'muted' }, t(words.together ? 'wordsTapTogether' : 'wordsTap')) : null,
    ...sections,
    ready,
  )
}

/** Each player's points: this round's, and all so far. */
function totalsList(state: TableState, words: WordsView): HTMLElement {
  const scored = points(words)
  const counted = words.winner !== null
  return h(
    'ul',
    { class: 'writers totals' },
    ...state.seats.map((_, seat) => {
      const now = (scored[seat] ?? []).reduce((a, b) => a + b, 0)
      const total = (words.totals[seat] ?? 0) + (counted ? 0 : now)
      return h(
        'li',
        { class: words.winner === seat ? 'won' : '' },
        h('span', { class: 'name' }, seatName(state, seat)),
        h('span', { class: 'muted' }, ` +${now}`),
        h('strong', { class: 'total' }, ` ${total}`),
        words.ready[seat] && !words.together && words.winner === null ? ' ✓' : '',
      )
    }),
  )
}

/** Whether the help is open: it stays as the player left it while the table redraws. */
let helpOpen = false

/** How the round goes and what answers count, for players learning the game. */
function wordsHelp(): HTMLElement {
  const details = h(
    'details',
    { class: 'card-help words-help', open: helpOpen },
    h('summary', {}, t('wordsHelp')),
    h(
      'ul',
      {},
      h('li', {}, t('wordsHelpWrite')),
      h('li', {}, t('wordsHelpStop', { n: STOP_SECONDS })),
      h('li', {}, t('wordsHelpPoints', { alone: ALONE, unique: UNIQUE, shared: SHARED })),
      h('li', {}, t('wordsHelpObject')),
      h('li', {}, t('wordsHelpTogether')),
    ),
  )
  details.addEventListener('toggle', () => {
    helpOpen = details.open
  })
  return details
}
