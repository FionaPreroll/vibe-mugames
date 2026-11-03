// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setLanguage } from '../i18n'
import { keepScreenOn } from '../native'
import { updateSettings } from '../storage'
import { fullscreenButton, TurnBuzz } from './attention'
import { h } from './dom'

/** A screen whose status line is the player's own turn, or someone else's. */
const screen = (mine: boolean) =>
  h('div', {}, h('p', { class: `status turn${mine ? ' mine' : ''}` }, '…'))

describe('a buzz on the player’s turn', () => {
  const buzzed = vi.fn()
  beforeEach(() => {
    localStorage.clear()
    buzzed.mockReset()
    Object.defineProperty(navigator, 'vibrate', { value: buzzed, configurable: true })
  })

  it('buzzes once as the turn comes, not while it lasts', () => {
    const buzz = new TurnBuzz()
    buzz.update(screen(false))
    expect(buzzed).not.toHaveBeenCalled()
    buzz.update(screen(true))
    buzz.update(screen(true))
    expect(buzzed).toHaveBeenCalledTimes(1)
    buzz.update(screen(false))
    buzz.update(screen(true))
    expect(buzzed).toHaveBeenCalledTimes(2)
  })

  it('stays quiet when switched off', () => {
    updateSettings({ vibrate: false })
    const buzz = new TurnBuzz()
    buzz.update(screen(true))
    expect(buzzed).not.toHaveBeenCalled()
  })
})

describe('keeping the screen on', () => {
  const released = vi.fn(async () => {})
  const request = vi.fn(async () => ({ release: released, addEventListener: () => {} }))
  beforeEach(() => {
    released.mockClear()
    request.mockClear()
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true })
  })

  it('holds the screen while any screen wants it, and lets go after the last', async () => {
    const table = keepScreenOn()
    const other = keepScreenOn()
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    table()
    table()
    expect(released).not.toHaveBeenCalled()
    other()
    await vi.waitFor(() => expect(released).toHaveBeenCalledTimes(1))
  })
})

describe('the full-screen button', () => {
  afterEach(() => {
    Object.defineProperty(document, 'fullscreenEnabled', { value: false, configurable: true })
  })

  it('shows only where the browser can fill the screen', () => {
    Object.defineProperty(document, 'fullscreenEnabled', { value: false, configurable: true })
    expect(fullscreenButton()).toBeNull()
    Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true })
    setLanguage('de')
    const button = fullscreenButton()
    expect(button?.ariaLabel).toBe('Vollbild')
    const enter = vi.fn(async () => {})
    document.documentElement.requestFullscreen = enter
    button?.click()
    expect(enter).toHaveBeenCalledTimes(1)
  })
})
