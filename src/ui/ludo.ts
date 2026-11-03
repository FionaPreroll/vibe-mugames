import {
  corners,
  type LudoMove,
  type LudoState,
  movable,
  OUT,
  SIX,
  square,
  TRACK,
  TRIES,
  target,
} from '../core/ludo'
import { t } from '../i18n'
import type { Picker } from './boards'
import { h } from './dom'

/**
 * Ludo's board: the track of 40 squares round a cross of 11 by 11, a corner for each player's
 * pieces, and their home squares leading to the middle. Each phone shows its own corner at the
 * bottom left. A tap on a piece that may move shows where it goes; a tap there moves it.
 */

const SIZE = 11
type Spot = readonly [x: number, y: number]

/** The track's squares, from corner 0's start square on, round the board clockwise. */
const TRACK_SPOTS: readonly Spot[] = (() => {
  const spots: Spot[] = []
  // A quarter of the track, from corner 0's start square up to corner 1's; the rest turns it.
  const quarter: Spot[] = [
    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
    [4, 3],
    [4, 2],
    [4, 1],
    [4, 0],
    [5, 0],
  ]
  for (let turn = 0; turn < 4; turn++) spots.push(...quarter.map((spot) => rotate(spot, turn)))
  return spots
})()

/** Each corner's home squares, from the track to the middle. */
const HOME_SPOTS: readonly (readonly Spot[])[] = [0, 1, 2, 3].map((corner) =>
  [1, 2, 3, 4].map((x) => rotate([x, 5], corner)),
)

/** Each corner's places for the pieces waiting there. */
const CORNER_SPOTS: readonly (readonly Spot[])[] = [0, 1, 2, 3].map((corner) =>
  (
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ] as Spot[]
  ).map((spot) => rotate(spot, corner)),
)

/** A spot turned clockwise round the middle by `turns` quarters. */
function rotate([x, y]: Spot, turns: number): Spot {
  let spot: Spot = [x, y]
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) spot = [SIZE - 1 - spot[1], spot[0]]
  return spot
}

/** Where a seat's piece stands on the board, before the board turns to the viewer. */
export function pieceSpot(game: LudoState, seat: number, piece: number, step: number): Spot {
  const seats = game.pieces.length
  const corner = corners(seats)[seat] ?? 0
  if (step === OUT) return CORNER_SPOTS[corner]?.[piece] ?? [0, 0]
  if (step >= TRACK) return HOME_SPOTS[corner]?.[step - TRACK] ?? [5, 5]
  return TRACK_SPOTS[square(seats, seat, step) ?? 0] ?? [0, 0]
}

/** Pips of a die face, on a grid of 3 by 3, read row by row. */
const PIPS: Readonly<Record<number, readonly number[]>> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

/** The die: its face, in the colour of who rolled it, and a button to roll on the player's turn. */
function die(game: LudoState, onRoll: (() => void) | null): HTMLElement {
  const pips = PIPS[game.die] ?? []
  // A roll just made shakes the die; one shown again after a move stays still.
  const fresh = game.die > 0 && (game.phase === 'move' || game.stuck)
  const button = h(
    'button',
    {
      type: 'button',
      class: [
        'die',
        game.rolledBy >= 0 ? `seat-${game.rolledBy}` : '',
        fresh ? 'fresh' : '',
        onRoll ? 'can' : '',
      ]
        .filter(Boolean)
        .join(' '),
      ariaLabel: onRoll ? t('ludoRollButton') : t('ludoDie', { n: game.die || '–' }),
      disabled: !onRoll,
      onclick: () => onRoll?.(),
    },
    ...Array.from({ length: 9 }, (_, i) => h('span', { class: pips.includes(i) ? 'pip' : '' })),
  )
  return h(
    'div',
    { class: 'die-row' },
    button,
    onRoll ? h('span', { class: 'roll-label' }, t('ludoRollButton')) : null,
  )
}

/** Whether the card help is open: it stays as the player left it while the table redraws. */
let helpOpen = true

/** How Ludo goes, for players learning it. */
function ludoHelp(): HTMLElement {
  const details = h(
    'details',
    { class: 'card-help ludo-help', open: helpOpen },
    h('summary', {}, t('ludoHelp')),
    h(
      'ul',
      {},
      ...(
        ['helpLudoGoal', 'helpLudoSix', 'helpLudoTries', 'helpLudoHit', 'helpLudoHome'] as const
      ).map((key) => h('li', {}, h('span', {}, t(key)))),
    ),
  )
  details.addEventListener('toggle', () => {
    helpOpen = details.open
  })
  return details
}

export interface LudoViewOptions {
  /** The seat whose corner is at the bottom left; -1 for those who watch. */
  readonly seat: number
  /** The names of the seats. */
  readonly names: readonly string[]
  /** Keeps the piece this view picked while the screen redraws. */
  readonly picker: Picker
  /** What the picker holds for this move: the piece picked, or nothing. */
  readonly picked: readonly number[]
  /** Makes a move, when this view may make one; null otherwise. */
  readonly onMove: ((move: LudoMove) => void) | null
}

/** The board, the die and the help, as one seat sees them. */
export function ludoView(game: LudoState, options: LudoViewOptions): HTMLElement {
  const { seat, names, picker, onMove } = options
  const seats = game.pieces.length
  const myCorner = seat >= 0 ? (corners(seats)[seat] ?? 0) : 3
  // The viewer's corner goes to the bottom left, where corner 3 is.
  const turns = 3 - myCorner
  const canMove = onMove ? movable(game) : []
  const picked = options.picked[0]
  const chosen = picked !== undefined && canMove.includes(picked) ? picked : undefined
  const goal = chosen === undefined ? null : target(game, game.turn, chosen, game.die)
  const goalSpot =
    chosen === undefined || goal === null ? null : pieceSpot(game, game.turn, chosen, goal)
  const moved = game.moved
  const lastSpots =
    moved === null
      ? []
      : [
          pieceSpot(game, moved.seat, moved.piece, moved.from),
          pieceSpot(game, moved.seat, moved.piece, moved.to),
        ]
  const same = (a: Spot | null, b: Spot) => a !== null && a[0] === b[0] && a[1] === b[1]

  /** What stands on each spot: a seat's piece, by the spot's key. */
  const pieces = new Map<string, { seat: number; piece: number }>()
  game.pieces.forEach((own, owner) => {
    own.forEach((step, piece) => {
      pieces.set(String(pieceSpot(game, owner, piece, step)), { seat: owner, piece })
    })
  })
  const seatOfCorner = (corner: number) => corners(seats).indexOf(corner)

  const board = h('div', {
    class: `board ludo${onMove ? ' active' : ''}`,
    role: 'grid',
  } as Partial<HTMLDivElement>)
  board.style.setProperty('--columns', String(SIZE))

  const place = (spot: Spot, kind: string, owner: number, label: string) => {
    const at = pieces.get(String(spot))
    const mine = at !== undefined && at.seat === game.turn && canMove.includes(at.piece)
    const isGoal = same(goalSpot, spot)
    const classes = [
      'cell',
      kind,
      owner >= 0 ? `seat-${owner}` : '',
      at ? 'has-piece' : 'empty',
      mine && chosen === at.piece ? 'picked' : '',
      mine && chosen === undefined ? 'can' : '',
      isGoal ? 'target' : '',
      lastSpots.some((s) => same(s, spot)) ? 'last' : '',
    ]
    const name = at ? (names[at.seat] ?? '?') : ''
    const button = h(
      'button',
      {
        type: 'button',
        class: classes.filter(Boolean).join(' '),
        ariaLabel: name ? `${label}: ${name}` : label,
        disabled: !onMove || !(mine || isGoal),
        onclick: () => {
          if (isGoal && chosen !== undefined) {
            picker.set([])
            onMove?.({ kind: 'piece', piece: chosen })
          } else if (mine && at) picker.set(chosen === at.piece ? [] : [at.piece])
        },
      },
      at ? h('span', { class: `token seat-${at.seat}` }) : null,
    )
    const [x, y] = rotate(spot, turns)
    button.style.gridColumn = String(x + 1)
    button.style.gridRow = String(y + 1)
    board.append(button)
  }

  for (let corner = 0; corner < 4; corner++) {
    const owner = seatOfCorner(corner)
    const who = names[owner] ?? ''
    for (const spot of CORNER_SPOTS[corner] ?? []) {
      place(spot, 'yard', owner, owner >= 0 ? t('ludoCorner', { name: who }) : t('ludoFreeCorner'))
    }
    HOME_SPOTS[corner]?.forEach((spot, i) => {
      if (owner >= 0) place(spot, 'home', owner, `${t('ludoHome', { name: who })} ${i + 1}`)
    })
  }
  TRACK_SPOTS.forEach((spot, i) => {
    const corner = i % (TRACK / 4) === 0 ? i / (TRACK / 4) : -1
    const owner = corner >= 0 ? seatOfCorner(corner) : -1
    const label =
      owner >= 0 ? t('ludoStart', { name: names[owner] ?? '' }) : `${t('ludoSquare')} ${i + 1}`
    place(spot, owner >= 0 ? 'track start' : 'track', owner, label)
  })
  const middle = h('div', { class: 'middle-mark', ariaHidden: 'true' })
  // The middle in the colours of the home squares around it: left, top, right, bottom.
  const sides = [0, 1, 2, 3].map((side) => {
    const owner = seatOfCorner((((side - turns) % 4) + 4) % 4)
    return owner >= 0 ? `var(--seat-${owner})` : 'var(--board-free)'
  })
  const [left, top, right, bottom] = sides
  middle.style.background = `conic-gradient(from -45deg, ${top} 0 25%, ${right} 0 50%, ${bottom} 0 75%, ${left} 0)`
  const [mx, my] = rotate([5, 5], turns)
  middle.style.gridColumn = String(mx + 1)
  middle.style.gridRow = String(my + 1)
  board.append(middle)

  const onRoll = onMove && game.phase === 'roll' && game.winner === null
  return h(
    'div',
    { class: 'ludo-game' },
    board,
    die(game, onRoll ? () => onMove({ kind: 'roll' }) : null),
    ludoHelp(),
  )
}

/**
 * What happened last, for everyone at the table, and what the player to move does now. `seat`
 * is this view's seat or -1; `shared` names everyone instead of saying "you".
 */
export function ludoHints(
  game: LudoState,
  seat: number,
  names: readonly string[],
  shared: boolean,
  picked: boolean,
): string[] {
  if (game.winner !== null) return []
  const lines: string[] = []
  const name = (s: number) => names[s] ?? '?'
  const me = (s: number) => s === seat && !shared
  const mine = seat === game.turn
  const n = game.die
  const moved = game.moved
  if (game.stuck && game.rolledBy >= 0) {
    lines.push(
      me(game.rolledBy)
        ? t('ludoYouStuck', { n })
        : t('ludoStuck', { name: name(game.rolledBy), n }),
    )
  } else if (game.phase === 'roll' && moved !== null && moved.hit !== null) {
    lines.push(
      me(moved.seat)
        ? t('ludoYouHit', { other: name(moved.hit) })
        : me(moved.hit)
          ? t('ludoHitYou', { name: name(moved.seat) })
          : t('ludoHit', { name: name(moved.seat), other: name(moved.hit) }),
    )
  }
  if (!mine) {
    if (game.phase === 'move') lines.push(t('ludoRolled', { name: name(game.turn), n }))
    return lines
  }
  const own = game.pieces[game.turn] ?? []
  if (game.phase === 'move') {
    if (picked) lines.push(t('ludoPicked'))
    else if (n === SIX && own.includes(OUT)) lines.push(t('ludoPickSix'))
    else lines.push(t('ludoPick', { n }))
    return lines
  }
  const again = game.rolledBy === game.turn && game.die === SIX
  const outOnTrack = own.some((step) => step >= 0 && step < TRACK)
  if (again) lines.push(t('ludoSixAgain'))
  else if (game.stuck && game.rolledBy === game.turn && game.tries > 0) {
    const left = TRIES - game.tries
    lines.push(left === 1 ? t('ludoTryLeft') : t('ludoTriesLeft', { n: left }))
  } else if (!outOnTrack && own.some((step) => step === OUT)) lines.push(t('ludoNeedSix'))
  else lines.push(t('ludoRollHint'))
  return lines
}
