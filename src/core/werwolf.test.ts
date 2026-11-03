import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  choices,
  deal,
  legal,
  play,
  type Role,
  rolesFor,
  view,
  type WolfState,
  waiting,
  winners,
} from './werwolf'

function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

/** A first night with these roles, in seat order. */
function village(...roles: Role[]): WolfState {
  return { ...deal(roles.length, seeded(1)), roles }
}

/** Every seat still in chooses as listed, by seat: what the wolves, seer and healer do. */
function everyone(state: WolfState, picks: readonly number[], random = seeded(2)): WolfState {
  let game = state
  picks.forEach((target, seat) => {
    if (game.alive[seat]) game = play(game, seat, target, random)
  })
  return game
}

describe('roles', () => {
  it('gives one wolf to four and five, two from six, a seer always, a healer from five', () => {
    const count = (roles: Role[], role: Role) => roles.filter((r) => r === role).length
    for (let seats = 4; seats <= 8; seats++) {
      const roles = rolesFor(seats)
      expect(roles).toHaveLength(seats)
      expect(count(roles, 'wolf')).toBe(seats >= 6 ? 2 : 1)
      expect(count(roles, 'seer')).toBe(1)
      expect(count(roles, 'healer')).toBe(seats >= 5 ? 1 : 0)
    }
  })

  it('shuffles them', () => {
    const wolves = new Set(
      Array.from({ length: 20 }, (_, seed) => deal(5, seeded(seed)).roles.indexOf('wolf')),
    )
    expect(wolves.size).toBeGreaterThan(2)
  })

  it('shows each player their own role, and wolves each other', () => {
    const game = village('wolf', 'villager', 'wolf', 'seer', 'healer', 'villager')
    expect(view(game, 1).roles).toEqual([null, 'villager', null, null, null, null])
    expect(view(game, 0).roles).toEqual(['wolf', null, 'wolf', null, null, null])
    expect(view(game, -1).roles.every((role) => role === null)).toBe(true)
  })
})

describe('the night', () => {
  const game = village('wolf', 'seer', 'healer', 'villager', 'villager')

  it('lets everyone choose, but wolves no wolf and nobody but the healer themselves', () => {
    expect(choices(view(game, 0), 0)).toEqual([1, 2, 3, 4])
    expect(choices(view(game, 1), 1)).toEqual([0, 2, 3, 4])
    expect(choices(view(game, 2), 2)).toEqual([0, 1, 2, 3, 4])
    expect(choices(view(game, 3), 3)).toEqual([0, 1, 2, 4])
    const pack = village('wolf', 'wolf', 'seer', 'villager', 'villager', 'healer')
    expect(choices(view(pack, 0), 0)).toEqual([2, 3, 4, 5])
  })

  it('takes one choice a seat, and waits for everyone', () => {
    const first = play(game, 0, 3, seeded(1))
    expect(legal(first, 0, 4)).toBe(false)
    expect(waiting(view(first, 1))).toEqual([1, 2, 3, 4])
    expect(view(first, 1).done).toEqual([true, false, false, false, false])
    // Nobody but the wolves sees whom the wolves picked.
    expect(view(first, 1).choices[0]).toBeNull()
    expect(view(first, 0).choices[0]).toBe(3)
  })

  it('ends with the wolves’ victim out, and the seer knowing', () => {
    const day = everyone(game, [3, 0, 1, 0, 0])
    expect(day.phase).toBe('day')
    expect(day.alive).toEqual([true, true, true, false, true])
    expect(day.story).toEqual([{ kind: 'night', night: 1, victim: 3 }])
    expect(view(day, 1).findings).toEqual([{ seat: 0, wolf: true }])
    expect(view(day, 4).findings).toEqual([])
    // The dead are known to all.
    expect(view(day, 4).roles[3]).toBe('villager')
  })

  it('saves whom the healer protects, but not the same twice in a row', () => {
    const day = everyone(game, [3, 4, 3, 0, 0])
    expect(day.alive.every(Boolean)).toBe(true)
    expect(day.story.at(-1)).toEqual({ kind: 'night', night: 1, victim: null })
    const night = everyone(day, [1, 0, 0, 0, 0])
    expect(night.phase).toBe('night')
    expect(view(night, 2).healed).toBe(3)
    expect(choices(view(night, 2), 2)).not.toContain(3)
    expect(view(night, 1).healed).toBeNull()
  })

  it('lets chance decide when the wolves pick different victims', () => {
    const pack = village('wolf', 'wolf', 'seer', 'villager', 'villager', 'healer')
    const victims = new Set(
      Array.from(
        { length: 20 },
        (_, seed) => everyone(pack, [3, 4, 0, 0, 0, 2], seeded(seed * 99_991)).story[0],
      ).map((story) => (story?.kind === 'night' ? story.victim : -1)),
    )
    expect(victims).toEqual(new Set([3, 4]))
  })
})

describe('the day', () => {
  const night = village('wolf', 'seer', 'healer', 'villager', 'villager')
  const day = everyone(night, [3, 4, 3, 0, 0])

  it('lets everyone still in vote for anyone else, and nobody out', () => {
    expect(choices(view(day, 0), 0)).toEqual([1, 2, 3, 4])
    expect(choices(view(day, 3), 3)).toEqual([0, 1, 2, 4])
    const after = everyone(night, [3, 4, 0, 0, 0])
    expect(choices(view(after, 3), 3)).toEqual([])
    expect(choices(view(after, 0), 0)).toEqual([1, 2, 4])
  })

  it('banishes whoever gets the most votes, and shows the votes after', () => {
    const next = everyone(day, [1, 0, 0, 0, 0])
    expect(next.alive).toEqual([false, true, true, true, true])
    expect(next.story.at(-1)).toEqual({ kind: 'vote', night: 1, votes: [1, 0, 0, 0, 0], out: 0 })
    expect(next.winner).toBe('village')
    expect(winners(next)).toEqual([1, 2, 3, 4])
    // Once it is over, everyone sees every role.
    expect(view(next, 4).roles).toEqual(night.roles)
  })

  it('banishes nobody after a tie', () => {
    const next = everyone(day, [1, 0, 1, 0, 4])
    expect(next.alive).toEqual(day.alive)
    expect(next.story.at(-1)).toMatchObject({ kind: 'vote', out: null })
    expect(next.phase).toBe('night')
    expect(next.night).toBe(2)
  })

  it('hides how others voted until everyone has', () => {
    const voted = play(day, 0, 1, seeded(1))
    expect(view(voted, 2).choices[0]).toBeNull()
    expect(view(voted, 0).choices[0]).toBe(1)
  })

  it('gives the wolves the game once they are as many as the rest', () => {
    const small = village('wolf', 'seer', 'villager', 'villager')
    // The seer is taken, then the village banishes a villager.
    const after = everyone(everyone(small, [1, 0, 0, 0]), [3, 3, 3, 0])
    expect(after.winner).toBe('wolves')
    expect(winners(after)).toEqual([0])
  })
})

describe('whole games', () => {
  it('always end, with the wolves or the village winning', () => {
    fc.assert(
      fc.property(fc.integer({ min: 4, max: 8 }), fc.integer(), (seats, seed) => {
        const random = seeded(seed)
        let game = deal(seats, random)
        for (let step = 0; step < 500 && game.winner === null; step++) {
          const seat = waiting(view(game, 0))[0] as number
          const options = choices(view(game, seat), seat)
          expect(options.length).toBeGreaterThan(0)
          game = play(game, seat, options[Math.floor(random() * options.length)] as number, random)
        }
        expect(game.winner).not.toBeNull()
        expect(winners(game).length).toBeGreaterThan(0)
      }),
      { numRuns: 50 },
    )
  })
})
