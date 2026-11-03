// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { LAST, type LudoState, OUT, start } from '../core/ludo'
import { setLanguage } from '../i18n'
import { LocalTable } from '../local'
import { Picker } from './boards'
import { localScreen } from './local'
import { ludoHints, ludoView, pieceSpot } from './ludo'

/** Ludo's board, die and hints, in happy-dom; and Ludo on one device. */

const $ = <E extends Element = HTMLElement>(selector: string, root: ParentNode = document) => {
  const element = root.querySelector<E>(selector)
  if (!element) throw new Error(`no ${selector}`)
  return element
}
const $$ = <E extends Element = HTMLElement>(selector: string, root: ParentNode = document) => [
  ...root.querySelectorAll<E>(selector),
]

/** Dice that roll the given numbers, in order, over and over. */
function dice(...rolls: number[]): () => number {
  let i = 0
  return () => ((rolls[i++ % rolls.length] ?? 1) - 0.5) / 6
}

const names = ['Ada', 'Bo', 'Cy']

/** Three players, Ada to move after rolling `die`, with her pieces on these steps. */
function rolled(die: number, own: number[]): LudoState {
  const game = start(3)
  return {
    ...game,
    pieces: [own, ...game.pieces.slice(1)],
    phase: 'move',
    die,
    rolledBy: 0,
    tries: 1,
  }
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>'
  setLanguage('en')
})

describe('Ludo’s board', () => {
  it('lays out 40 squares, the corners and the homes, with every piece on its own spot', () => {
    const view = ludoView(start(4), {
      seat: 0,
      names: [...names, 'Di'],
      picker: new Picker(),
      picked: [],
      onMove: null,
    })
    expect($$('.cell.track', view)).toHaveLength(40)
    expect($$('.cell.start', view)).toHaveLength(4)
    expect($$('.cell.yard', view)).toHaveLength(16)
    expect($$('.cell.home', view)).toHaveLength(16)
    expect($$('.token', view)).toHaveLength(16)
    const spots = new Set($$('.cell', view).map((c) => `${c.style.gridColumn}/${c.style.gridRow}`))
    expect(spots.size).toBe(72)
    // Nothing to tap without a move to make.
    expect($$<HTMLButtonElement>('.cell', view).every((c) => c.disabled)).toBe(true)
    expect($<HTMLButtonElement>('.die', view).disabled).toBe(true)
  })

  it('turns each player’s corner to the bottom left', () => {
    for (const seat of [0, 1, 2]) {
      const view = ludoView(start(3), {
        seat,
        names,
        picker: new Picker(),
        picked: [],
        onMove: null,
      })
      const corner = $$('.cell.yard', view).filter((c) =>
        c.ariaLabel?.startsWith(`${names[seat]}’s corner`),
      )
      expect(corner.map((c) => [c.style.gridColumn, c.style.gridRow]).sort()).toEqual([
        ['1', '10'],
        ['1', '11'],
        ['2', '10'],
        ['2', '11'],
      ])
    }
    expect(pieceSpot(start(2), 1, 0, 0)).toEqual([10, 6])
  })

  it('picks a piece that may move, shows where it goes, and moves it there', () => {
    const picker = new Picker()
    const moves: unknown[] = []
    const game = rolled(6, [OUT, 5, OUT, OUT])
    const draw = () =>
      ludoView(game, {
        seat: 0,
        names,
        picker,
        picked: picker.path,
        onMove: (move) => moves.push(move),
      })
    let view = draw()
    // A six: any piece in the corner may come out, and the one on the track may move on.
    expect($$('.cell.can', view)).toHaveLength(4)
    $<HTMLButtonElement>('.cell.can.track', view).click()
    view = draw()
    expect($$('.cell.picked', view)).toHaveLength(1)
    expect($$('.cell.target', view)).toHaveLength(1)
    $<HTMLButtonElement>('.cell.target', view).click()
    expect(moves).toEqual([{ kind: 'piece', piece: 1 }])
    expect(picker.path).toEqual([])
  })

  it('rolls with the die on the player’s turn', () => {
    const moves: unknown[] = []
    const view = ludoView(start(2), {
      seat: 0,
      names,
      picker: new Picker(),
      picked: [],
      onMove: (move) => moves.push(move),
    })
    $<HTMLButtonElement>('.die', view).click()
    expect(moves).toEqual([{ kind: 'roll' }])
  })
})

describe('Ludo’s hints', () => {
  it('tells the player to move what to do', () => {
    expect(ludoHints(start(3), 0, names, false, false)).toEqual([
      'Roll a six to bring a piece out: you have three tries.',
    ])
    expect(ludoHints(rolled(6, [OUT, OUT, OUT, OUT]), 0, names, false, false)).toEqual([
      'A six! Bring a piece out, or move one on. Then you roll again.',
    ])
    expect(ludoHints(rolled(3, [5, OUT, OUT, OUT]), 0, names, false, false)).toEqual([
      'You rolled a 3: tap a piece to see where it goes.',
    ])
    expect(ludoHints(rolled(3, [5, OUT, OUT, OUT]), 0, names, false, true)).toEqual([
      'Tap the marked square to move there, or pick another piece.',
    ])
    const tried = { ...start(3), die: 2, rolledBy: 0, tries: 2, stuck: true }
    expect(ludoHints(tried, 0, names, false, false)).toEqual([
      'You rolled a 2: no piece could move.',
      'No six. Roll again: one try left.',
    ])
    const six = { ...start(3), pieces: [[7, OUT, OUT, OUT], [], []], die: 6, rolledBy: 0 }
    expect(ludoHints(six, 0, names, false, false)).toEqual(['A six: roll again.'])
  })

  it('tells everyone else what was rolled, and whose piece was sent back', () => {
    expect(ludoHints(rolled(4, [5, OUT, OUT, OUT]), 1, names, false, false)).toEqual([
      'Ada rolled a 4.',
    ])
    const passed = { ...start(3), turn: 1, die: 5, rolledBy: 0, stuck: true }
    expect(ludoHints(passed, 2, names, false, false)).toEqual([
      'Ada rolled a 5: no piece could move.',
    ])
    const hit = {
      ...start(3),
      turn: 1,
      die: 3,
      rolledBy: 0,
      moved: { seat: 0, piece: 0, from: 2, to: 5, hit: 2 },
    }
    expect(ludoHints(hit, 2, names, false, false)[0]).toBe(
      'Ada sent your piece back to its corner.',
    )
    expect(ludoHints(hit, 0, names, false, false)[0]).toBe(
      'You sent Cy’s piece back to its corner.',
    )
    expect(ludoHints(hit, 1, names, true, false)[0]).toBe('Ada sent Cy’s piece back to its corner.')
    const won = { ...start(3), pieces: [[LAST, LAST - 1, LAST - 2, LAST - 3], [], []], winner: 0 }
    expect(ludoHints(won, 1, names, false, false)).toEqual([])
  })
})

describe('Ludo on one device', () => {
  it('takes turns on one screen: rolls, moves a piece, and names the next player', () => {
    const local = new LocalTable(['Ada', 'Bo'], dice(6, 2, 1))
    localScreen(local, false, () => {})
    $$<HTMLButtonElement>('.game-choice')
      .find((b) => b.textContent === 'Ludo')
      ?.click()
    expect($('.status.turn').textContent).toBe('Ada, your turn')
    // Nothing is hidden in Ludo: no notice.
    expect($$('.notice')).toHaveLength(0)
    $<HTMLButtonElement>('.die.can').click()
    expect($$('.hint')[0]?.textContent).toContain('A six!')
    $<HTMLButtonElement>('.cell.can').click()
    $<HTMLButtonElement>('.cell.target').click()
    expect(local.state(-1).ludo?.pieces[0]).toContain(0)
    $<HTMLButtonElement>('.die.can').click()
    $<HTMLButtonElement>('.cell.can').click()
    $<HTMLButtonElement>('.cell.target').click()
    expect($('.status.turn').textContent).toBe('Bo, your turn')
  })

  it('shows each player their own board on a split screen, with only theirs to roll', () => {
    const local = new LocalTable(['Ada', 'Bo', 'Cy'], dice(3))
    localScreen(local, true, () => {})
    $$<HTMLButtonElement>('.game-choice')
      .find((b) => b.textContent === 'Ludo')
      ?.click()
    const panes = $$('.pane')
    expect(panes).toHaveLength(3)
    expect(panes.map((pane) => $$('.die.can', pane).length)).toEqual([1, 0, 0])
    $<HTMLButtonElement>('.die.can', panes[0]).click()
    // A three, with no piece out: Ada rolls again.
    expect($$('.pane')[1]?.textContent).toContain('Ada rolled a 3: no piece could move.')
  })
})
