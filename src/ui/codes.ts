import { type Signal, unpack } from '@fionapreroll/p2p'
import { qrElement, type Scanner, startScanner } from '@fionapreroll/p2p/qr'
import { t } from '../i18n'
import { h, toast } from './dom'

/**
 * The codes two phones swap to connect: this phone's own code as a QR code to show, a camera
 * to scan the other phone's, and both as text, for phones without a camera.
 */
export interface CodePanel {
  readonly element: HTMLElement
  /** Shows this phone's code; the camera stops, as the other phone scans now. */
  showOwn(code: string, hint: string): void
  /** Says what is going on, such as an error. */
  status(text: string): void
  /** Stops the camera. */
  stop(): void
}

/**
 * `expect`: the kind of code to take, the host's offer or a player's answer. `onCode` gets the
 * first one read, once; the panel stops looking for more.
 */
export function codePanel(
  expect: Signal['type'],
  hint: string,
  onCode: (signal: Signal) => void,
): CodePanel {
  const hintLine = h('p', { class: 'hint' }, hint)
  const qr = h('div', { class: 'qr-box', hidden: true })
  const video = h('video', { class: 'camera', muted: true, playsInline: true })
  const statusLine = h('p', { class: 'status', role: 'status' } as Partial<HTMLParagraphElement>)
  const own = h('textarea', { class: 'own-code', readOnly: true, rows: 3, hidden: true })
  const ownLabel = h('label', { hidden: true }, t('ownCode'), own)
  const copy = h('button', {
    type: 'button',
    hidden: true,
    textContent: t('copy'),
    onclick: () =>
      void navigator.clipboard
        ?.writeText(own.value)
        .then(() => toast(t('copied')))
        .catch(() => own.select()),
  })
  const paste = h('textarea', { class: 'paste-code', rows: 3 })
  let taken = false
  let scanner: Scanner | null = null

  const take = (text: string): boolean => {
    if (taken) return true
    const signal = unpack(text.trim())
    if (!signal || signal.type !== expect) {
      statusLine.textContent = t('notACode')
      return false
    }
    taken = true
    scanner?.stop()
    video.hidden = true
    onCode(signal)
    return true
  }

  const element = h(
    'div',
    { class: 'codes' },
    hintLine,
    qr,
    video,
    statusLine,
    h(
      'details',
      { class: 'text-codes' },
      h('summary', {}, t('textCodes')),
      ownLabel,
      copy,
      h('label', {}, t('pasteCode'), paste),
      h('button', {
        type: 'button',
        textContent: t('useCode'),
        onclick: () => take(paste.value),
      }),
    ),
  )

  startScanner(video, take)
    .then((started) => {
      if (taken) started.stop()
      else scanner = started
    })
    .catch(() => {
      video.hidden = true
      if (!taken) statusLine.textContent = t('cameraOff')
    })

  return {
    element,
    showOwn(code, text) {
      hintLine.textContent = text
      qr.replaceChildren(qrElement(code))
      qr.hidden = false
      own.value = code
      own.hidden = false
      ownLabel.hidden = false
      copy.hidden = false
    },
    status(text) {
      statusLine.textContent = text
    },
    stop() {
      taken = true
      scanner?.stop()
    },
  }
}
