import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import basicSsl from '@vitejs/plugin-basic-ssl'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import { licenses } from './tools/licenses.ts'
import { privacyPage } from './tools/privacyPage.ts'

/** Which build this is, for the start screen and About: the version, the commit and the time. */
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

/**
 * The build's `version.json`, beside the page: an open page reads the one deployed and compares
 * it with its own build, to tell the player of a newer one (src/webUpdates.ts).
 */
function versionFile(build: ReturnType<typeof buildInfo>): Plugin {
  return {
    name: 'version-file',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: `${JSON.stringify(build)}\n`,
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const build = buildInfo()
  return {
    define: { __BUILD__: JSON.stringify(build) },
    // Relative asset URLs, so the build runs under any path, such as GitHub Pages' /vibe-mugames/.
    base: './',
    // Source maps only for measuring coverage in the browser tests (COVERAGE, see tests/e2e/coverage.ts).
    build: { sourcemap: Boolean(process.env.COVERAGE) },
    // Beside the page: version.json for website updates, licenses.json for About, and the
    // privacy policy as a page of its own. Phones only open the camera on HTTPS pages, so
    // `pnpm dev:phone` serves with a self-signed certificate that each phone accepts once.
    plugins: [
      versionFile(build),
      licenses(),
      privacyPage(),
      ...(mode === 'phone' ? [basicSsl()] : []),
    ],
    test: {
      include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
      coverage: {
        provider: 'v8',
        // Every source file, so files without tests count as uncovered instead of missing.
        include: ['src/**/*.ts'],
        exclude: ['**/*.test.ts'],
        // lcov for Codecov, a table for the terminal.
        reporter: ['text', 'lcov'],
      },
    },
  }
})
