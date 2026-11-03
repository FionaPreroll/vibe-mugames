import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'
import { type Block, type Inline, parseMarkdown } from '../src/markdown.ts'

/** The privacy policy as a page of its own, beside the game, for app stores to link to. */
export const PRIVACY_PAGE = 'privacy.html'

/**
 * Adds `privacy.html` to builds: PRIVACY.md and PRIVACY.de.md on one page, English first and
 * German at `#de`, so the policy has an address on the website that needs no script to read.
 */
export function privacyPage(): Plugin {
  return {
    name: 'spielekiste-privacy-page',
    apply: 'build',
    generateBundle() {
      const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
      this.emitFile({
        type: 'asset',
        fileName: PRIVACY_PAGE,
        source: privacyHtml(read('PRIVACY.md'), read('PRIVACY.de.md')),
      })
    },
  }
}

/** The page, from the policy's two Markdown files. */
export function privacyHtml(english: string, german: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>Spielekiste · Privacy policy · Datenschutzerklärung</title>
<link rel="icon" href="./icon.svg" type="image/svg+xml">
<style>
:root { --bg: #1d2b3a; --text: #f1ece2; --muted: #a9b4c0; --accent: #4fb3a9; --line: #3a516a; }
@media (prefers-color-scheme: light) {
  :root { --bg: #fbf8f2; --text: #1d2b3a; --muted: #55606b; --accent: #23786f; --line: #d4cdbf; }
}
body { margin: 0; background: var(--bg); color: var(--text);
  font: 1rem/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 42rem; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
nav { display: flex; gap: 1rem; font-size: 0.95rem; }
a { color: var(--accent); }
h1 { font-size: 1.6rem; margin: 1rem 0 0.5rem; }
h2 { font-size: 1.1rem; margin: 1.5rem 0 0.3rem; color: var(--accent); }
section + section { border-top: 1px solid var(--line); margin-top: 2.5rem; padding-top: 1rem; }
ul { padding-left: 1.2rem; }
li + li { margin-top: 0.35rem; }
code { font-size: 0.9em; }
</style>
</head>
<body>
<main>
<nav><a href="#en">English</a><a href="#de" hreflang="de">Deutsch</a><a href="./">Spielekiste</a></nav>
<section id="en" lang="en">
${blocksHtml(parseMarkdown(english))}
</section>
<section id="de" lang="de">
${blocksHtml(parseMarkdown(german))}
</section>
</main>
</body>
</html>
`
}

function blocksHtml(blocks: readonly Block[]): string {
  return blocks
    .map((block) => {
      if (block.kind === 'heading') {
        const level = Math.min(block.level, 6)
        return `<h${level}>${inlineHtml(block.content)}</h${level}>`
      }
      if (block.kind === 'paragraph') return `<p>${inlineHtml(block.content)}</p>`
      return `<ul>\n${block.items.map((item) => `<li>${inlineHtml(item)}</li>`).join('\n')}\n</ul>`
    })
    .join('\n')
}

function inlineHtml(parts: readonly Inline[]): string {
  return parts.map(partHtml).join('')
}

function partHtml(part: Inline): string {
  const text = escapeHtml(part.text)
  if (part.kind === 'code') return `<code>${text}</code>`
  if (part.kind === 'em') return `<em>${text}</em>`
  if (part.kind === 'strong') return `<strong>${text}</strong>`
  if (part.kind === 'link') return `<a href="${escapeHtml(part.href)}">${text}</a>`
  return text
}

/** Text as HTML: nothing in the Markdown is taken as markup. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
