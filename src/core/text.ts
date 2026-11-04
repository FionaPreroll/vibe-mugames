/**
 * Words players write, such as answers and guesses: they travel in moves as numbers, a number
 * for each character, and the rules compare them as people would, without minding capitals,
 * accents or spaces.
 */

/** Whether a number is a character a player may write: no control characters, no halves. */
export function isTextCode(value: unknown): value is number {
  if (!Number.isInteger(value)) return false
  const code = value as number
  if (code < 32 || (code >= 127 && code < 160) || code > 0x10ffff) return false
  return code < 0xd800 || code > 0xdfff
}

/** A text, cleaned and cut to `max` characters, as the numbers a move carries. */
export function encodeText(text: string, max: number): number[] {
  return [...cleanText(text, max)].map((char) => char.codePointAt(0) ?? 32)
}

/** The text a move's numbers carry, cleaned and cut to `max` characters; null if they are not. */
export function decodeText(codes: readonly number[], max: number): string | null {
  if (codes.length > max || !codes.every(isTextCode)) return null
  return cleanText(String.fromCodePoint(...codes), max)
}

/**
 * A text as the rules keep it: without control characters, with single spaces between words
 * and none around them, no longer than `max` characters.
 */
export function cleanText(text: string, max: number): string {
  const kept = [...text].filter((char) => /\s/u.test(char) || isTextCode(char.codePointAt(0)))
  const words = kept.join('').replace(/\s+/gu, ' ').trim()
  return [...words].slice(0, max).join('').trim()
}

/**
 * A word as the rules compare it: in small letters, without accents and umlauts (ä is a),
 * ß as ss, and without spaces, hyphens or marks, so that "Bad Tölz" is "badtolz".
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ß/gu, 'ss')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

/** The first letter of a word as the rules see it, in capitals: Ä is A; '' if it has none. */
export function initial(text: string): string {
  return normalize(text).charAt(0).toUpperCase()
}

/**
 * Whether two words are nearly the same: one letter left out, added, changed or two swapped,
 * once both are normalized. Words the same count too.
 */
export function nearly(a: string, b: string): boolean {
  const x = normalize(a)
  const y = normalize(b)
  if (x === y) return true
  if (Math.abs(x.length - y.length) > 1) return false
  if (x.length === y.length) {
    const diff = [...x].flatMap((char, i) => (char === y[i] ? [] : [i]))
    if (diff.length === 1) return true
    const [i, j] = diff
    return diff.length === 2 && j === (i ?? 0) + 1 && x[i ?? 0] === y[j] && x[j] === y[i ?? 0]
  }
  const [long, short] = x.length > y.length ? [x, y] : [y, x]
  for (let i = 0; i < long.length; i++) {
    if (long.slice(0, i) + long.slice(i + 1) === short) return true
  }
  return false
}
