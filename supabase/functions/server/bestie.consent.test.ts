/**
 * #102 (DEC-019): Bestie learns from her history only with her personalisation Consent, and only
 * from the Dubai day of her latest yes. The service rules (no repeats, new for you) run regardless.
 */
import { describe, expect, it } from 'vitest'
import { checkIn, swapOptions, skipSuggestion, leansWeakest, leaningPillar, createMemoryBestieStore, type DayPlan } from './bestie'

const MEMBER = { id: 'm1' }
const at = (date: string, hour = 5) => new Date(`${date}T${String(hour).padStart(2, '0')}:00:00Z`)
// Low energy keeps Move a single-Pillar item.
const GOOD = { energy: 'low', minutes: 120, budgetAed: 250 }

type Consent = { granted: boolean; at: string }
const setup = (consents: Consent[] = []) =>
  createMemoryBestieStore({
    members: [{ id: 'm1', home_area: 'Dubai Marina' }],
    consents: consents.map((c) => ({ memberId: 'm1', purpose: 'personalisation', ...c })),
  })
type Store = ReturnType<typeof setup>

async function plan(store: Store, input: unknown, now: Date): Promise<DayPlan> {
  const r = await checkIn(store, MEMBER, input, now)
  if (r.outcome !== 'planned') throw new Error(`expected a plan, got ${JSON.stringify(r)}`)
  return r.plan
}
const single = (p: DayPlan, pillar: string) => p.suggestions.find((s) => s.pillars.length === 1 && s.pillars[0] === pillar)!

/** She skips day one's Move; on day three, is it still there? (Day two would ban it as a repeat anyway.) */
async function skippedMoveComesBack(consents: Consent[]) {
  const store = setup(consents)
  const d1 = await plan(store, GOOD, at('2026-11-16'))
  const move = single(d1, 'move')
  await skipSuggestion(store, MEMBER, move.id, at('2026-11-16'))
  const d3 = await plan(store, GOOD, at('2026-11-18'))
  return { slug: move.slug, d3 }
}
/** A fresh Member's day-three plan for the same Check-in: what an unweighted Bestie gives. */
async function unweighted() {
  const store = setup()
  await plan(store, GOOD, at('2026-11-16'))
  return plan(store, GOOD, at('2026-11-18'))
}
const slugs = (p: DayPlan) => p.suggestions.map((s) => s.slug)

describe('without the personalisation Consent, her history does not weight her plan', () => {
  it('with no Consent row, a skip does not push the item down', async () => {
    const { d3 } = await skippedMoveComesBack([])
    expect(slugs(d3)).toEqual(slugs(await unweighted()))
  })

  it('with a no, the same', async () => {
    const { d3 } = await skippedMoveComesBack([{ granted: false, at: '2026-10-01T00:00:00Z' }])
    expect(slugs(d3)).toEqual(slugs(await unweighted()))
  })

  it('with a yes, the skip drops it out (learning on)', async () => {
    const { slug, d3 } = await skippedMoveComesBack([{ granted: true, at: '2026-10-01T00:00:00Z' }])
    expect(slugs(d3)).not.toContain(slug)
  })

  it('her latest row wins: yes then no is unweighted', async () => {
    const { d3 } = await skippedMoveComesBack([
      { granted: true, at: '2026-10-01T00:00:00Z' },
      { granted: false, at: '2026-10-05T00:00:00Z' },
    ])
    expect(slugs(d3)).toEqual(slugs(await unweighted()))
  })

  it('a withdrawal takes effect on her next Check-in', async () => {
    const store = setup([{ granted: true, at: '2026-10-01T00:00:00Z' }])
    const d1 = await plan(store, GOOD, at('2026-11-16'))
    await skipSuggestion(store, MEMBER, single(d1, 'move').id, at('2026-11-16'))
    store.consents.push({ memberId: 'm1', purpose: 'personalisation', granted: false, at: '2026-11-17T10:00:00Z' })
    expect(slugs(await plan(store, GOOD, at('2026-11-18')))).toEqual(slugs(await unweighted()))
  })
})

describe('only outcomes from the day of her latest yes count', () => {
  it('a skip from before her yes is not learned from', async () => {
    const { d3 } = await skippedMoveComesBack([
      { granted: false, at: '2026-10-01T00:00:00Z' },
      { granted: true, at: '2026-11-17T06:00:00Z' },
    ])
    expect(slugs(d3)).toEqual(slugs(await unweighted()))
  })

  it('a skip on the Dubai day of her yes is learned from', async () => {
    // 2026-11-15 21:00 UTC is 2026-11-16 01:00 in Dubai: the day of the plan she skipped from.
    const { slug, d3 } = await skippedMoveComesBack([{ granted: true, at: '2026-11-15T21:00:00Z' }])
    expect(slugs(d3)).not.toContain(slug)
  })
})

describe('the service rules run without the Consent', () => {
  it('nothing but a light version comes back the next day', async () => {
    const store = setup()
    const d1 = await plan(store, GOOD, at('2026-11-16'))
    const d2 = await plan(store, GOOD, at('2026-11-17'))
    const again = d2.suggestions.filter((s) => !s.light && d1.suggestions.some((x) => x.slug === s.slug))
    expect(again).toEqual([])
  })

  it('one Suggestion is new for her, when one fits', async () => {
    const store = setup()
    const input = { energy: 'high', minutes: 240, budgetAed: 500 }
    const d1 = await plan(store, input, at('2026-11-16'))
    const d3 = await plan(store, input, at('2026-11-18'))
    const fresh = d3.suggestions.filter((s) => s.newForYou)
    expect(fresh).toHaveLength(1)
    expect(slugs(d1)).not.toContain(fresh[0].slug)
  })
})

describe('the weakest-Pillar lean needs the Consent', () => {
  const days = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21']
  const leaning = days.filter(leansWeakest)
  const plain = days.find((d) => !leansWeakest(d))!
  // She has completed Move, Meal and Mindset lately, never Meet up.
  const done = (['move', 'meal', 'mindset'] as const).map((pillar) => ({ catalogue_item_id: `x-${pillar}`, pillar, outcome: 'completed' as never, plan_date: '2026-11-15' }))

  it('with the Consent, a leaning day leans to her weakest Pillar', () => {
    for (const d of leaning) expect(leaningPillar(done, d)).toBe('meet_up')
    expect(leaningPillar(done, plain)).toBeNull()
  })

  it('without it, no day leans', () => {
    for (const d of days) expect(leaningPillar(null, d)).toBeNull()
  })

  it('Check-in passes null without a yes: a plan on a leaning day lands as if she had completed nothing', async () => {
    async function fresh(complete: boolean) {
      const store = setup()
      const d1 = await plan(store, { energy: 'steady', minutes: 60, budgetAed: 0 }, at(days[0]))
      if (complete) for (const s of d1.suggestions) store.suggestions.find((x) => x.id === s.id)!.outcome = 'completed'
      return slugs(await plan(store, { energy: 'high', minutes: 240, budgetAed: 500, goal: 'connect' }, at(leaning[1])))
    }
    expect(await fresh(true)).toEqual(await fresh(false))
  })
})

describe('swap options', () => {
  it('without the Consent, are ranked as for a Member with no history', async () => {
    // Day one she skips Meal and swaps away Move; on day three, swap her Move.
    async function dayThreeOptions(store: Store, act: boolean) {
      const d1 = await plan(store, GOOD, at('2026-11-16'))
      if (act) {
        await skipSuggestion(store, MEMBER, single(d1, 'meal').id, at('2026-11-16'))
        await skipSuggestion(store, MEMBER, single(d1, 'mindset').id, at('2026-11-16'))
      }
      const d3 = await plan(store, GOOD, at('2026-11-18'))
      const r = await swapOptions(store, MEMBER, single(d3, 'meal').id, at('2026-11-18'))
      if (r.outcome !== 'options') throw new Error(r.outcome)
      return r.options.map((o) => o.slug)
    }
    const yes = await dayThreeOptions(setup([{ granted: true, at: '2026-10-01T00:00:00Z' }]), true)
    const none = await dayThreeOptions(setup(), true)
    const fresh = await dayThreeOptions(setup(), false)
    expect(none).toEqual(fresh)
    expect(yes).not.toEqual(fresh) // the fixture moves the options when learning is on
  })
})
