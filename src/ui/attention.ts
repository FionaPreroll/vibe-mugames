import { t } from '../i18n'
import { isApp, vibrate } from '../native'
import { settings } from '../storage'
import { h } from './dom'

/**
 * Small things that keep players at the table: a buzz when it is their turn, and the whole
 * screen for the game on a tablet or a laptop.
 */

/** The buzz for a player's turn: two short pulses. */
const TURN_BUZZ = [70, 60, 70]

/**
 * Buzzes when it becomes the player's turn, if they did not switch it off. The screen says
 * whose turn it is in its status line, which is marked `mine` on the player's own turn, in
 * every game; games in real time have no turns, and never buzz.
 */
export class TurnBuzz {
  private mine = false

  /** Looks at the screen as just drawn. */
  update(screen: ParentNode): void {
    const mine = screen.querySelector('.status.mine') !== null
    if (mine && !this.mine && settings().vibrate) vibrate(TURN_BUZZ)
    this.mine = mine
  }
}

/** Whether this page can take the whole screen: not in the app, which has it already. */
function canFill(): boolean {
  return !isApp() && document.fullscreenEnabled === true
}

/** Says on every full-screen button whether it enters or leaves the full screen. */
function label(button: HTMLButtonElement): void {
  const full = Boolean(document.fullscreenElement)
  button.ariaLabel = t(full ? 'leaveFullscreen' : 'fullscreen')
  button.title = button.ariaLabel
  button.ariaPressed = String(full)
}

let listening = false

/**
 * A button that gives the game the whole screen, and back, on a tablet or a laptop; null where
 * the browser cannot, as on iPhones, and in the app.
 */
export function fullscreenButton(): HTMLButtonElement | null {
  if (!canFill()) return null
  if (!listening) {
    listening = true
    document.addEventListener('fullscreenchange', () => {
      for (const button of document.querySelectorAll<HTMLButtonElement>('.fullscreen-button')) {
        label(button)
      }
    })
  }
  const button = h('button', {
    type: 'button',
    class: 'icon fullscreen-button',
    textContent: '⛶',
    onclick: () => {
      const done = document.fullscreenElement
        ? document.exitFullscreen()
        : document.documentElement.requestFullscreen()
      void done.catch(() => {})
    },
  })
  label(button)
  return button
}
