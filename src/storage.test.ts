import { describe, expect, it } from 'vitest'
import { parseSettings } from './storage'

describe('settings from storage', () => {
  it('falls back to the defaults for anything that does not fit', () => {
    expect(parseSettings(null)).toEqual({
      name: '',
      language: 'auto',
      checkUpdates: false,
      updatesAsked: false,
      webUpdates: false,
      localNames: [],
      localSplit: false,
      hockeyWhole: true,
      hockeySmooth: false,
      vibrate: true,
      recentGames: [],
      theme: 'seasons',
    })
    expect(
      parseSettings({ language: 'fr', checkUpdates: 'yes', webUpdates: 1, localSplit: 1 }),
    ).toMatchObject({
      language: 'auto',
      checkUpdates: false,
      webUpdates: false,
      localSplit: false,
    })
  })

  it('keeps a theme that exists, or follows the seasons', () => {
    expect(parseSettings({ theme: 'nord' }).theme).toBe('nord')
    expect(parseSettings({ theme: 'seasons' }).theme).toBe('seasons')
    expect(parseSettings({ theme: 'classic' }).theme).toBe('classic')
    expect(parseSettings({ theme: 'solarized' }).theme).toBe('seasons')
    expect(parseSettings({ theme: 3 }).theme).toBe('seasons')
  })

  it('buzzes unless told not to', () => {
    expect(parseSettings({}).vibrate).toBe(true)
    expect(parseSettings({ vibrate: 'no' }).vibrate).toBe(true)
    expect(parseSettings({ vibrate: false }).vibrate).toBe(false)
  })

  it('keeps the games played lately that exist, each once, and at most three', () => {
    expect(
      parseSettings({ recentGames: ['ludo', 'chess', 'ludo', 7, 'muehle', 'dame', 'reversi'] })
        .recentGames,
    ).toEqual(['ludo', 'muehle', 'dame'])
    expect(parseSettings({ recentGames: 'ludo' }).recentGames).toEqual([])
  })

  it('shows the whole rink unless told not to, and smooths only when told to', () => {
    expect(parseSettings({ hockeyWhole: false, hockeySmooth: true })).toMatchObject({
      hockeyWhole: false,
      hockeySmooth: true,
    })
    expect(parseSettings({ hockeyWhole: 'no', hockeySmooth: 'yes' })).toMatchObject({
      hockeyWhole: true,
      hockeySmooth: false,
    })
  })

  it('keeps who last played on this device, cleaned, and at most six of them', () => {
    const settings = parseSettings({
      localNames: ['  Ada ', 'B\u0000o', 7, '', 'Di', 'Ed', 'Flo', 'Gus'],
      localSplit: true,
    })
    expect(settings.localNames).toEqual(['Ada', 'Bo', '', '', 'Di', 'Ed'])
    expect(settings.localSplit).toBe(true)
    expect(parseSettings({ localNames: 'Ada' }).localNames).toEqual([])
  })
})
