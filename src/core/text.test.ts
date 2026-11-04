import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { cleanText, decodeText, encodeText, initial, isTextCode, nearly, normalize } from './text'

describe('words players write', () => {
  it('travel as numbers and back, cleaned and cut', () => {
    expect(decodeText(encodeText('  Bad   Tölz 🦊 ', 20), 20)).toBe('Bad Tölz 🦊')
    expect(encodeText('abcdef', 3)).toEqual([97, 98, 99])
    expect(decodeText([97, 10, 98], 5)).toBeNull()
    expect(decodeText([0xd800], 5)).toBeNull()
    expect(decodeText([65, 66, 67], 2)).toBeNull()
    fc.assert(
      fc.property(fc.string({ unit: 'binary', maxLength: 30 }), (text) => {
        const codes = encodeText(text, 12)
        expect(codes.length).toBeLessThanOrEqual(12)
        expect(codes.every(isTextCode)).toBe(true)
        expect(decodeText(codes, 12)).toBe(cleanText(text, 12))
      }),
    )
  })

  it('keep no control characters, and single spaces', () => {
    expect(cleanText('a\u0000b\t\tc​', 10)).toBe('ab c​')
    expect(cleanText(' x ', 10)).toBe('x')
    expect(cleanText('ab cd', 3)).toBe('ab')
  })

  it('compare without capitals, accents, umlauts, spaces and marks', () => {
    expect(normalize('Bad Tölz')).toBe('badtolz')
    expect(normalize('Straße')).toBe('strasse')
    expect(normalize('Ärztin!')).toBe('arztin')
    expect(initial('Ägypten')).toBe('A')
    expect(initial('  ')).toBe('')
  })

  it('know a word nearly right: a letter more, less, other, or two swapped', () => {
    expect(nearly('Giraffe', 'giraffe')).toBe(true)
    expect(nearly('Giraffe', 'Girafe')).toBe(true)
    expect(nearly('Giraffe', 'Giraffen')).toBe(true)
    expect(nearly('Giraffe', 'Giruffe')).toBe(true)
    expect(nearly('Giraffe', 'Gierffe')).toBe(false)
    expect(nearly('Giraffe', 'Gриffe')).toBe(false)
    expect(nearly('Giraffe', 'Giarffe')).toBe(true)
    expect(nearly('Hund', 'Katze')).toBe(false)
  })
})
