import type { GameId } from '../../core/board'
import { seatRange } from '../../core/games'
import { t } from '../../i18n'
import { h } from '../dom'
import { airHockeyGuide } from './airhockey'
import { dameGuide } from './dame'
import { echoGuide } from './echo'
import { fourInARowGuide } from './fourinarow'
import type { GameGuide } from './guide'
import { kaesekaestchenGuide } from './kaesekaestchen'
import { lichtrennerGuide } from './lichtrenner'
import { ludoGuide } from './ludo'
import { maexchenGuide } from './maexchen'
import { miauMiauGuide } from './miaumiau'
import { montagsmalerGuide } from './montagsmaler'
import { muehleGuide } from './muehle'
import { reactionGuide } from './reaction'
import { reversiGuide } from './reversi'
import { schwimmenGuide } from './schwimmen'
import { seeschlachtGuide } from './seeschlacht'
import { snakesGuide } from './snakes'
import { stadtLandFlussGuide } from './stadtlandfluss'
import { sternhalmaGuide } from './sternhalma'
import { ticTacToeGuide } from './tictactoe'
import { ultimateGuide } from './ultimate'
import { werbinichGuide } from './werbinich'
import { werwolfGuide } from './werwolf'

/**
 * Every game's thumbnail and rules. A new game adds its own file here, with the drawings of
 * `draw.ts`; the type check fails for a game without one.
 */
export const GUIDES: Record<GameId, GameGuide> = {
  tictactoe: ticTacToeGuide,
  ultimate: ultimateGuide,
  fourinarow: fourInARowGuide,
  muehle: muehleGuide,
  dame: dameGuide,
  kaesekaestchen: kaesekaestchenGuide,
  reversi: reversiGuide,
  sternhalma: sternhalmaGuide,
  miaumiau: miauMiauGuide,
  schwimmen: schwimmenGuide,
  seeschlacht: seeschlachtGuide,
  lichtrenner: lichtrennerGuide,
  airhockey: airHockeyGuide,
  snakes: snakesGuide,
  reaction: reactionGuide,
  echo: echoGuide,
  ludo: ludoGuide,
  maexchen: maexchenGuide,
  werwolf: werwolfGuide,
  stadtlandfluss: stadtLandFlussGuide,
  montagsmaler: montagsmalerGuide,
  werbinich: werbinichGuide,
}

/** The small picture of a game, for the game chooser. */
export function thumbnail(game: GameId): SVGSVGElement {
  const picture = GUIDES[game].thumbnail()
  picture.classList.add('thumbnail')
  return picture
}

/** How many play a game: "2 players", "2 to 6 players". */
export function playersText(game: GameId): string {
  const { min, max } = seatRange(game)
  return min === max ? t('playersExactly', { n: min }) : t('playersFromTo', { min, max })
}

/** The rules of a game, a step at a time with its drawing, in a dialog over the screen. */
export function showRules(game: GameId): HTMLElement {
  document.querySelector('.modal.rules')?.remove()
  const close = () => modal.remove()
  const steps = GUIDES[game].rules.map((step) =>
    h(
      'li',
      { class: step.picture ? 'rule' : 'rule plain' },
      step.picture ? step.picture() : null,
      h('p', {}, t(step.text)),
    ),
  )
  const modal = h(
    'div',
    { class: 'modal rules' },
    h(
      'div',
      {
        class: 'card',
        role: 'dialog',
        ariaLabel: t('rulesOf', { game: t(game) }),
      } as Partial<HTMLDivElement>,
      h('h2', {}, t('rulesOf', { game: t(game) })),
      h('p', { class: 'muted' }, playersText(game)),
      h('ol', { class: 'rule-steps' }, ...steps),
      h(
        'div',
        { class: 'buttons' },
        h('button', { type: 'button', class: 'primary', textContent: t('close'), onclick: close }),
      ),
    ),
  )
  // A tap beside the rules closes them too.
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close()
  })
  document.body.append(modal)
  return modal
}

/** A button that opens a game's rules: `short` for a small round one, as in the game chooser. */
export function rulesButton(game: GameId, short = false): HTMLButtonElement {
  return h('button', {
    type: 'button',
    class: short ? 'icon rules-button' : 'rules-button',
    textContent: short ? '?' : t('rules'),
    ariaLabel: t('rules'),
    title: t('rulesOf', { game: t(game) }),
    onclick: (event: MouseEvent) => {
      event.stopPropagation()
      showRules(game)
    },
  })
}

/** A game's name as the heading of its table, with the button for its rules beside it. */
export function gameTitle(game: GameId): HTMLElement {
  return h('div', { class: 'game-title' }, h('h2', {}, t(game)), rulesButton(game))
}
