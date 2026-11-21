/**
 * #73: points, Levels, Status and the Profile (DEC-011), through the module with the in-memory store.
 */
import { describe, expect, it } from 'vitest'
import { checkIn, complete, undoCompletion, profile, createMemoryBestieStore, createMemoryPhotoStore, type DayPlan, type SuggestionView } from './bestie'

const MEMBER = { id: 'm1' }
const dubai = (hhmm: string, date = '2026-11-20') => new Date(`${date}T${hhmm}:00+04:00`)
const plus = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60_000)
const GOOD = { energy: 'low', minutes: 120, budgetAed: 250 }
const LOW30 = { energy: 'low', minutes: 30, budgetAed: 0 }

const setup = () => ({
  store: createMemoryBestieStore({ members: [{ id: 'm1', home_area: 'Dubai Marina' }] }),
  photos: createMemoryPhotoStore(),
})
type Store = ReturnType<typeof setup>['store']
async function plan(store: Store, input: unknown, now: Date): Promise<DayPlan> {
  const r = await checkIn(store, MEMBER, input, now)
  if (r.outcome !== 'planned') throw new Error(JSON.stringify(r))
  return r.plan
}
const of = (p: DayPlan, pillar: string): SuggestionView => p.suggestions.find((s) => s.pillars.includes(pillar as never))!
async function done(store: Store, s: SuggestionView, now: Date) {
  const r = await complete(store, MEMBER, s.id, s.pillars.includes('mindset') ? { reflection: 'Rest is part of it' } : {}, now)
  if (r.outcome !== 'planned') throw new Error(JSON.stringify(r))
  return r
}
const completionOf = (store: Store, suggestionId: string) => store.completions.find((c) => c.suggestion_id === suggestionId && !c.undone_at)!

describe('a Completion earns points in the ledger', () => {
  it('10 per Pillar for a normal one, 5 for a light one, and a flagged one still earns', async () => {
    const { store } = setup()
    const t = dubai('09:00')
    const p = await plan(store, GOOD, t)
    const move = of(p, 'move')
    await done(store, move, plus(t, 120))
    const c = completionOf(store, move.id)
    expect(store.points.filter((x) => x.completion_id === c.id)).toEqual([
      expect.objectContaining({ member_id: 'm1', pillar: 'move', amount: move.light ? 5 : 10, reason: 'completion' }),
    ])

    const light = await plan(store, LOW30, dubai('12:00'))
    const lightMove = light.suggestions.find((s) => s.light)!
    await done(store, lightMove, plus(dubai('12:00'), 30))
    const lc = completionOf(store, lightMove.id)
    expect(store.points.filter((x) => x.completion_id === lc.id).map((x) => x.amount)).toEqual(lightMove.pillars.map(() => 5))
  })

  it('a flagged burst still earns its points (DEC-003)', async () => {
    const { store } = setup()
    const t = dubai('09:00')
    const p = await plan(store, LOW30, t)
    for (const s of p.suggestions) await done(store, s, plus(t, 31))
    expect(store.completions.some((c) => c.flagged)).toBe(true)
    for (const c of store.completions) expect(store.points.some((x) => x.completion_id === c.id)).toBe(true)
  })
})

describe('undo writes a reversing entry', () => {
  it('one negative row per award, and completing again earns afresh', async () => {
    const { store, photos } = setup()
    const t = dubai('09:00')
    const p = await plan(store, GOOD, t)
    const move = of(p, 'move')
    await done(store, move, plus(t, 120))
    const c = completionOf(store, move.id)
    const u = await undoCompletion(store, photos, MEMBER, c.id, plus(t, 125))
    expect(u.outcome).toBe('planned')
    const rows = store.points.filter((x) => x.completion_id === c.id)
    expect(rows.map((x) => [x.reason, x.amount])).toEqual([['completion', rows[0].amount], ['undo', -rows[0].amount]])
    expect((await undoCompletion(store, photos, MEMBER, c.id, plus(t, 126))).outcome).toBe('notFound')
    expect(store.points.filter((x) => x.completion_id === c.id)).toHaveLength(2)

    await done(store, move, plus(t, 130))
    const again = completionOf(store, move.id)
    expect(again.id).not.toBe(c.id)
    expect(store.points.filter((x) => x.completion_id === again.id && x.reason === 'completion')).toHaveLength(1)
  })
})

describe('Level-ups and Status moments come back with the Completion', () => {
  it('crossing 30 points is a Level-up; changing Status is a moment; undo takes both back', async () => {
    const { store, photos } = setup()
    // 20 points of Move from an earlier week.
    store.seedPoints('m1', 'move', 20, '2026-11-10T08:00:00.000Z')
    const t = dubai('09:00')
    const p = await plan(store, GOOD, t)
    const move = of(p, 'move')
    const r = await done(store, move, plus(t, 120))
    if (r.outcome !== 'planned') throw new Error()
    expect(r.progress.levelUps).toEqual([{ pillar: 'move', level: 2 }])
    expect(r.progress.moment).toBeNull()

    // Enough Move for Level 3 makes her a Mover: a Status moment.
    store.seedPoints('m1', 'move', 50, '2026-11-11T08:00:00.000Z')
    const meal = of(p, 'meal')
    const r2 = await done(store, meal, plus(t, 180))
    expect(r2.progress.levelUps).toEqual(expect.arrayContaining([{ pillar: 'move', level: 3 }]))
    expect(r2.progress.moment).toEqual({ shape: 'move', tier: 'rising', name: 'Rising Mover' })
    expect(store.levelRows.some((x) => x.kind === 'status' && x.status_shape === 'move')).toBe(true)

    const u = await undoCompletion(store, photos, MEMBER, completionOf(store, move.id).id, plus(t, 185))
    if (u.outcome !== 'planned') throw new Error()
    expect(u.progress.moment).toBeNull()
    expect(u.progress.levelUps).toEqual([])
  })
})

describe('profile', () => {
  it('Levels, points to the next Level, Status and the 30-days-ago layer', async () => {
    const { store } = setup()
    store.seedPoints('m1', 'meal', 300, '2026-09-01T08:00:00.000Z') // before the 30-day cut-off
    store.seedPoints('m1', 'move', 40, '2026-11-15T08:00:00.000Z')
    store.seedPoints('m1', 'mindset', 30, '2026-11-15T08:00:00.000Z')
    const r = await profile(store, MEMBER, dubai('09:00'))
    if (r.outcome !== 'profile') throw new Error(r.outcome)
    expect(r.profile.levels).toEqual({ move: 2, meal: 5, mindset: 2, meet_up: 1 })
    expect(r.profile.levels30).toEqual({ move: 1, meal: 5, mindset: 1, meet_up: 1 })
    expect(r.profile.points.meal).toBe(300)
    expect(r.profile.nextAt).toEqual({ move: 80, meal: 450, mindset: 80, meet_up: 30 })
    expect(r.profile.status).toEqual({ shape: 'meal', tier: 'glowing', name: 'Glowing Clean Eater' })
  })

  it('a new Member is Rising Balanced at Level 1 everywhere', async () => {
    const { store } = setup()
    const r = await profile(store, MEMBER, dubai('09:00'))
    if (r.outcome !== 'profile') throw new Error(r.outcome)
    expect(r.profile.status.name).toBe('Rising Balanced')
    expect(r.profile.levels30).toEqual({ move: 1, meal: 1, mindset: 1, meet_up: 1 })
    expect(r.profile.moments).toEqual([])
  })

  it('lists her moments newest first, and is notJoined for a non-Member', async () => {
    const { store } = setup()
    store.levelRows.push({ id: 1, member_id: 'm1', kind: 'status', pillar: null, level: null, status_shape: 'meal', status_tier: 'glowing', reached_at: '2026-11-01T08:00:00.000Z' })
    store.levelRows.push({ id: 2, member_id: 'm1', kind: 'status', pillar: null, level: null, status_shape: 'meal+meet_up', status_tier: 'glowing', reached_at: '2026-11-10T08:00:00.000Z' })
    const r = await profile(store, MEMBER, dubai('09:00'))
    if (r.outcome !== 'profile') throw new Error(r.outcome)
    expect(r.profile.moments.map((m) => m.name)).toEqual(['Glowing Table Setter', 'Glowing Clean Eater'])
    expect((await profile(store, { id: 'nobody' }, dubai('09:00'))).outcome).toBe('notJoined')
  })
})
