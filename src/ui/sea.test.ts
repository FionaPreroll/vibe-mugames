// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shipCells } from '../core/seeschlacht'
import { setLanguage, t } from '../i18n'
import { LocalTable } from '../local'
import { localScreen } from './local'
import { squareName } from './sea'

/**
 * Sea Battle on the screen, in happy-dom: placing a fleet, shooting, handing one device over
 * between the players, and a split screen that hides each fleet.
 */

// Fleets shuffled the same way every run.
vi.mock('../random', () => {
  let state = 7
  return {
    random: () => {
      state = (state * 1_103_515_245 + 12_345) % 2 ** 31
      return state / 2 ** 31
    },
  }
})

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
const status = (root: ParentNode = document) => $('.status.turn', root).textContent
const hints = (root: ParentNode = document) => $$('.hint', root).map((hint) => hint.textContent)
const square = (grid: string, cell: number, root: ParentNode = document) =>
  $<HTMLButtonElement>(`.sea.${grid} [data-cell="${cell}"]`, root)
const cellsWith = (grid: string, mark: string, root: ParentNode = document) =>
  $$(`.sea.${grid} .${mark}`, root).map((b) => Number(b.dataset.cell))

/** The squares of a seat's ships, as the table knows them. */
const shipsOf = (local: LocalTable, id: number) => {
  const seat = local.state(id).seats.indexOf(id)
  return (local.state(id).sea?.fleets[seat] ?? []).flatMap((ship) => shipCells(ship) ?? [])
}

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = '<div id="app"></div>'
  setLanguage('en')
})

describe('Sea Battle on one screen, taking turns', () => {
  it('hands the device over, and lets each player place their own fleet', () => {
    const local = new LocalTable(['Ada', 'Bo'])
    localScreen(local, false, () => {})
    // Played hidden, not with open cards.
    expect(button('Sea Battle').textContent).not.toContain('open cards')
    button('Sea Battle').click()
    expect($('.notice').textContent).toContain('hand the device over')
    // Nothing of anyone's sea shows until Ada says she holds the device.
    expect(status()).toBe('Pass the device to Ada. Only Ada looks now.')
    expect($$('.sea')).toHaveLength(0)
    button('I am Ada: show my sea').click()
    expect(status()).toBe('Ada, place your fleet')
    expect(hints()[0]).toContain('Ships may not touch')
    const ships = cellsWith('placing', 'ship')
    expect(ships).toHaveLength(17)
    expect(button('Turn the ship').disabled).toBe(true)

    // A tap picks a ship; a tap on a square next to another ship does not move it there.
    const first = ships[0] as number
    square('placing', first).click()
    const picked = cellsWith('placing', 'picked')
    expect(picked).toContain(first)
    expect(square('placing', first).ariaLabel).toBe(`${squareName(first)}: ship: picked`)
    const others = ships.filter((cell) => !picked.includes(cell))
    const beside = others
      .flatMap((cell) => [cell - 10, cell + 10])
      .find((cell) => cell >= 0 && cell < 100 && !ships.includes(cell))
    if (beside === undefined) throw new Error('no square beside a ship')
    square('placing', beside).click()
    expect($('.misfit').textContent).toContain('It does not fit there')
    expect(cellsWith('placing', 'picked')).toEqual(picked)

    // It goes to the first free square where it fits, across or down.
    for (let cell = 0; cell < 100; cell++) {
      if (cellsWith('placing', 'ship').includes(cell)) continue
      square('placing', cell).click()
      if ($$('.misfit').length === 0) break
    }
    expect(cellsWith('placing', 'picked')).not.toEqual(picked)
    expect(cellsWith('placing', 'ship')).toHaveLength(17)
    // Turning it, by the button or by tapping it again, keeps the fleet whole.
    button('Turn the ship').click()
    square('placing', cellsWith('placing', 'picked')[0] as number).click()
    expect(cellsWith('placing', 'ship')).toHaveLength(17)
    button('Shuffle').click()
    expect(cellsWith('placing', 'picked')).toEqual([])
    const placed = cellsWith('placing', 'ship')
    button('Ready').click()
    expect(shipsOf(local, 0).sort((a, b) => a - b)).toEqual(placed)

    // Ada sees her fleet once more, then gives the device to Bo, who sees nothing of it.
    expect(status()).toBe('Waiting for Bo to place their fleet.')
    expect(cellsWith('own', 'ship')).toEqual(placed)
    button('Done: hand over to Bo').click()
    expect($$('.sea')).toHaveLength(0)
    button('I am Bo: show my sea').click()
    expect(status()).toBe('Bo, place your fleet')
    button('Ready').click()
    button('Done: hand over to Ada').click()
    button('I am Ada: show my sea').click()
    expect(status()).toBe('Ada, your turn')
    expect(hints()).toEqual(['Tap a square of Bo’s sea to shoot. A hit lets you shoot again.'])
    expect(cellsWith('target', 'ship')).toEqual([])
    expect(cellsWith('own', 'ship')).toEqual(placed)
  })

  it('shoots on after a hit, hands over after a miss, and plays to the end and again', () => {
    const local = new LocalTable(['Ada', 'Bo'])
    localScreen(local, false, () => {})
    button('Sea Battle').click()
    for (const [name, next] of [
      ['Ada', 'Bo'],
      ['Bo', 'Ada'],
    ]) {
      button(`I am ${name}: show my sea`).click()
      button('Ready').click()
      button(`Done: hand over to ${next}`).click()
    }
    button('I am Ada: show my sea').click()
    const bo = shipsOf(local, 1)
    const ada = shipsOf(local, 0)
    const water = (ships: number[]) =>
      Array.from({ length: 100 }, (_, cell) => cell).find((cell) => !ships.includes(cell)) ?? 0

    // A hit: Ada shoots again, without handing over.
    square('target', bo[0] as number).click()
    expect(hints()[0]).toBe('Hit! Shoot again.')
    expect(square('target', bo[0] as number).classList.contains('hit')).toBe(true)
    expect(square('target', bo[0] as number).disabled).toBe(true)
    // A miss: Ada sees it, then hands over; Bo hears what she did.
    square('target', water(bo)).click()
    expect(hints()[0]).toBe('Water. Now Bo shoots.')
    expect(square('target', bo[1] as number).disabled).toBe(true)
    button('Done: hand over to Bo').click()
    button('I am Bo: show my sea').click()
    expect(hints()[0]).toBe('Ada hit water.')
    expect(cellsWith('own', 'hit')).toEqual([bo[0]])

    // Bo sinks Ada's whole fleet, ship by ship, and learns where the water is.
    for (const cell of ada) {
      if ($$('.handover').length > 0) break
      square('target', cell).click()
    }
    expect(status()).toBe('Bo wins.')
    expect(hints()).toEqual([])
    expect(cellsWith('target', 'sunk')).toHaveLength(17)
    expect(cellsWith('target', 'water').length).toBeGreaterThan(0)
    // At the end, every fleet shows.
    expect(cellsWith('own', 'ship').sort((a, b) => a - b)).toEqual([...bo].sort((a, b) => a - b))
    expect($('.players li:last-child .score').textContent).toBe('1')

    // A new game hands the device over first again.
    button('Play again').click()
    expect(status()).toBe('Pass the device to Bo. Only Bo looks now.')
  })

  it('tells what sank, and that the water around it is known', () => {
    const local = new LocalTable(['Ada', 'Bo'])
    localScreen(local, false, () => {})
    button('Sea Battle').click()
    const rows = [5, 4, 3, 3, 2].map((size, i) => ({ cell: i * 20, down: false, size }))
    const fleet = rows.map((ship) => ship.cell)
    local.move(0, 'seeschlacht', 0, fleet)
    local.move(1, 'seeschlacht', 1, fleet)
    button('I am Ada: show my sea').click()
    // Bo's ship of two lies in row 9 (cells 80 and 81), from the left.
    square('target', 80).click()
    square('target', 81).click()
    expect(hints()[0]).toBe(
      'Sunk: a ship of 2! The squares around it are water, as ships never touch. Shoot again.',
    )
    expect(cellsWith('target', 'water')).toEqual([70, 71, 72, 82, 90, 91, 92])
    expect(square('target', 82).disabled).toBe(true)
    expect($('.target .fleet-ship.sunk').ariaLabel).toBe('ship of 2: sunk')
    square('target', 0).click()
    square('target', 99).click()
    button('Done: hand over to Bo').click()
    button('I am Bo: show my sea').click()
    expect(hints()[0]).toBe('Ada hit water.')
    square('target', 0).click()
    expect(hints()[0]).toBe('Hit! Shoot again.')
    square('target', 99).click()
    button('Done: hand over to Ada').click()
    button('I am Ada: show my sea').click()
    expect(hints()[0]).toBe('Bo hit water.')
  })
})

describe('Sea Battle on a split screen', () => {
  it('hides each fleet until its player asks, and lets each part place and shoot', () => {
    const local = new LocalTable(['Ada', 'Bo', 'Cy'])
    localScreen(local, true, () => {})
    button('Sea Battle').click()
    expect($('.split-bar .notice').textContent).toContain('Show my fleet')
    const pane = (i: number) => $$('.pane')[i] ?? document
    // Placing with the fleet hidden: shuffle and ready, but nothing shows, nothing to pick.
    expect(status(pane(0))).toBe('Place your fleet')
    expect(cellsWith('placing', 'ship', pane(0))).toEqual([])
    expect($$('button', pane(0)).some((b) => b.textContent === 'Turn the ship')).toBe(false)
    expect(status(pane(2))).toBe('The fleets are being placed.')
    button('Show my fleet', pane(0)).click()
    expect(cellsWith('placing', 'ship', pane(0))).toHaveLength(17)
    expect(cellsWith('placing', 'ship', pane(1))).toEqual([])
    button('Hide my fleet', pane(0)).click()
    button('Shuffle', pane(0)).click()
    button('Ready', pane(0)).click()
    expect(status(pane(0))).toBe('Waiting for Bo to place their fleet.')
    expect(cellsWith('own', 'ship', pane(0))).toEqual([])
    button('Ready', pane(1)).click()

    expect(status(pane(0))).toBe('Your turn')
    expect(status(pane(1))).toBe('Ada’s turn')
    expect(status(pane(2))).toBe('You are watching: Ada against Bo.')
    // Those who watch see both seas, with no ships.
    expect($$('.sea', pane(2))).toHaveLength(2)
    expect($$('.sea .ship', pane(2))).toHaveLength(0)
    expect($$('.sea.target.active [data-cell]:not(:disabled)', pane(1))).toHaveLength(0)
    button('Show my fleet', pane(1)).click()
    expect(cellsWith('own', 'ship', pane(1))).toHaveLength(17)
    expect(button('Hide my fleet', pane(1)).ariaPressed).toBe('true')
    const water = Array.from({ length: 100 }, (_, c) => c).find(
      (c) => !shipsOf(local, 1).includes(c),
    )
    square('target', water ?? 0, pane(0)).click()
    expect(status(pane(1))).toBe('Your turn')
    expect(hints(pane(1))[0]).toBe('Ada hit water.')
    expect(cellsWith('own', 'miss', pane(1))).toEqual([water])
  })
})

describe('Sea Battle’s name', () => {
  it('is Schiffe versenken in German', () => {
    setLanguage('de')
    expect(t('seeschlacht')).toBe('Schiffe versenken')
    expect(squareName(0)).toBe('A1')
    expect(squareName(99)).toBe('J10')
  })
})
