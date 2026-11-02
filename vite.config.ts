import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vitest/config'

/** Which build this is, for the start screen: the version, the commit and the time. */
function buildInfo(): { version: string; commit: string; time: string } {
  const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
  let commit = process.env.GITHUB_SHA?.slice(0, 7)
  if (!commit) {
    try {
      commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim()
    } catch {
      commit = 'unknown'
    }
  }
  return { version, commit, time: new Date().toISOString() }
}

export default defineConfig(({ mode }) => ({
  define: { __BUILD__: JSON.stringify(buildInfo()) },
  // Relative asset URLs, so the build runs under any path, such as GitHub Pages' /vibe-mugames/.
  base: './',
  // Phones only open the camera on HTTPS pages, so `pnpm dev:phone` serves with a self-signed
  // certificate that each phone accepts once.
  plugins: mode === 'phone' ? [basicSsl()] : [],
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts'],
      reporter: ['text', 'lcov'],
    },
  },
}))
