// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { h } from './dom'
import { keptPlace, replaceKeeping } from './keep'

/** Elements kept while the screen around them is drawn anew. */

beforeEach(() => {
  document.body.innerHTML = '<div id="main"></div>'
})

const main = () => document.getElementById('main') as HTMLElement

describe('a kept element', () => {
  it('stays in the page, focused, while everything around it is drawn anew', () => {
    const field = h('input', { type: 'text' })
    const draw = (n: number) =>
      replaceKeeping(main(), [
        h('p', { class: 'status' }, `Move ${n}`),
        h(
          'div',
          { class: `stage n${n}` },
          h('p', {}, `before ${n}`),
          h('section', { class: 'form' }, keptPlace(field), h('button', {}, `Send ${n}`)),
          h('p', {}, `after ${n}`),
        ),
      ])
    draw(1)
    field.focus()
    field.value = 'typed'
    const stage = main().querySelector('.stage')
    draw(2)
    expect(document.activeElement).toBe(field)
    expect(field.value).toBe('typed')
    // The elements that hold it stay too, with the new attributes, and new other children.
    expect(main().querySelector('.stage')).toBe(stage)
    expect(stage?.className).toBe('stage n2')
    expect(main().textContent).toBe('Move 2before 2Send 2after 2')
    expect(main().querySelectorAll('input')).toHaveLength(1)
    expect(main().querySelector('.kept-place')).toBeNull()
  })

  it('goes into place on the first drawing, and away when no longer drawn', () => {
    const field = h('input', { type: 'text' })
    replaceKeeping(main(), [h('div', {}, keptPlace(field))])
    expect(field.isConnected).toBe(true)
    replaceKeeping(main(), [keptPlace(field), h('p', {}, 'x')])
    expect(main().firstChild).toBe(field)
    replaceKeeping(main(), [h('p', {}, 'gone')])
    expect(field.isConnected).toBe(false)
    expect(main().textContent).toBe('gone')
  })

  it('keeps several, each in its own part', () => {
    const a = h('input', {})
    const b = h('input', {})
    const draw = () =>
      replaceKeeping(main(), [
        h(
          'div',
          { class: 'panes' },
          h('section', {}, h('b', {}, 'A'), keptPlace(a)),
          h('section', {}, h('b', {}, 'B'), keptPlace(b)),
        ),
      ])
    draw()
    b.focus()
    draw()
    expect(document.activeElement).toBe(b)
    expect([...main().querySelectorAll('input')]).toEqual([a, b])
    expect(main().textContent).toBe('AB')
  })

  it('draws plainly where nothing is kept', () => {
    replaceKeeping(main(), [h('p', {}, 'one')])
    replaceKeeping(
      main(),
      [h('p', {}, 'two'), 'three'].map((n) =>
        typeof n === 'string' ? document.createTextNode(n) : n,
      ),
    )
    expect(main().textContent).toBe('twothree')
  })
})
