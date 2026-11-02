import { type Signal, unpack } from '@fionapreroll/p2p'
import { cameraView, qrElement } from '@fionapreroll/p2p/qr'
import { t } from '../i18n'
import { rememberCamera, rememberedCamera } from '../storage'
import { h, toast } from './dom'

/**
 * The codes two phones swap to connect: this phone's own code as a QR code to show, a camera
 * to scan the other phone's, and both as text, for phones without a camera. The camera is the
 * library's camera view: tapping the picture focuses there, with zoom and brightness where the
 * camera has them, switching cameras, and a photo from the phone's own camera app.
 */
export interface CodePanel {
  readonly element: HTMLElement
  /** Shows this phone's code; the camera stops, as the other phone scans now. */
  showOwn(code: string, hint: string): void
  /** Says what is going on, such as that the phone waits for the other one. */
  status(text: string): void
  /** Says what went wrong, with a button to try again. */
  failed(text: string, retry: () => void): void
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
  const statusLine = h('p', { class: 'status', role: 'status' } as Partial<HTMLParagraphElement>)
  const own = h('textarea', { class: 'own-code', readOnly: true, rows: 3, hidden: true })
  const ownLabel = h('label', { hidden: true }, t('ownCode'), own)
  const copy = h('button', {
    type: 'button',
    hidden: true,
    textContent: t('copy'),
    onclick: () => void copyCode(own).then((done) => toast(done ? t('copied') : t('copyByHand'))),
  })
  const paste = h('textarea', { class: 'paste-code', rows: 3 })
  const pasteLabel = h('label', {}, t('pasteCode'), paste)
  const use = h('button', {
    type: 'button',
    textContent: t('useCode'),
    onclick: () => take(paste.value),
  })
  let taken = false
  const help = h('p', { class: 'muted scan-help', hidden: true }, t('scanHelpBasic'))
  const camera = cameraView({
    texts: {
      zoom: t('zoom'),
      brightness: t('brightness'),
      switchCamera: t('switchCamera'),
      takePhoto: t('takePhoto'),
      liveCamera: t('liveCamera'),
    },
    onCodes: (texts) => texts.some((text) => take(text)),
    camera: rememberedCamera(),
    onCameraChange: rememberCamera,
    onLive: (scanner) => {
      help.hidden = scanner === null
      if (scanner) {
        help.textContent = scanner.zoom || scanner.exposure ? t('scanHelp') : t('scanHelpBasic')
      }
    },
    onError: () => {
      if (!taken) status(t('cameraOff'))
    },
    onPhoto: (state) => {
      if (!taken) status(state === 'reading' ? t('readingPhoto') : t('photoNoCode'))
    },
  })
  camera.buttons.classList.add('buttons')

  const take = (text: string): boolean => {
    if (taken) return true
    const signal = unpack(text.trim())
    if (!signal || signal.type !== expect) {
      status(t('notACode'))
      return false
    }
    taken = true
    camera.stop()
    camera.viewfinder.hidden = true
    camera.buttons.hidden = true
    help.hidden = true
    // Taken: there is nothing more to paste here, and an earlier complaint no longer holds.
    pasteLabel.hidden = true
    use.hidden = true
    status(t('codeTaken'))
    onCode(signal)
    return true
  }

  const element = h(
    'div',
    { class: 'codes' },
    hintLine,
    qr,
    camera.viewfinder,
    camera.controls,
    help,
    camera.buttons,
    statusLine,
    h(
      'details',
      { class: 'text-codes' },
      h('summary', {}, t('textCodes')),
      ownLabel,
      copy,
      pasteLabel,
      use,
    ),
  )

  /** Puts a line in the status, where the player sees it, as they may have scrolled away. */
  function status(text: string, ...extra: Node[]) {
    statusLine.replaceChildren(text, ...extra)
    if (text) statusLine.scrollIntoView?.({ block: 'nearest' })
  }

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
      status(text)
    },
    failed(text, retry) {
      status(
        text,
        document.createTextNode(' '),
        h('button', { type: 'button', textContent: t('tryAgain'), onclick: retry }),
      )
    },
    stop() {
      taken = true
      camera.stop()
    },
  }
}

/**
 * Copies a code. Where the browser has no clipboard for the page, or refuses, the code is
 * selected and copied the old way. False if that did not work either: the player copies by hand.
 */
async function copyCode(field: HTMLTextAreaElement): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(field.value)
    return true
  } catch {
    field.select()
    try {
      return document.execCommand('copy')
    } catch {
      return false
    }
  }
}
