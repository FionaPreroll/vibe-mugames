/**
 * Werwolf, the party game of a village with werewolves hidden among it, as pure rules: 4 to 8
 * players, each with a role only they know. The host's phone is the game master.
 *
 * - The werewolves know each other. Every night they pick a villager to take; if they pick
 *   different ones, chance decides between their picks.
 * - The seer learns every night of one player whether they are a werewolf.
 * - The healer protects one player every night, themselves too, but not the same two nights in a
 *   row. Whoever the healer protects survives the wolves.
 * - Everyone else is a villager. At night, everyone chooses someone, villagers too, so that
 *   nobody can tell a role by who taps their phone: a villager's choice changes nothing.
 * - In the morning, the village learns who was taken, if anyone, and what they were. By day,
 *   everyone still in votes for whom to banish; whoever gets the most votes is out, and their
 *   role shown. A tie banishes nobody.
 * - The village wins once every werewolf is out; the werewolves win once they are as many as the
 *   others.
 *
 * Roles: one werewolf for four or five players, two from six; a seer always, a healer from five.
 */

export const MIN_VILLAGE = 4
export const MAX_VILLAGE = 8

export const ROLES = ['wolf', 'seer', 'healer', 'villager'] as const
export type Role = (typeof ROLES)[number]

export type WolfPhase = 'night' | 'day'

/** The teams that can win. */
export type Team = 'wolves' | 'village'

/** What happened in the open, for everyone to read: a night's end, or a day's vote. */
export type Story =
  | {
      readonly kind: 'night'
      readonly night: number
      /** The player the wolves took, or null if nobody died. */
      readonly victim: number | null
    }
  | {
      readonly kind: 'vote'
      readonly night: number
      /** Who each seat voted for, by seat; null for those already out. */
      readonly votes: readonly (number | null)[]
      /** The player banished, or null after a tie. */
      readonly out: number | null
    }

/** What the seer learned: whether a player is a werewolf. */
export interface Finding {
  readonly seat: number
  readonly wolf: boolean
}

/** The whole game, as only the host knows it. */
export interface WolfState {
  readonly roles: readonly Role[]
  readonly alive: readonly boolean[]
  readonly phase: WolfPhase
  /** The night this is, or the day after it: 1 for the first. */
  readonly night: number
  /** What each seat chose in this phase, by seat; null until they choose. */
  readonly choices: readonly (number | null)[]
  /** Whom the healer protected last night, who may not be protected again tonight. */
  readonly healed: number | null
  readonly findings: readonly Finding[]
  readonly story: readonly Story[]
  readonly winner: Team | null
}

/** What one seat may see of the game: their own role, and what their role lets them know. */
export interface WolfView {
  /** Each seat's role as this seat knows it: their own, fellow wolves, those out, all at the end. */
  readonly roles: readonly (Role | null)[]
  readonly alive: readonly boolean[]
  readonly phase: WolfPhase
  readonly night: number
  /** Who has chosen in this phase. */
  readonly done: readonly boolean[]
  /** The choices this seat may see: their own, and at night their fellow wolves'. */
  readonly choices: readonly (number | null)[]
  /** For the healer: whom they protected last night. */
  readonly healed: number | null
  /** For the seer: what they learned so far. */
  readonly findings: readonly Finding[]
  readonly story: readonly Story[]
  readonly winner: Team | null
}

/** The roles of a game of `seats` players, before they are shuffled. */
export function rolesFor(seats: number): Role[] {
  const wolves = seats >= 6 ? 2 : 1
  const healers = seats >= 5 ? 1 : 0
  const villagers = seats - wolves - 1 - healers
  return [
    ...Array.from({ length: wolves }, () => 'wolf' as const),
    'seer',
    ...Array.from({ length: healers }, () => 'healer' as const),
    ...Array.from({ length: villagers }, () => 'villager' as const),
  ]
}

/** A new game: the roles shuffled with `random`, numbers from 0 up to, not including, 1. */
export function deal(seats: number, random: () => number): WolfState {
  const roles = rolesFor(seats)
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)))
    const swap = roles[i] as Role
    roles[i] = roles[j] as Role
    roles[j] = swap
  }
  return {
    roles,
    alive: roles.map(() => true),
    phase: 'night',
    night: 1,
    choices: roles.map(() => null),
    healed: null,
    findings: [],
    story: [],
    winner: null,
  }
}

/** Whether a value is a seat of a game of `seats` players. */
export function isSeat(value: unknown, seats: number): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < seats
}

/** The players `seat` may choose now: whom to take, look at, protect, suspect or banish. */
export function choices(view: WolfView, seat: number): number[] {
  if (view.winner !== null || !view.alive[seat] || view.done[seat]) return []
  const role = view.roles[seat]
  const others = view.alive.flatMap((alive, other) => (alive && other !== seat ? [other] : []))
  if (view.phase === 'day') return others
  if (role === 'healer') return view.alive.flatMap((a, i) => (a && i !== view.healed ? [i] : []))
  if (role === 'wolf') return others.filter((other) => view.roles[other] !== 'wolf')
  if (role === 'seer') {
    // Players not looked at yet; once the seer knows everyone, any of them again.
    const unknown = others.filter((other) => !view.findings.some((f) => f.seat === other))
    return unknown.length > 0 ? unknown : others
  }
  return others
}

/** Whether `seat` may choose `target` now. */
export function legal(state: WolfState, seat: number, target: number): boolean {
  return choices(view(state, seat), seat).includes(target)
}

/** The seats still to choose in this phase. */
export function waiting(view: { alive: readonly boolean[]; done: readonly boolean[] }): number[] {
  return view.alive.flatMap((alive, seat) => (alive && !view.done[seat] ? [seat] : []))
}

/** The team that won, if one has: the village without wolves, or wolves as many as the rest. */
function winnerOf(roles: readonly Role[], alive: readonly boolean[]): Team | null {
  const wolves = roles.filter((role, i) => role === 'wolf' && alive[i]).length
  const others = roles.filter((role, i) => role !== 'wolf' && alive[i]).length
  if (wolves === 0) return 'village'
  return wolves >= others ? 'wolves' : null
}

/**
 * The game after `seat` chose `target`, which must be legal. Once everyone still in has chosen,
 * the night or the day ends; `random` decides between the wolves' picks if they differ.
 */
export function play(
  state: WolfState,
  seat: number,
  target: number,
  random: () => number,
): WolfState {
  const choices = state.choices.map((choice, i) => (i === seat ? target : choice))
  const chosen = { ...state, choices }
  if (state.alive.some((alive, i) => alive && choices[i] === null)) return chosen
  return state.phase === 'night' ? dawn(chosen, random) : banish(chosen)
}

/** The night's end: the wolves take their pick, unless the healer protected them. */
function dawn(state: WolfState, random: () => number): WolfState {
  const of = (role: Role) =>
    state.roles.flatMap((r, i) => (r === role && state.alive[i] ? [state.choices[i] ?? -1] : []))
  const picks = of('wolf').filter((pick) => pick >= 0)
  const pick = picks[Math.min(picks.length - 1, Math.floor(random() * picks.length))] ?? null
  const healed = of('healer')[0] ?? null
  const victim = pick !== null && pick !== healed ? pick : null
  const seen = of('seer')[0]
  const findings =
    seen === undefined || seen < 0
      ? state.findings
      : [...state.findings, { seat: seen, wolf: state.roles[seen] === 'wolf' }]
  const alive = state.alive.map((a, i) => a && i !== victim)
  return {
    ...state,
    alive,
    phase: 'day',
    choices: state.roles.map(() => null),
    healed,
    findings,
    story: [...state.story, { kind: 'night', night: state.night, victim }],
    winner: winnerOf(state.roles, alive),
  }
}

/** The day's end: whoever got the most votes is banished, nobody after a tie. */
function banish(state: WolfState): WolfState {
  const tally = state.roles.map((_, seat) => state.choices.filter((c) => c === seat).length)
  const most = Math.max(...tally)
  const top = tally.flatMap((n, seat) => (n === most ? [seat] : []))
  const out = top.length === 1 ? (top[0] ?? null) : null
  const alive = state.alive.map((a, i) => a && i !== out)
  return {
    ...state,
    alive,
    phase: 'night',
    night: state.night + 1,
    choices: state.roles.map(() => null),
    story: [
      ...state.story,
      {
        kind: 'vote',
        night: state.night,
        votes: state.choices.map((c, i) => (state.alive[i] ? c : null)),
        out,
      },
    ],
    winner: winnerOf(state.roles, alive),
  }
}

/** The seats of the team that won, every one of them, those out too. */
export function winners(state: { roles: readonly (Role | null)[]; winner: Team | null }): number[] {
  if (state.winner === null) return []
  const wolves = state.winner === 'wolves'
  return state.roles.flatMap((role, seat) => ((role === 'wolf') === wolves ? [seat] : []))
}

/** What `seat` may see of the game; a seat of -1, or any that does not play, only watches. */
export function view(state: WolfState, seat: number): WolfView {
  const own = state.roles[seat]
  const wolf = own === 'wolf'
  const over = state.winner !== null
  const known = (role: Role, i: number) =>
    over || i === seat || !state.alive[i] || (wolf && role === 'wolf')
  return {
    roles: state.roles.map((role, i) => (known(role, i) ? role : null)),
    alive: state.alive,
    phase: state.phase,
    night: state.night,
    done: state.choices.map((choice) => choice !== null),
    choices: state.choices.map((choice, i) =>
      i === seat || (wolf && state.phase === 'night' && state.roles[i] === 'wolf') ? choice : null,
    ),
    healed: own === 'healer' ? state.healed : null,
    findings: own === 'seer' ? state.findings : [],
    story: state.story,
    winner: state.winner,
  }
}
