import type { TextKey } from '../../i18n'

/**
 * What the Spielekiste shows of a game before and while it is played: a thumbnail of its board
 * for the game chooser, and its rules, a step at a time, most with a drawing. Every game has one
 * in `GUIDES` (`index.ts`), one file a game.
 */
export interface GameGuide {
  /** A small picture of the game, such as its board in the middle of a game. */
  readonly thumbnail: () => SVGSVGElement
  /** The rules, in the order they are read. */
  readonly rules: readonly RuleStep[]
}

export interface RuleStep {
  /** The rule, in a few sentences, in `src/i18n.ts`. */
  readonly text: TextKey
  /** A drawing of what the rule says, made when the rules are opened. */
  readonly picture?: () => SVGSVGElement
}
