import type { Move } from '../core/board'
import type { TableState } from '../core/table'
import { cleanText } from '../core/text'
import {
  type Answer,
  type Entry,
  encode,
  GIVE_UP,
  MAX_QUESTION,
  MAYBE,
  NO,
  RIGHT,
  termNames,
  VOTE_SECONDS,
  type Vote,
  type WhoView,
  waitingFor,
  YES,
} from '../core/werbinich'
import type { TermKind } from '../core/whoTerms'
import { currentLanguage, type TextKey, t } from '../i18n'
import { type Picker, seatName } from './boards'
import { h } from './dom'
import { keptPlace } from './keep'

/**
 * Wer bin ich? on the screen: everyone's term but the viewer's own, the question being answered,
 * and what the one asking has learnt so far. The question field stays while the table redraws.
 * On one device, only the term of the one asking shows, once they look away and it is asked for.
 */

export interface WhoOptions {
  readonly viewer: number
  readonly picker: Picker
  /** Makes a move as the viewer; null when the viewer only watches. */
  readonly move: ((move: Move) => void) | null
  /** A screen everyone shares: players are named instead of "you". */
  readonly shared: boolean
  /** The one asking's term is hidden until asked for, as they see this screen too. */
  readonly hideOwn: boolean
}

/** A term, in the player's language. */
export function termName(term: number | null): string {
  return term === null ? '?' : (termNames(term, currentLanguage())[0] ?? '?')
}

const KINDS: Record<TermKind, TextKey> = {
  animal: 'whoKindAnimal',
  job: 'whoKindJob',
  figure: 'whoKindFigure',
  thing: 'whoKindThing',
}

/** Whether the viewer has something to do: ask, or answer. */
export function whoToMove(state: TableState, who: WhoView, viewer: number): boolean {
  const mine = state.seats.indexOf(viewer)
  if (state.outcome !== null || mine < 0) return false
  return waitingFor(who).includes(mine)
}

/** What the turn asks of the viewer now, or how the game ended. */
export function whoStatus(
  state: TableState,
  who: WhoView,
  viewer: number,
  shared: boolean,
): string {
  const mine = state.seats.indexOf(viewer)
  const name = seatName(state, who.asker)
  if (who.winner === 'draw') return t('draw')
  if (who.winner !== null) {
    return who.winner === mine && !shared
      ? t('youWin')
      : t('theyWin', { name: seatName(state, who.winner) })
  }
  if (who.together) return t('whoAloud', { name })
  const n = who.left
  if (who.phase === 'ask') return mine === who.asker ? t('whoAsk') : t('whoAsks', { name })
  if (mine === who.asker) return t('whoWait', { n })
  if (mine < 0) return t('whoAsks', { name })
  if (who.votes[mine] !== null) return t('whoAnswered', { n })
  return t(who.question?.guess ? 'whoJudge' : 'whoAnswer', { name, n })
}

/** The field for a question or a guess, kept between redraws. */
class QuestionField {
  readonly input: HTMLInputElement
  readonly buttons: HTMLButtonElement[]
  readonly element: HTMLElement
  send: ((move: Move) => void) | null = null

  constructor() {
    this.input = h('input', {
      type: 'text',
      maxLength: MAX_QUESTION,
      autocomplete: 'off',
      enterKeyHint: 'send',
      ariaLabel: t('whoQuestionLabel'),
      placeholder: t('whoQuestionHint'),
      onkeydown: (event: KeyboardEvent) => {
        if (event.key !== 'Enter') return
        event.preventDefault()
        this.submit(false)
      },
    })
    this.buttons = [
      h('button', {
        type: 'button',
        class: 'primary',
        textContent: t('whoAskButton'),
        onclick: () => this.submit(false),
      }),
      h('button', {
        type: 'button',
        textContent: t('whoGuessButton'),
        onclick: () => this.submit(true),
      }),
    ]
    this.element = h(
      'div',
      { class: 'question-field' },
      h('div', { class: 'guess-field' }, this.input, ...this.buttons),
    )
  }

  update(open: boolean): void {
    this.input.disabled = !open
    for (const button of this.buttons) button.disabled = !open
  }

  private submit(guess: boolean): void {
    const text = cleanText(this.input.value, MAX_QUESTION)
    if (!text || !this.send) return
    this.send(encode({ kind: guess ? 'guess' : 'ask', text }))
    this.input.value = ''
  }
}

const fields = new WeakMap<HTMLElement, QuestionField>()

/** The turn a picker last showed the one asking's term in, on one device. */
const shownIn = new WeakMap<Picker, number>()

/** Wer bin ich? as one player sees it. */
export function whoView(state: TableState, who: WhoView, options: WhoOptions): HTMLElement[] {
  const mine = state.seats.indexOf(options.viewer)
  const over = who.winner !== null
  const nodes: (HTMLElement | null)[] = []
  if (who.together && !over) nodes.push(askerCard(state, who, mine, options))
  else nodes.push(cards(state, who, mine))
  if (!over && options.move) {
    if (who.together) {
      if (mine === who.asker) nodes.push(saidButtons(options.move))
    } else if (who.phase === 'ask' && mine === who.asker) {
      const element = options.picker.keep(state, `who:${who.turn}:field`, () => {
        const field = new QuestionField()
        fields.set(field.element, field)
        return field.element
      })
      const field = fields.get(element)
      if (field) {
        field.send = options.move
        field.update(true)
      }
      nodes.push(keptPlace(element))
    }
    if (who.phase === 'ask' && mine === who.asker)
      nodes.push(turnButtons(state, options.picker, options.move))
  }
  if (who.phase === 'vote' && who.question) nodes.push(questionCard(state, who, mine, options))
  nodes.push(previous(state, who, mine), knowledge(state, who, mine, options.shared), whoHelp())
  return nodes.filter((node): node is HTMLElement => node !== null)
}

/** Everyone's terms but the viewer's own: who asks now, and who knows theirs. */
function cards(state: TableState, who: WhoView, mine: number): HTMLElement {
  return h(
    'ul',
    { class: 'who-cards' },
    ...state.seats.map((_, seat) => {
      const term = who.terms[seat] ?? null
      const solved = who.solved.includes(seat)
      const out = who.gaveUp.includes(seat)
      const kind = who.kinds[seat] ?? 'thing'
      return h(
        'li',
        {
          class: `who-card${seat === who.asker && who.winner === null ? ' asking' : ''}${
            solved ? ' solved' : ''
          }${out ? ' out' : ''}${seat === mine ? ' mine' : ''}${who.winner === seat ? ' won' : ''}`,
        },
        h(
          'span',
          { class: 'name' },
          seat === mine ? t('you') : seatName(state, seat),
          solved ? ` ✓ ${who.solved.indexOf(seat) + 1}.` : out ? ' ✗' : '',
        ),
        h('strong', { class: 'term' }, term === null ? '?' : termName(term)),
        h('small', { class: 'muted' }, t(KINDS[kind])),
      )
    }),
  )
}

/** On one device: the one asking's term, hidden until they look away and it is asked for. */
function askerCard(
  state: TableState,
  who: WhoView,
  mine: number,
  options: WhoOptions,
): HTMLElement {
  const name = seatName(state, who.asker)
  const kind = t(KINDS[who.kinds[who.asker] ?? 'thing'])
  const own = mine === who.asker
  const hiding = own && (options.shared || options.hideOwn)
  if (hiding && shownIn.get(options.picker) !== who.turn) options.picker.showOwn = false
  const shown = !hiding || options.picker.showOwn
  return h(
    'div',
    { class: 'who-asker' },
    h('p', { class: 'muted' }, t('whoTermOf', { name, kind })),
    h(
      'p',
      { class: `who-term${shown ? '' : ' hidden'}` },
      shown ? termName(who.terms[who.asker] ?? null) : t('whoTermHidden', { name }),
    ),
    hiding
      ? h('button', {
          type: 'button',
          textContent: t(options.picker.showOwn ? 'whoHideTerm' : 'whoShowTerm', { name }),
          ariaPressed: String(options.picker.showOwn),
          onclick: () => {
            options.picker.showOwn = !options.picker.showOwn
            shownIn.set(options.picker, who.turn)
            options.picker.onChange()
          },
        })
      : null,
  )
}

/** On one device: what the others said aloud. */
function saidButtons(move: (move: Move) => void): HTMLElement {
  const said = (key: TextKey, value: typeof YES | typeof NO | typeof RIGHT, primary = false) =>
    h('button', {
      type: 'button',
      class: primary ? 'primary' : '',
      textContent: t(key),
      onclick: () => move(encode({ kind: 'said', said: value })),
    })
  return h(
    'div',
    { class: 'who-said' },
    h('p', { class: 'muted' }, t('whoSaidPrompt')),
    h(
      'div',
      { class: 'buttons' },
      said('whoSaidYes', YES),
      said('whoSaidNo', NO),
      said('whoSaidRight', RIGHT, true),
    ),
  )
}

/**
 * Passing the turn, or giving up, for the one asking: giving up takes a second tap, which the
 * picker remembers until the next move.
 */
function turnButtons(state: TableState, picker: Picker, move: (move: Move) => void): HTMLElement {
  const sure = picker.current(state)[0] === GIVE_UP
  return h(
    'div',
    { class: 'buttons who-turn' },
    h('button', {
      type: 'button',
      textContent: t('whoPass'),
      onclick: () => move(encode({ kind: 'pass' })),
    }),
    h('button', {
      type: 'button',
      class: sure ? 'danger' : '',
      textContent: t(sure ? 'whoGiveUpSure' : 'whoGiveUp'),
      onclick: () => {
        if (sure) move(encode({ kind: 'giveUp' }))
        else picker.set([GIVE_UP])
      },
    }),
  )
}

/** The question being answered, the buttons to answer it, and who has. */
function questionCard(
  state: TableState,
  who: WhoView,
  mine: number,
  options: WhoOptions,
): HTMLElement {
  const question = who.question
  const guess = question?.guess ?? false
  const own = mine === who.asker && !options.shared
  const voting =
    options.move !== null && mine >= 0 && mine !== who.asker && who.votes[mine] === null
  const vote = (key: TextKey, value: Vote) =>
    h('button', {
      type: 'button',
      class: `vote vote-${value}`,
      textContent: t(key),
      onclick: () => options.move?.(encode({ kind: 'vote', vote: value })),
    })
  const voters = state.seats.flatMap((_, seat) => (seat === who.asker ? [] : [seat]))
  return h(
    'div',
    { class: `who-question${guess ? ' guess' : ''}` },
    h(
      'p',
      { class: 'muted' },
      own
        ? t(guess ? 'whoYouGuess' : 'whoYouAsk')
        : t(guess ? 'whoGuesses' : 'whoAsked', { name: seatName(state, who.asker) }),
    ),
    h('p', { class: 'question' }, question?.text ?? ''),
    voting
      ? h(
          'div',
          { class: 'buttons' },
          vote(guess ? 'whoVoteRight' : 'whoVoteYes', YES),
          vote(guess ? 'whoVoteWrong' : 'whoVoteNo', NO),
          vote('whoVoteMaybe', MAYBE),
        )
      : null,
    h(
      'ul',
      { class: 'writers' },
      ...voters.map((seat) =>
        h(
          'li',
          { class: who.votes[seat] === null ? '' : 'stopper' },
          h('span', { class: 'name' }, seat === mine ? t('you') : seatName(state, seat)),
          who.votes[seat] === null ? ' …' : ' ✓',
        ),
      ),
    ),
  )
}

const ANSWERS: Record<Answer, TextKey> = {
  yes: 'whoAnswerYes',
  no: 'whoAnswerNo',
  maybe: 'whoAnswerMaybe',
  right: 'whoAnswerRight',
  wrong: 'whoAnswerWrong',
  pass: 'whoAnswerPass',
  out: 'whoAnswerOut',
}

/** One question and its answer, with how the others answered. */
function entryLine(entry: Entry): HTMLElement {
  const [yes, no, maybe] = entry.counts
  const counted = yes + no + maybe > 0
  return h(
    'li',
    { class: `answer-${entry.answer}` },
    h(
      'span',
      { class: 'question' },
      entry.text ?? t(entry.guess ? 'whoGuessedAloud' : 'whoAskedAloud'),
    ),
    ' ',
    h('strong', { class: 'answer' }, t(ANSWERS[entry.answer])),
    counted ? h('small', { class: 'muted' }, ` ✓${yes} ✗${no} ?${maybe}`) : null,
  )
}

/** How the last turn of someone else ended, once the next player asks. */
function previous(state: TableState, who: WhoView, mine: number): HTMLElement | null {
  const last = who.log.at(-1)
  if (!last || last.seat === who.asker || who.winner !== null) return null
  return h(
    'p',
    { class: 'who-previous muted' },
    `${last.seat === mine ? t('you') : seatName(state, last.seat)}: `,
    last.text ?? '',
    last.text ? ' ' : '',
    h('strong', {}, t(ANSWERS[last.answer])),
  )
}

/** What the one asking has learnt so far, newest first. */
function knowledge(
  state: TableState,
  who: WhoView,
  mine: number,
  shared: boolean,
): HTMLElement | null {
  const entries = who.log.filter((entry) => entry.seat === who.asker && entry.answer !== 'pass')
  if (entries.length === 0 || who.winner !== null) return null
  const name = mine === who.asker && !shared ? null : seatName(state, who.asker)
  return h(
    'div',
    { class: 'who-log' },
    h('p', { class: 'muted' }, name === null ? t('whoYouKnow') : t('whoKnows', { name })),
    h('ul', {}, ...[...entries].reverse().map(entryLine)),
  )
}

let helpOpen = false

/** How a turn goes, for players learning the game. */
function whoHelp(): HTMLElement {
  const details = h(
    'details',
    { class: 'card-help words-help who-help', open: helpOpen },
    h('summary', {}, t('whoHelp')),
    h(
      'ul',
      {},
      h('li', {}, t('whoHelpAsk')),
      h('li', {}, t('whoHelpAnswer', { n: VOTE_SECONDS })),
      h('li', {}, t('whoHelpGuess')),
      h('li', {}, t('whoHelpEnd')),
    ),
  )
  details.addEventListener('toggle', () => {
    helpOpen = details.open
  })
  return details
}
