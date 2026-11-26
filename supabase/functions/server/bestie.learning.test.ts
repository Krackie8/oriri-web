/**
 * #71: swap (pick from 3), skip, check in again, and Bestie learning her (DEC-008).
 */
import { describe, expect, it } from 'vitest'
import {
  checkIn, swapOptions, swapSuggestion, skipSuggestion, todayPlan, personalWeight, leansWeakest,
  createMemoryBestieStore, BESTIE_ENGINE_VERSION, type DayPlan,
} from './bestie'

const MEMBER = { id: 'm1' }
const at = (date: string, hour = 5) => new Date(`${date}T${String(hour).padStart(2, '0')}:00:00Z`)
const NOV = at('2026-11-16')
// Low energy keeps Move a single-Pillar item (a Steady plan fills Move with the run club).
const GOOD = { energy: 'low', minutes: 120, budgetAed: 250 }

// m1 said yes to personalisation before these plans, so Bestie learns from her (#102: no yes, no learning).
const setup = () => createMemoryBestieStore({
  members: [{ id: 'm1', home_area: 'Dubai Marina' }, { id: 'm2', home_area: 'Deira' }],
  consents: [{ memberId: 'm1', purpose: 'personalisation', granted: true, at: '2026-10-01T00:00:00Z' }],
})
type Store = ReturnType<typeof setup>

async function plan(store: Store, input: unknown, now = NOV): Promise<DayPlan> {
  const r = await checkIn(store, MEMBER, input, now)
  if (r.outcome !== 'planned') throw new Error(`expected a plan, got ${JSON.stringify(r)}`)
  return r.plan
}
const single = (p: DayPlan, pillar: string) => p.suggestions.find((s) => s.pillars.length === 1 && s.pillars[0] === pillar)!
const row = (store: Store, id: string) => store.suggestions.find((s) => s.id === id)!

describe('swap: pick from up to three', () => {
  it('offers up to three for the same Pillar, none shown today, each fitting with the rest of the plan, the light version among them', async () => {
    const store = setup()
    const p = await plan(store, GOOD)
    const move = single(p, 'move')
    expect(move.light).toBe(false)
    const r = await swapOptions(store, MEMBER, move.id, NOV)
    if (r.outcome !== 'options') throw new Error(r.outcome)
    expect(r.options.length).toBeGreaterThan(0)
    expect(r.options.length).toBeLessThanOrEqual(3)
    const others = p.suggestions.filter((s) => s.id !== move.id)
    const usedMin = others.reduce((t, s) => t + s.minutes, 0)
    const usedAed = others.reduce((t, s) => t + s.costAed, 0)
    for (const o of r.options) {
      expect(o.pillars).toEqual(['move'])
      expect(p.suggestions.map((s) => s.slug)).not.toContain(o.slug)
      expect(usedMin + o.minutes).toBeLessThanOrEqual(120)
      expect(usedAed + o.costAed).toBeLessThanOrEqual(250)
    }
    expect(r.options.filter((o) => o.light)).toHaveLength(1)
    expect(store.suggestions).toHaveLength(p.suggestions.length) // looking writes nothing
  })

  it('records the old Suggestion swapped, the pick shown and pointing to it, and the two she passed on as not picked', async () => {
    const store = setup()
    const p = await plan(store, GOOD)
    const move = single(p, 'move')
    const r = await swapOptions(store, MEMBER, move.id, NOV)
    if (r.outcome !== 'options') throw new Error(r.outcome)
    const pick = r.options[0]
    const s = await swapSuggestion(store, MEMBER, move.id, pick.catalogueItemId, NOV)
    if (s.outcome !== 'planned') throw new Error(s.outcome)
    expect(row(store, move.id).outcome).toBe('swapped')
    const fresh = s.plan.suggestions.find((x) => x.slug === pick.slug)!
    expect(row(store, fresh.id)).toMatchObject({ outcome: 'shown', replaces_id: move.id, engine_version: BESTIE_ENGINE_VERSION })
    const passed = store.suggestions.filter((x) => x.outcome === 'not_picked')
    expect(passed).toHaveLength(r.options.length - 1)
    for (const x of passed) expect(x.replaces_id).toBe(move.id)
    expect(s.plan.suggestions).toHaveLength(p.suggestions.length)
    expect(s.plan.suggestions.map((x) => x.id)).not.toContain(move.id)
    expect((await todayPlan(store, MEMBER, NOV))!.suggestions.map((x) => x.slug)).toContain(pick.slug)
  })

  it('refuses a pick that was not offered, and writes nothing', async () => {
    const store = setup()
    const p = await plan(store, GOOD)
    const move = single(p, 'move')
    const meal = single(p, 'meal')
    expect((await swapSuggestion(store, MEMBER, move.id, `cat-${meal.slug}`, NOV)).outcome).toBe('notOffered')
    expect(store.suggestions.every((x) => x.outcome === 'shown')).toBe(true)
  })

  it('swapping again never brings back what she swapped away or passed on today', async () => {
    const store = setup()
    const p = await plan(store, GOOD)
    const move = single(p, 'move')
    const first = await swapOptions(store, MEMBER, move.id, NOV)
    if (first.outcome !== 'options') throw new Error(first.outcome)
    const s = await swapSuggestion(store, MEMBER, move.id, first.options[0].catalogueItemId, NOV)
    if (s.outcome !== 'planned') throw new Error(s.outcome)
    const now = single(s.plan, 'move')
    const second = await swapOptions(store, MEMBER, now.id, NOV)
    if (second.outcome !== 'options') throw new Error(second.outcome)
    const seen = [move.slug, ...first.options.map((o) => o.slug)]
    for (const o of second.options) expect(seen).not.toContain(o.slug)
  })

  it('a Suggestion that is not hers, or no longer open, is not found', async () => {
    const store = setup()
    const p = await plan(store, GOOD)
    const move = single(p, 'move')
    expect((await swapOptions(store, { id: 'm2' }, move.id, NOV)).outcome).toBe('notFound')
    expect((await swapOptions(store, MEMBER, 'nope', NOV)).outcome).toBe('notFound')
    await skipSuggestion(store, MEMBER, move.id, NOV)
    expect((await swapOptions(store, MEMBER, move.id, NOV)).outcome).toBe('notFound')
  })
})

describe('skip', () => {
  it('records skipped and drops it from her plan; skipping twice is not found', async () => {
    const store = setup()
    const p = await plan(store, GOOD)
    const meal = single(p, 'meal')
    const r = await skipSuggestion(store, MEMBER, meal.id, NOV)
    if (r.outcome !== 'planned') throw new Error(r.outcome)
    expect(row(store, meal.id).outcome).toBe('skipped')
    expect(r.plan.suggestions.map((s) => s.id)).not.toContain(meal.id)
    expect((await skipSuggestion(store, MEMBER, meal.id, NOV)).outcome).toBe('notFound')
    expect((await skipSuggestion(store, { id: 'm2' }, single(p, 'move').id, NOV)).outcome).toBe('notFound')
  })
})

describe('Check in twice (prototype scenario)', () => {
  it('replaces what is still open, and keeps what she completed, swapped or skipped', async () => {
    const store = setup()
    const p = await plan(store, GOOD)
    const [move, meal, mindset] = [single(p, 'move'), single(p, 'meal'), single(p, 'mindset')]
    row(store, move.id).outcome = 'completed' // Completions arrive in #72
    await skipSuggestion(store, MEMBER, meal.id, NOV)
    const opts = await swapOptions(store, MEMBER, mindset.id, NOV)
    if (opts.outcome !== 'options') throw new Error(opts.outcome)
    await swapSuggestion(store, MEMBER, mindset.id, opts.options[0].catalogueItemId, NOV)
    const second = await plan(store, { energy: 'low', minutes: 30, budgetAed: 0 }, at('2026-11-16', 9))
    expect(row(store, move.id).outcome).toBe('completed')
    expect(row(store, meal.id).outcome).toBe('skipped')
    expect(row(store, mindset.id).outcome).toBe('swapped')
    const firstOpen = store.suggestions.filter((s) => s.replaces_id === mindset.id && s.outcome !== 'not_picked')
    expect(firstOpen.map((s) => s.outcome)).toEqual(['replaced'])
    for (const s of second.suggestions) expect(row(store, s.id).outcome).toBe('shown')
    expect((await todayPlan(store, MEMBER, at('2026-11-16', 10)))!.id).toBe(second.id)
  })
})

describe('no repeats two days running', () => {
  it('nothing but a light version comes back the next day', async () => {
    for (const input of [GOOD, { energy: 'high', minutes: 240, budgetAed: 500 }, { energy: 'low', minutes: 60, budgetAed: 100, goal: 'unwind' }]) {
      const store = setup()
      const d1 = await plan(store, input, at('2026-11-16'))
      const d2 = await plan(store, input, at('2026-11-17'))
      const again = d2.suggestions.filter((s) => !s.light && d1.suggestions.some((x) => x.slug === s.slug))
      expect(again.map((s) => s.slug), JSON.stringify(input)).toEqual([])
    }
  })

  it('a replaced plan from yesterday counts too', async () => {
    const store = setup()
    const first = await plan(store, GOOD, at('2026-11-16'))
    await plan(store, { energy: 'low', minutes: 30, budgetAed: 0 }, at('2026-11-16', 9))
    const d2 = await plan(store, GOOD, at('2026-11-17'))
    for (const s of d2.suggestions.filter((x) => !x.light)) expect(first.suggestions.map((x) => x.slug)).not.toContain(s.slug)
  })
})

describe('personal weighting', () => {
  const r = (outcome: string, plan_date: string) => ({ catalogue_item_id: 'x', pillar: 'move' as const, outcome: outcome as never, plan_date })
  it('completing raises most, accepting a little, skipping or swapping lowers, fading to nothing over 30 days', () => {
    expect(personalWeight([r('completed', '2026-11-16')], 'x', '2026-11-16')).toBe(3)
    expect(personalWeight([r('accepted', '2026-11-16')], 'x', '2026-11-16')).toBe(1)
    expect(personalWeight([r('skipped', '2026-11-16')], 'x', '2026-11-16')).toBe(-2)
    expect(personalWeight([r('swapped', '2026-11-16')], 'x', '2026-11-16')).toBe(-2)
    expect(personalWeight([r('completed', '2026-11-01')], 'x', '2026-11-16')).toBeCloseTo(1.5)
    expect(personalWeight([r('completed', '2026-10-17')], 'x', '2026-11-16')).toBe(0)
    expect(personalWeight([r('shown', '2026-11-16'), r('replaced', '2026-11-16'), r('not_picked', '2026-11-16')], 'x', '2026-11-16')).toBe(0)
    expect(personalWeight([r('completed', '2026-11-16')], 'other', '2026-11-16')).toBe(0)
  })

  it('what she skipped drops out of her plan two days later', async () => {
    const skipped = setup()
    const control = setup()
    const d1 = await plan(skipped, GOOD, at('2026-11-16'))
    await plan(control, GOOD, at('2026-11-16'))
    const move = single(d1, 'move')
    await skipSuggestion(skipped, MEMBER, move.id, at('2026-11-16'))
    const a = await plan(skipped, GOOD, at('2026-11-18'))
    const c = await plan(control, GOOD, at('2026-11-18'))
    expect(a.suggestions.map((s) => s.slug)).not.toContain(move.slug)
    const cMove = c.suggestions.find((s) => s.pillars.includes('move'))!
    expect(cMove.slug === move.slug || cMove.newForYou).toBe(true)
  })
})

describe('new for you', () => {
  it('every plan has one Suggestion she has never been shown, when one fits', async () => {
    const store = setup()
    const input = { energy: 'high', minutes: 240, budgetAed: 500 }
    const d1 = await plan(store, input, at('2026-11-16'))
    expect(d1.suggestions.filter((s) => s.newForYou)).toHaveLength(1)
    const d2 = await plan(store, input, at('2026-11-18'))
    const fresh = d2.suggestions.filter((s) => s.newForYou)
    expect(fresh).toHaveLength(1)
    expect(d1.suggestions.map((s) => s.slug)).not.toContain(fresh[0].slug)
    expect(store.suggestions.filter((s) => s.is_new_for_you)).toHaveLength(2)
  })

  it('one day in three it leans towards her weakest Pillar', async () => {
    const days = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21']
    expect(days.filter(leansWeakest)).toHaveLength(2)
    const lean = days.filter(leansWeakest)[1]
    const store = setup()
    const d1 = await plan(store, GOOD, at(days[0]))
    for (const p of ['move', 'meal', 'mindset']) row(store, single(d1, p).id).outcome = 'completed'
    const p = await plan(store, { energy: 'high', minutes: 240, budgetAed: 500, goal: 'connect' }, at(lean))
    expect(p.suggestions.find((s) => s.newForYou)?.pillars).toContain('meet_up')
  })
})

describe('the engine version', () => {
  it('is bestie-4: learning only with the personalisation Consent (#102)', () => {
    expect(BESTIE_ENGINE_VERSION).toBe('bestie-4')
  })
})
