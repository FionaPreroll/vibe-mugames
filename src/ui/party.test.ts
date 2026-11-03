// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { throwOf } from '../core/maexchen'
import { setLanguage } from '../i18n'
import { LocalTable } from '../local'
import { localScreen } from './local'

/**
 * Mäxchen and Werwolf on the screen, in happy-dom: one device handed over between the players,
 * and a split screen that hides each player's dice and role until they ask.
 */

const $ = <E extends Element = HTMLElement>(selector: string, root: ParentNode = document) => {
  const element = root.querySelector<E>(selector)
  if (!element) throw new Error(`no ${selector}`)
  return element
}
const $$ = <E extends Element = HTMLElement>(selector: string, root: ParentNode = document) => [
  ...root.querySelectorAll<E>(selector),
]
const button = (name: string | RegExp, root: ParentNode = document) => {
  const found = $$<HTMLButtonElement>('button', root).find((b) =>
    typeof name === 'string' ? b.textContent?.trim() === name : name.test(b.textContent ?? ''),
  )
  if (!found) throw new Error(`no button ${name}`)
  return found
}
const has = (name: string | RegExp, root: ParentNode = document) =>
  $$<HTMLButtonElement>('button', root).some((b) =>
    typeof name === 'string' ? b.textContent?.trim() === name : name.test(b.textContent ?? ''),
  )
const status = (root: ParentNode = document) => $('.status.turn', root).textContent
const hints = (root: ParentNode = document) => $$('.hint', root).map((hint) => hint.textContent)

/** Dice that fall as listed, a die at a time; roles that stay in seat order. */
function fixed(...numbers: number[]): () => number {
  let i = 0
  return () => numbers[i++ % numbers.length] as number
}
const die = (n: number) => (n - 1) / 6 + 0.01

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = '<div id="app"></div>'
  setLanguage('en')
})

describe('Mäxchen on one screen, taking turns', () => {
  it('hands the device over, and shows the dice to the roller alone', () => {
    const local = new LocalTable(['Ada', 'Bo', 'Cy'], fixed(die(5), die(3)))
    localScreen(local, false, () => {})
    button('Mäxchen').click()
    expect($('.notice').textContent).toContain('hand the device over')
    expect(status()).toBe('Pass the device to Ada. Only Ada looks now.')
    button('I am Ada: show my turn').click()
    expect(status()).toBe('Ada, your turn')
    expect(hints()).toEqual([expect.stringContaining('Roll the dice')])
    button('Roll').click()
    expect($('.cup.open').textContent).toContain('53')
    expect(hints()[0]).toContain('Your dice show 53')
    // Every throw is open to say: the true one is marked.
    const claims = $$<HTMLButtonElement>('.claims .claim')
    expect(claims).toHaveLength(21)
    expect(claims.every((claim) => !claim.disabled)).toBe(true)
    expect($('.claims .true').textContent).toBe('53')
    button('62').click()

    // Ada sees what she said, then hands over; Bo sees no dice.
    expect($('.said').textContent).toBe('Ada says: 62')
    button('Done: hand over to Bo').click()
    expect($$('.cup')).toHaveLength(0)
    button('I am Bo: show my turn').click()
    expect($('.cup').classList.contains('open')).toBe(false)
    expect(hints()[0]).toContain('in 16 of 36 throws')
    expect(has('Give up a life')).toBe(false)
    button('Doubt it: lift the cup').click()
    // A bluff: Ada loses a life and starts again, so the device goes back to her.
    expect(hints()[0]).toBe(
      'Bo doubted Ada’s 62: the cup held ⚄ ⚂, only 53. A bluff! Ada loses a life.',
    )
    expect($$('.lives .hearts').map((hearts) => hearts.textContent)).toEqual(['♥♥♡', '♥♥♥', '♥♥♥'])
    button('Done: hand over to Ada').click()
    button('I am Ada: show my turn').click()
    expect(status()).toBe('Ada, your turn')
  })

  it('offers only doubting or giving up against a Mäxchen, and says how the game ended', () => {
    const local = new LocalTable(['Ada', 'Bo'], fixed(die(2), die(1)))
    localScreen(local, false, () => {})
    button('Mäxchen').click()
    button(/^I am Ada/).click()
    for (let round = 0; round < 3; round++) {
      button('Roll').click()
      expect(throwOf(local.state(0).dice?.dice ?? [1, 1])).toBe(21)
      button('Mäxchen').click()
      button('Done: hand over to Bo').click()
      button(/^I am Bo/).click()
      expect(has('Believe it and roll')).toBe(false)
      expect(hints()[0]).toContain('nothing beats')
      button('Give up a life').click()
      if (round < 2) {
        expect(hints()[0]).toBe('Bo believed Ada’s Mäxchen. Bo loses a life.')
        // Bo lost, so Bo starts: the device stays with him, and he passes it back.
        button('Roll').click()
        button('31').click()
        button('Done: hand over to Ada').click()
        button(/^I am Ada/).click()
        // Bo's 31 is always true: Ada loses a life by doubting it, and starts the next round.
        button('Doubt it: lift the cup').click()
        expect(hints()[0]).toContain('That is enough. Ada loses a life.')
      }
    }
    expect(status()).toBe('Ada wins.')
    expect(has('Play again')).toBe(true)
  })
})

describe('Mäxchen on a split screen', () => {
  it('hides each player’s dice until they ask to see them', () => {
    const local = new LocalTable(['Ada', 'Bo'], fixed(die(6), die(4)))
    localScreen(local, true, () => {})
    button('Mäxchen').click()
    expect($('.notice').textContent).toContain('Show my dice')
    const [ada, bo] = $$('.pane')
    if (!ada || !bo) throw new Error('no panes')
    button('Roll', ada).click()
    const pane = () => $$('.pane')[0] as HTMLElement
    expect($$('.cup.open', pane())).toHaveLength(0)
    expect($$('.claims .true', pane())).toHaveLength(0)
    expect(hints(pane())[0]).toContain('Nobody has said anything yet')
    button('Show my dice', pane()).click()
    expect($('.cup.open', pane()).textContent).toContain('64')
    expect($('.claims .true', pane()).textContent).toBe('64')
    button('Hide my dice', pane()).click()
    expect($$('.cup.open', pane())).toHaveLength(0)
  })
})

describe('Werwolf on one screen, taking turns', () => {
  it('lets everyone choose at night in turn, each seeing only their own role', () => {
    // Every number high: the shuffle leaves the roles in seat order, wolf first.
    const local = new LocalTable(['Ada', 'Bo', 'Cy', 'Di', 'Ed'], () => 0.99)
    localScreen(local, false, () => {})
    button('Werewolf').click()
    expect($('.notice').textContent).toContain('everyone takes the device in turn')
    button('I am Ada: show my role').click()
    expect(status()).toBe('Night 1: whom do the werewolves take?')
    expect($('.role').textContent).toContain('Ada, you are a werewolf.')
    expect($$('.choices button').map((b) => b.textContent)).toEqual(['Bo', 'Cy', 'Di', 'Ed'])
    button('Di').click()
    expect($('.chosen').textContent).toBe('You chose Di.')
    button('Done: hand over to Bo').click()
    expect($$('.role')).toHaveLength(0)
    button('I am Bo: show my role').click()
    expect($('.role').textContent).toContain('Bo, you are a seer.')
    expect($('.role').textContent).not.toContain('you are a werewolf')
    button('Ada').click()
    // The seer learns at dawn.
    expect($('.role').textContent).not.toContain('You know')
    button('Done: hand over to Cy').click()
    button('I am Cy: show my role').click()
    expect(status()).toBe('Night 1: whom do you protect tonight?')
    button('Ed').click()
    button('Done: hand over to Di').click()
    button('I am Di: show my role').click()
    expect(status()).toBe('Night 1: whom do you suspect? It changes nothing, but everyone taps.')
    button('Ada').click()
    button('Done: hand over to Ed').click()
    button('I am Ed: show my role').click()
    button('Ada').click()

    // Morning: Ed sees the news, then the device goes round to vote.
    expect($('.news').textContent).toBe('Night 1: the werewolves took Di, a villager.')
    expect(status()).toContain('Day 1')
    button('Done: hand over to Ada').click()
    button('I am Ada: show my role').click()
    expect(status()).toBe('Day 1: talk it over, then vote whom to banish.')
    for (const [name, next] of [
      ['Ada', 'Bo'],
      ['Bo', 'Cy'],
      ['Cy', 'Ed'],
    ] as const) {
      button(name === 'Ada' ? 'Bo' : 'Ada').click()
      expect($('.chosen').textContent).toMatch(/^You voted for/)
      button(`Done: hand over to ${next}`).click()
      button(`I am ${next}: show my role`).click()
      if (next === 'Bo') expect($('.role').textContent).toContain('You know: Ada is a werewolf.')
    }
    button('Ada').click()
    expect(status()).toBe('The village wins: every werewolf is out.')
    expect($('.news').textContent).toContain('the village banished Ada, with 3 votes: a werewolf.')
    expect($('.news .votes').textContent).toBe('Ada → Bo, Bo → Ada, Cy → Ada, Ed → Ada')
    expect($$('.village li.won')).toHaveLength(4)
    expect($$('.players li').map((li) => $('.score', li).textContent)).toEqual([
      '0',
      '1',
      '1',
      '1',
      '1',
    ])
  })
})

describe('Werwolf on a split screen', () => {
  it('hides each role, and what it asks, until its player asks to see it', () => {
    const local = new LocalTable(['Ada', 'Bo', 'Cy', 'Di'], () => 0.99)
    localScreen(local, true, () => {})
    button('Werewolf').click()
    const pane = (i: number) => $$('.pane')[i] as HTMLElement
    expect(status(pane(0))).toBe('Night 1: show your role to choose.')
    expect($('.role', pane(0)).textContent).toContain('Your role is hidden.')
    expect($$('.choices', pane(0))).toHaveLength(0)
    button('Show my role', pane(0)).click()
    expect(status(pane(0))).toBe('Night 1: whom do the werewolves take?')
    button('Cy', pane(0)).click()
    button('Hide my role', pane(0)).click()
    expect($('.role', pane(0)).textContent).toContain('Your role is hidden.')
    for (const i of [1, 2, 3]) {
      button('Show my role', pane(i)).click()
      const choice = $$<HTMLButtonElement>('.choices button', pane(i))[0]
      choice?.click()
      button('Hide my role', pane(i)).click()
    }
    // By day, votes show without the role.
    expect(status(pane(1))).toBe('Day 1: talk it over, then vote whom to banish.')
    expect($$('.choices button', pane(1)).length).toBeGreaterThan(0)
    expect($('.role', pane(1)).textContent).toContain('Your role is hidden.')
  })
})
