// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GAME_IDS } from '../core/board'
import { setLanguage } from '../i18n'
import { LocalTable } from '../local'
import { settings, updateSettings } from '../storage'
import { handleBack } from './dom'
import { localScreen, localSetup } from './local'

/**
 * Playing on one device, in happy-dom: choosing the players and how they play, taking turns on
 * one screen, and a split screen with a part for each player.
 */

const $ = <E extends Element = HTMLElement>(selector: string, root: ParentNode = document) => {
  const element = root.querySelector<E>(selector)
  if (!element) throw new Error(`no ${selector}`)
  return element
}
const $$ = <E extends Element = HTMLElement>(selector: string, root: ParentNode = document) => [
  ...root.querySelectorAll<E>(selector),
]
const button = (name: string, root: ParentNode = document) => {
  const found = $$<HTMLButtonElement>('button', root).find(
    (b) =>
      b.textContent?.trim() === name ||
      b.firstElementChild?.textContent === name ||
      b.ariaLabel === name,
  )
  if (!found) throw new Error(`no button ${name}`)
  return found
}
const status = (root: ParentNode = document) => $('.status.turn', root).textContent
const cell = (index: number, root: ParentNode = document) =>
  $<HTMLButtonElement>(`.board [data-cell="${index}"]`, root)

/** A shuffle that is the same every run. */
function seeded(seed = 11): () => number {
  let state = seed
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2 ** 31
    return state / 2 ** 31
  }
}

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = '<div id="app"></div>'
  setLanguage('en')
})

describe('choosing who plays on this device', () => {
  it('starts with two players, the first named as on the start screen', () => {
    updateSettings({ name: 'Ada' })
    localSetup(() => {})
    const names = $$<HTMLInputElement>('.names input')
    expect(names.map((input) => input.value)).toEqual(['Ada', ''])
    expect(names.map((input) => input.placeholder)).toEqual(['Player 1', 'Player 2'])
    expect(button('2').ariaPressed).toBe('true')
  })

  it('offers a split screen for up to four players only', () => {
    localSetup(() => {})
    const [turns, split] = $$<HTMLInputElement>('input[type="radio"]')
    expect(turns?.checked).toBe(true)
    split?.click()
    expect(split?.checked).toBe(true)
    button('4').click()
    expect($$('.names input')).toHaveLength(4)
    expect(split?.checked).toBe(true)
    button('5').click()
    expect($$('.names input')).toHaveLength(5)
    expect(split?.disabled).toBe(true)
    expect(turns?.checked).toBe(true)
  })

  it('remembers the players and the way they played, and fills in names left empty', () => {
    localSetup(() => {})
    button('3').click()
    const names = $$<HTMLInputElement>('.names input')
    for (const [i, name] of ['  Ada ', '', 'Cy'].entries()) {
      const input = names[i]
      if (!input) continue
      input.value = name
      input.dispatchEvent(new Event('input'))
    }
    $$<HTMLInputElement>('input[type="radio"]')[1]?.click()
    button('Start').click()
    expect(settings()).toMatchObject({ localNames: ['Ada', '', 'Cy'], localSplit: true })
    expect($$('.players li').map((li) => $('.name', li).textContent)).toEqual([
      'Ada',
      'Player 2',
      'Cy',
    ])

    // Next time, the same three, on a split screen.
    localSetup(() => {})
    expect($$<HTMLInputElement>('.names input').map((input) => input.value)).toEqual([
      'Ada',
      '',
      'Cy',
    ])
    expect($$<HTMLInputElement>('input[type="radio"]')[1]?.checked).toBe(true)
  })

  it('goes back, by its own button and by Android’s', () => {
    const back = vi.fn()
    localSetup(back)
    button('Back').click()
    expect(back).toHaveBeenCalledTimes(1)
    handleBack(() => {})
    expect(back).toHaveBeenCalledTimes(2)
  })
})

describe('the game chooser', () => {
  it('shows the games chosen lately on top, newest first', () => {
    localScreen(new LocalTable(['Ada', 'Bo']), false, () => {})
    expect($$('.game-group.recent')).toHaveLength(0)
    for (const game of ['Tic Tac Toe', 'Reversi']) {
      button(game).click()
      localScreen(new LocalTable(['Ada', 'Bo']), false, () => {})
    }
    const recent = $('.game-group.recent')
    expect(recent.ariaLabel).toBe('Played lately')
    expect($$('.game-choice', recent).map((choice) => choice.textContent)).toEqual([
      'Reversi',
      'Tic Tac Toe',
    ])
    expect(settings().recentGames).toEqual(['reversi', 'tictactoe'])
  })

  it('groups the games by kind, each with how many play it', () => {
    localScreen(new LocalTable(['Ada', 'Bo']), false, () => {})
    const groups = $$('.game-group')
    expect(groups.map((group) => group.ariaLabel)).toEqual([
      'Tactics',
      'Luck and bluff',
      'Party games',
      'Skill',
    ])
    const skill = groups[3] ?? document
    expect($$('.game-choice', skill).map((choice) => choice.textContent)).toEqual([
      'Light Racers',
      'Air Hockey',
    ])
    expect($$('.game-card')).toHaveLength(GAME_IDS.length)
    const werewolf = $$('.game-card').find((card) => card.ariaLabel === 'Werewolf') ?? document
    expect($('.seats-badge', werewolf).textContent).toBe('4–8')
    expect($('.seats-badge', werewolf).title).toBe('4 to 8 players')
    // Two at the table are too few for it.
    expect($<HTMLButtonElement>('.game-choice', werewolf).disabled).toBe(true)
  })

  it('puts the board on a stage of its own, beside whose turn it is', () => {
    localScreen(new LocalTable(['Ada', 'Bo']), false, () => {})
    expect($$('.screen.in-game')).toHaveLength(0)
    button('Nine Men’s Morris').click()
    expect($$('.screen.in-game')).toHaveLength(1)
    expect($$('.main > .stage > .board.muehle')).toHaveLength(1)
    expect($$('.main > .status, .main > .hand')).toHaveLength(2)
  })
})

describe('taking turns on one screen', () => {
  it('names whose turn it is, and plays Tic Tac Toe to a win and again', () => {
    localScreen(new LocalTable(['Ada', 'Bo']), false, () => {})
    expect(status()).toBe('Choose a game')
    button('Tic Tac Toe').click()
    expect($('h2').textContent).toBe('Tic Tac Toe')
    expect($$('.notice')).toHaveLength(0)
    expect(status()).toBe('Ada, your turn')
    for (const [index, next] of [
      [0, 'Bo, your turn'],
      [3, 'Ada, your turn'],
      [1, 'Bo, your turn'],
      [4, 'Ada, your turn'],
    ] as const) {
      cell(index).click()
      expect(status()).toBe(next)
    }
    // A cell taken cannot be taken again.
    expect(cell(0).disabled).toBe(true)
    cell(2).click()
    expect(status()).toBe('Ada wins.')
    expect($$('.board .cell.win')).toHaveLength(3)
    expect($('.players li .score').textContent).toBe('1')

    button('Play again').click()
    expect(status()).toBe('Bo, your turn')
    // While the game is on, nobody can end it for another.
    expect(() => button('Other game')).toThrow()
  })

  it('goes back to the lobby once a game is over', () => {
    localScreen(new LocalTable(['Ada', 'Bo']), false, () => {})
    button('Tic Tac Toe').click()
    for (const index of [0, 3, 1, 4, 2]) cell(index).click()
    button('Other game').click()
    expect(status()).toBe('Choose a game')
    expect($$('.players li .score').map((score) => score.textContent)).toEqual(['1', '0'])
  })

  it('keeps the board of Draughts the same way round for both players', () => {
    localScreen(new LocalTable(['Ada', 'Bo']), false, () => {})
    button('Draughts').click()
    const first = () => $('.board [data-cell]').dataset.cell
    expect(first()).toBe('1')
    cell(42).click()
    cell(35).click()
    expect(status()).toBe('Bo, your turn')
    expect(first()).toBe('1')
  })

  it('names who takes a piece after a mill in Mühle', () => {
    localScreen(new LocalTable(['Ada', 'Bo']), false, () => {})
    button('Nine Men’s Morris').click()
    for (const point of [0, 8, 1, 9, 2]) cell(point).click()
    expect(status()).toBe('A mill! Ada takes one of Bo’s pieces.')
  })

  it('plays Miau-Miau with open cards: the hand of whoever’s turn it is, and a notice', () => {
    const local = new LocalTable(['Ada', 'Bo', 'Cy'], seeded())
    localScreen(local, false, () => {})
    // The lobby says so before the game, too.
    expect(button('Miau-Miau').textContent).toContain('open cards')
    button('Miau-Miau').click()
    expect($('.notice').textContent).toContain('everyone can see every hand')
    const first = local.state(-1)
    const turn = first.cards?.turn ?? 0
    const mover = first.seats[turn] ?? 0
    const name = first.players[mover]?.name
    expect(status()).toBe(`${name}, your turn`)
    const hand = () => $$('.cards .hand .card').map((card) => card.ariaLabel)
    expect(hand()).toHaveLength(local.state(mover).cards?.hand.length ?? -1)
    // The others' hands lie face down: two of them.
    expect($$('.opponent')).toHaveLength(2)

    // Drawing passes the turn on, unless the card drawn fits: then keep it.
    $<HTMLButtonElement>('.stock').click()
    const keep = $$<HTMLButtonElement>('.cards .buttons button')[0]
    if (keep) keep.click()
    const next = local.state(-1)
    const nextMover = next.seats[next.cards?.turn ?? 0] ?? 0
    expect(nextMover).not.toBe(mover)
    expect(status()).toBe(`${next.players[nextMover]?.name}, your turn`)
    expect(hand()).toHaveLength(local.state(nextMover).cards?.hand.length ?? -1)
  })

  it('leaves for the setup with ×; Android’s back button does not end the game', () => {
    const left = vi.fn()
    localScreen(new LocalTable(['Ada', 'Bo']), false, left)
    button('Tic Tac Toe').click()
    handleBack(() => {})
    expect(left).not.toHaveBeenCalled()
    expect(status()).toBe('Ada, your turn')
    button('Stop playing').click()
    expect(left).toHaveBeenCalledTimes(1)
  })
})

describe('a split screen', () => {
  it('gives each player a part, in which only they move', () => {
    localScreen(new LocalTable(['Ada', 'Bo']), true, () => {})
    // The lobby is one for all.
    expect($$('.pane')).toHaveLength(0)
    button('Four in a Row').click()
    const [ada, bo] = $$('.pane')
    if (!ada || !bo) throw new Error('no panes')
    expect($$('.pane')).toHaveLength(2)
    expect($('.screen').classList.contains('playing')).toBe(true)
    expect(status(ada)).toBe('Your turn')
    expect(status(bo)).toBe('Ada’s turn')
    expect(ada.classList.contains('to-move')).toBe(true)
    expect(cell(3, bo).disabled).toBe(true)

    cell(3, ada).click()
    const [ada2, bo2] = $$('.pane')
    if (!ada2 || !bo2) throw new Error('no panes')
    expect(cell(5 * 7 + 3, bo2).classList.contains('seat-0')).toBe(true)
    expect(status(bo2)).toBe('Your turn')
    expect(cell(3, ada2).disabled).toBe(true)
    expect(bo2.classList.contains('to-move')).toBe(true)
  })

  it('turns a player’s part round to face them, and keeps it turned', () => {
    localScreen(new LocalTable(['Ada', 'Bo']), true, () => {})
    button('Tic Tac Toe').click()
    button('Turn Ada’s side around').click()
    expect($$('.pane').map((pane) => pane.classList.contains('turned'))).toEqual([true, false])
    cell(4, $('.pane')).click()
    expect($$('.pane').map((pane) => pane.classList.contains('turned'))).toEqual([true, false])
    button('Turn Ada’s side around').click()
    expect($('.pane').classList.contains('turned')).toBe(false)
  })

  it('shows Draughts in each part with that player’s pieces at the bottom', () => {
    localScreen(new LocalTable(['Ada', 'Bo']), true, () => {})
    button('Draughts').click()
    const [ada, bo] = $$('.pane')
    if (!ada || !bo) throw new Error('no panes')
    expect($('.board [data-cell]', ada).dataset.cell).toBe('1')
    expect($('.board [data-cell]', bo).dataset.cell).toBe('62')
  })

  it('lets those not at the board watch, and plays on to a win and a rematch', () => {
    localScreen(new LocalTable(['Ada', 'Bo', 'Cy']), true, () => {})
    button('Tic Tac Toe').click()
    const pane = (i: number) => $$('.pane')[i] ?? document
    expect(status(pane(2))).toBe('You are watching: Ada against Bo.')
    for (const [who, index] of [
      [0, 0],
      [1, 3],
      [0, 1],
      [1, 4],
      [0, 2],
    ] as const) {
      cell(index, pane(who)).click()
    }
    expect(status(pane(0))).toBe('You win!')
    expect(status(pane(1))).toBe('Ada wins.')
    expect($('.pane-head .score', pane(0)).textContent).toBe('1')
    // The winner stays, Cy comes in.
    button('Play again').click()
    expect(status(pane(2))).toBe('Ada’s turn')
    expect(status(pane(1))).toBe('You are watching: Ada against Cy.')
  })

  it('plays Miau-Miau with four, each part with its own cards, and says the cards are open', () => {
    const local = new LocalTable(['Ada', 'Bo', 'Cy', 'Di'], seeded(5))
    localScreen(local, true, () => {})
    button('Miau-Miau').click()
    expect($$('.split-bar .notice')).toHaveLength(1)
    const panes = $$('.pane')
    expect(panes).toHaveLength(4)
    for (const [id, pane] of panes.entries()) {
      const hand = local.state(id).cards?.hand ?? []
      expect($$('.hand .card', pane)).toHaveLength(hand.length)
      expect($$('.opponent', pane)).toHaveLength(3)
    }
    // Only the player to move can draw.
    const mover = local.state(-1).cards?.turn ?? 0
    expect(panes.map((pane) => !$<HTMLButtonElement>('.stock', pane).disabled)).toEqual(
      panes.map((_, i) => i === mover),
    )
    $<HTMLButtonElement>('.stock', panes[mover]).click()
    expect(local.state(-1).moveNo).toBe(1)
  })
})
