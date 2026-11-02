/** Numbers from 0 up to, not including, 1, from the browser's cryptographic randomness. */
export function random(): number {
  return (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) / 2 ** 32
}
