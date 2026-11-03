import { drawNetGraph } from '@fionapreroll/p2p/debug'
import { t } from '../i18n'
import { latestNet } from '../net/netlog'
import { debugReport, issueLink, reportSources } from '../report'
import { h } from './dom'

/**
 * Shows the debug report, to read, copy, download or send: nothing leaves the phone by itself.
 * After a table, a graph of its pings comes first; the report holds the connections' numbers,
 * second by second, beside the log.
 */
export async function reportDialog(): Promise<void> {
  const text = h('textarea', { readOnly: true, rows: 14, class: 'report' })
  const close = h('button', { type: 'button', textContent: t('close') })
  const copy = h('button', { type: 'button', textContent: t('copy') })
  const download = h('a', { class: 'button', textContent: t('debugDownload') })
  const github = h('a', {
    class: 'button primary',
    textContent: t('debugGithub'),
    target: '_blank',
    rel: 'noopener',
  })
  const note = h('p', { class: 'muted' })
  const net = latestNet()?.net ?? null
  const withGraph = net !== null && net.samples.length > 0
  const graph = h('canvas', { class: 'net-graph large' })
  const modal = h(
    'div',
    { class: 'modal' },
    h(
      'div',
      { class: 'card report-card' },
      h('h2', {}, t('debugTitle')),
      h('p', { class: 'muted' }, t('debugRead')),
      withGraph && h('p', { class: 'graph-label' }, t('netGraph')),
      withGraph && graph,
      text,
      note,
      // The first button is what Android's back button presses (see handleBack).
      h('div', { class: 'buttons' }, close, download, copy, github),
    ),
  )
  close.onclick = () => {
    if (download.href) URL.revokeObjectURL(download.href)
    modal.remove()
  }
  document.body.append(modal)
  if (net && withGraph) {
    // The canvas has its size only once it is on the page; the minute up to the last sample.
    const last = net.samples.at(-1)
    const now = performance.now()
    drawNetGraph(graph, net, last ? Math.min(now, net.startedAt + last.t * 1000 + 1000) : now, 60, {
      axes: true,
      color: netColor(net.self),
      nowLabel: t('now'),
    })
  }
  text.value = '…'
  const report = await debugReport(await reportSources())
  text.value = report
  download.href = URL.createObjectURL(new Blob([report], { type: 'text/markdown' }))
  download.download = `spielekiste-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.md`
  const toClipboard = async () => {
    text.select()
    const copied = await navigator.clipboard
      ?.writeText(report)
      .then(() => true)
      .catch(() => false)
    // Where the clipboard API is missing, the selected text is copied the old way.
    if (!copied) document.execCommand?.('copy')
    copy.textContent = t('copied')
  }
  copy.onclick = toClipboard
  github.href = issueLink(report, t('debugPaste'))
  github.onclick = () => {
    void toClipboard()
    note.textContent = t('debugCopiedForIssue')
  }
}

/** The seats' colours, as in style.css (`--seat-0` …). */
const SEAT_COLORS = ['#e5484d', '#f5c542', '#4fb3a9', '#8f7cf0', '#e98ac0', '#8fc75b']

/** The line of each connection: one colour per player on the host's phone, the host's otherwise. */
export function netColor(self: number): (peer: number) => string {
  return (peer) => (self === 0 ? (SEAT_COLORS[peer % SEAT_COLORS.length] ?? '#4fb3a9') : '#4fb3a9')
}
