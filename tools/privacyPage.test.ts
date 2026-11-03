import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { escapeHtml, privacyHtml } from './privacyPage'

describe('the privacy page', () => {
  const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
  const page = privacyHtml(read('PRIVACY.md'), read('PRIVACY.de.md'))

  it('holds the policy in English and German, each with its own anchor', () => {
    expect(page).toMatch(/<section id="en" lang="en">\s*<h1>Privacy policy<\/h1>/)
    expect(page).toMatch(/<section id="de" lang="de">\s*<h1>Datenschutzerklärung<\/h1>/)
    expect(page).toContain('fipreroll+app@gmail.com')
    expect(page).toContain(
      '<a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">',
    )
  })

  it('takes nothing in the Markdown as markup', () => {
    expect(privacyHtml('A <script>x</script> & "y"', '')).toContain(
      '<p>A &lt;script&gt;x&lt;/script&gt; &amp; &quot;y&quot;</p>',
    )
    expect(escapeHtml('<a href="x">')).toBe('&lt;a href=&quot;x&quot;&gt;')
  })
})
