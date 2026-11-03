// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@capacitor/core', () => ({ registerPlugin: () => ({}) }))
const native = vi.hoisted(() => ({ app: true }))
vi.mock('../native', () => ({ isApp: () => native.app }))
/** The Nearby that `bluetooth()` gives the screens: this phone's, on the fake air of a test. */
const phone = vi.hoisted(() => ({ nearby: undefined as unknown }))
vi.mock('../bluetooth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../bluetooth')>()),
  bluetooth: () => phone.nearby,
}))

const { Nearby, NearbyStartError } = await import('@fionapreroll/p2p-nearby')
const { NearbyAir } = await import('@fionapreroll/p2p-nearby/testing')
const { SERVICE_ID } = await import('../bluetooth')
const { setLanguage } = await import('../i18n')
const { GuestSeat, HostSeat } = await import('../net/session')
const { bluetoothHostDialog, bluetoothJoinScreen, chooseConnection, startErrorText } = await import(
  './bluetooth'
)
type Peer = import('@fionapreroll/p2p-nearby').Peer
type FakeNearby = import('@fionapreroll/p2p-nearby/testing').FakeNearby
type Guest = import('../net/session').GuestSeat

/**
 * The Spielekiste's Bluetooth screens on the fake Nearby of `@fionapreroll/p2p-nearby`: this
 * phone runs the screen, the other phone is driven by the test, and the real seats of the table
 * sit down over it.
 */

const later = (ms = 0) => vi.advanceTimersByTimeAsync(ms)
let air: InstanceType<typeof NearbyAir>
let closing: { close(): void }[] = []

function thisPhone(id: string): FakeNearby {
  const fake = air.phone(id)
  phone.nearby = new Nearby({ serviceId: SERVICE_ID }, fake)
  return fake
}

function otherPhone(id: string) {
  const fake = air.phone(id)
  return { fake, nearby: new Nearby({ serviceId: SERVICE_ID }, fake) }
}

function button(name: string, within: ParentNode = document): HTMLButtonElement {
  // A button's text, or the title of a button with a note beside it.
  const found = [...within.querySelectorAll('button')].find(
    (b) => b.textContent === name || b.querySelector('strong')?.textContent === name,
  )
  if (!found) throw new Error(`no button "${name}"`)
  return found
}
const status = () => document.querySelector('.status')?.textContent ?? ''
const rows = () => [...document.querySelectorAll<HTMLElement>('.requests li')]

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'],
  })
  setLanguage('en')
  native.app = true
  document.body.replaceChildren(Object.assign(document.createElement('div'), { id: 'app' }))
  air = new NearbyAir()
})

afterEach(() => {
  for (const item of closing) item.close()
  closing = []
  vi.useRealTimers()
})

describe('choosing how to connect', () => {
  it('asks in the app, and takes the QR code in a browser', async () => {
    const choosing = chooseConnection()
    expect(document.querySelector('.modal')?.textContent).toContain('How do the phones connect?')
    button('Bluetooth').click()
    expect(await choosing).toBe('bluetooth')
    expect(document.querySelector('.modal')).toBeNull()

    const cancelled = chooseConnection()
    button('Cancel').click()
    expect(await cancelled).toBeNull()

    native.app = false
    expect(await chooseConnection()).toBe('qr')
    expect(document.querySelector('.modal')).toBeNull()
  })
})

describe('startErrorText', () => {
  it('says why Bluetooth did not start, with Nearby’s code', () => {
    const error = (kind: string, code: string) =>
      new NearbyStartError(kind as InstanceType<typeof NearbyStartError>['kind'], code, '')
    expect(startErrorText(error('permission', 'permission'))).toMatch(/Allow.*\(permission\)$/)
    expect(startErrorText(error('location-off', 'location-off'))).toMatch(/Location is off/)
    expect(startErrorText(error('bluetooth-off', 'bluetooth-off'))).toMatch(/Bluetooth is off/)
    expect(startErrorText(error('unavailable', 'unavailable'))).toMatch(/Google Play services/)
    expect(startErrorText(error('radio', 'nearby-8007'))).toMatch(/\(nearby-8007\)$/)
    expect(startErrorText(new Error('other'))).toBe('Bluetooth did not start.')
  })
})

describe('the host’s Bluetooth dialog', () => {
  async function hosting() {
    const fake = thisPhone('HOST1')
    const seat = new HostSeat('Ada')
    closing.push(seat)
    const joined: string[] = []
    seat.onJoin = (name) => joined.push(name)
    bluetoothHostDialog(seat)
    await later()
    return { fake, seat, joined }
  }

  /** A player phone that finds the table and asks to sit down, as the Spielekiste would. */
  async function asking(id: string, name: string, version?: number) {
    const player = otherPhone(id)
    const found: Peer[] = []
    player.nearby.onFound = (peer) => found.push(peer)
    await player.nearby.look(name)
    await later()
    const dialing = player.nearby.dial(found[0] as Peer, name)
    const joining =
      version === undefined
        ? GuestSeat.join(dialing.connection, name, `token-${id}-1234`)
        : Promise.reject(new Error('unused'))
    joining.then((guest) => closing.push(guest)).catch(() => {})
    await later()
    return { player, dialing, joining }
  }

  it('shows who asks with the code, lets them sit down, and stays open for more', async () => {
    const { fake, seat, joined } = await hosting()
    expect(status()).toMatch(/visible to phones nearby/)
    expect(fake.role).toBe('host')
    const bo = await asking('PLAY1', 'Bo')
    const digits = await bo.dialing.digits
    expect(rows()[0]?.textContent).toContain(`Bo wants to sit down. Code: ${digits}`)

    button('Let in', rows()[0]).click()
    expect(rows()[0]?.textContent).toContain('Connecting')
    expect([...(rows()[0]?.querySelectorAll('button') ?? [])].every((b) => b.disabled)).toBe(true)
    await bo.joining
    await later()
    expect(joined).toEqual(['Bo'])
    expect(seat.state().players.map((p) => p.name)).toEqual(['Ada', 'Bo'])
    expect(rows()).toHaveLength(0)
    // Still open, and still visible, for the next player.
    expect(document.querySelector('.modal.bluetooth')).not.toBeNull()
    expect(fake.role).toBe('host')
  })

  it('turns a player down, and drops a request taken back', async () => {
    await hosting()
    const bo = await asking('PLAY1', 'Bo')
    const cy = await asking('PLAY2', 'Cy')
    expect(rows()).toHaveLength(2)
    button(
      'Turn down',
      rows().find((row) => row.textContent?.includes('Bo')),
    ).click()
    await later()
    await expect(bo.joining).rejects.toThrow()
    cy.dialing.connection.close()
    await later()
    expect(rows()).toHaveLength(0)
  })

  it('stops being visible when closed, and says why Bluetooth did not start', async () => {
    const { fake, seat } = await hosting()
    button('Close').click()
    await later()
    expect(document.querySelector('.modal')).toBeNull()
    expect(fake.role).toBeNull()
    fake.emit('request', { endpointId: 'LATE1', name: 'Late', digits: '1234', incoming: true })
    expect(seat.state().players).toHaveLength(1)

    const off = thisPhone('HOST2')
    off.startError = Object.assign(new Error('off'), { code: 'bluetooth-off' })
    bluetoothHostDialog(seat)
    await later()
    expect(status()).toMatch(/Bluetooth is off.*\(bluetooth-off\)$/)
  })
})

describe('the player’s Bluetooth screen', () => {
  /** A host phone with a table, letting in whoever asks if `letIn`. */
  async function tableNearby(id: string, name: string, letIn = true) {
    const host = otherPhone(id)
    const seat = new HostSeat(name)
    closing.push(seat)
    const requests: import('@fionapreroll/p2p-nearby').JoinRequest[] = []
    host.nearby.onRequest = (request) => {
      requests.push(request)
      if (!letIn) return
      const connection = host.nearby.accept(request)
      if (connection) void seat.room.attach(connection).joined.catch(() => {})
    }
    await host.nearby.host(name)
    return { host, seat, requests }
  }

  function joinScreen() {
    const seated: Guest[] = []
    const left = vi.fn()
    const viaQr = vi.fn()
    bluetoothJoinScreen(
      'Bo',
      (seat) => {
        seated.push(seat)
        closing.push(seat)
      },
      left,
      viaQr,
    )
    return { seated, left, viaQr }
  }

  const tables = () => [...document.querySelectorAll('.hosts button')].map((b) => b.textContent)

  it('lists the tables nearby, and says so while there is none', async () => {
    thisPhone('PLAY1')
    joinScreen()
    await later()
    expect(status()).toMatch(/No table found yet/)
    await tableNearby('HOST1', 'Ada')
    await later()
    expect(tables()).toEqual(['Ada'])
    expect(status()).toMatch(/Looking for tables nearby/)
  })

  it('shows the code, then sits down at the table', async () => {
    const { seat: host } = await tableNearby('HOST1', 'Ada')
    const fake = thisPhone('PLAY1')
    const { seated } = joinScreen()
    await later()
    button('Ada').click()
    await later()
    expect(fake.role).toBeNull()
    expect(seated).toHaveLength(1)
    expect(seated[0]?.host).toBe('Ada')
    await later(200)
    expect(host.state().players.map((p) => p.name)).toEqual(['Ada', 'Bo'])
    expect(seated[0]?.state()?.players.map((p) => p.name)).toEqual(['Ada', 'Bo'])
  })

  it('says when the host did not let the player in, and looks again', async () => {
    const { host, requests } = await tableNearby('HOST1', 'Ada', false)
    const fake = thisPhone('PLAY1')
    joinScreen()
    await later()
    button('Ada').click()
    await later()
    expect(status()).toMatch(/^Code: \d{4}\. Ada compares it and lets you in\.$/)
    host.nearby.reject(requests[0] as (typeof requests)[number])
    await later()
    expect(status()).toContain('The host did not let you in')
    button('Try again').click()
    await later()
    expect(fake.role).toBe('player')
    expect(tables()).toEqual(['Ada'])
  })

  it('goes back, or to the QR code, and stops looking', async () => {
    const fake = thisPhone('PLAY1')
    const first = joinScreen()
    await later()
    button('Use a QR code instead').click()
    await later()
    expect(first.viaQr).toHaveBeenCalledOnce()
    expect(fake.role).toBeNull()

    const second = joinScreen()
    await later()
    expect(fake.role).toBe('player')
    button('←').click()
    await later()
    expect(second.left).toHaveBeenCalledOnce()
    expect(fake.role).toBeNull()
  })

  it('says why looking did not start', async () => {
    const fake = thisPhone('PLAY1')
    fake.startError = Object.assign(new Error('off'), { code: 'location-off' })
    joinScreen()
    await later()
    expect(status()).toMatch(/Location is off/)
  })
})
