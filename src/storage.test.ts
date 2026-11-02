import { describe, expect, it } from 'vitest'
import { parseSettings } from './storage'

describe('settings from storage', () => {
  it('falls back to the defaults for anything that does not fit', () => {
    expect(parseSettings(null)).toEqual({
      name: '',
      language: 'auto',
      checkUpdates: false,
      updatesAsked: false,
      localNames: [],
      localSplit: false,
    })
    expect(parseSettings({ language: 'fr', checkUpdates: 'yes', localSplit: 1 })).toMatchObject({
      language: 'auto',
      checkUpdates: false,
      localSplit: false,
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
