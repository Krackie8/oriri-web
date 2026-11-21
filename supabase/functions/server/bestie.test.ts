import { describe, expect, it } from 'vitest'
import { checkIn, todayPlan, createMemoryBestieStore, BESTIE_ENGINE_VERSION, type DayPlan } from './bestie'
import { sunsetAt } from './morning'

const MEMBER = { id: 'm1' }
const NOV = new Date('2026-11-16T05:00:00Z') // 09:00 in Dubai, cool season
const JULY = new Date('2026-07-10T05:00:00Z') // hot season

function setup() {
  const store = createMemoryBestieStore({ members: [{ id: 'm1', home_area: 'Dubai Marina' }] })
  return store
}

async function plan(store: ReturnType<typeof setup>, input: unknown, now = NOV): Promise<DayPlan> {
  const r = await checkIn(store, MEMBER, input, now)
  if (r.outcome !== 'planned') throw new Error(`expected a plan, got ${JSON.stringify(r)}`)
  return r.plan
}

const pillarsOf = (p: DayPlan) => p.suggestions.flatMap((s) => s.pillars).sort()
// Light versions count too: the whole plan fits her time.
const fullMinutes = (p: DayPlan) => p.suggestions.reduce((t, s) => t + s.minutes, 0)
const totalCost = (p: DayPlan) => p.suggestions.reduce((t, s) => t + s.costAed, 0)

describe('A good day (Steady, 2 hours, AED 250)', () => {
  it('covers all four Pillars once, fitting her time and budget together', async () => {
    const p = await plan(setup(), { energy: 'steady', minutes: 120, budgetAed: 250 })
    expect(pillarsOf(p)).toEqual(['meal', 'meet_up', 'mindset', 'move'])
    expect(fullMinutes(p)).toBeLessThanOrEqual(120)
    expect(totalCost(p)).toBeLessThanOrEqual(250)
    expect(p.suggestions.some((s) => !s.light && s.costAed > 0)).toBe(true) // her budget gets used
    for (const s of p.suggestions) expect(s.why.length).toBeGreaterThan(10)
  })

  it('records the Check-in and every Suggestion as shown, with the engine version, before she sees it', async () => {
    const store = setup()
    const p = await plan(store, { energy: 'steady', minutes: 120, budgetAed: 250 })
    expect(store.checkIns).toHaveLength(1)
    expect(store.checkIns[0]).toMatchObject({ member_id: 'm1', energy: 'steady', time_min: 120, budget_aed: 250, area: 'Dubai Marina', city: 'dubai' })
    expect(store.suggestions.map((s) => s.id).sort()).toEqual(p.suggestions.map((s) => s.id).sort())
    for (const s of store.suggestions) {
      expect(s.outcome).toBe('shown')
      expect(s.engine_version).toBe(BESTIE_ENGINE_VERSION)
      expect(s.reason).toBeTruthy()
    }
    expect(BESTIE_ENGINE_VERSION).toBe('bestie-3')
  })
})

describe('Only 30 minutes (Low, 30 min, free)', () => {
  it('still touches all four Pillars, with light versions for what does not fit', async () => {
    const p = await plan(setup(), { energy: 'low', minutes: 30, budgetAed: 0 })
    expect(pillarsOf(p)).toEqual(['meal', 'meet_up', 'mindset', 'move'])
    expect(fullMinutes(p)).toBeLessThanOrEqual(30)
    expect(totalCost(p)).toBe(0)
    const meetUp = p.suggestions.find((s) => s.pillars.includes('meet_up'))!
    expect(meetUp.light).toBe(true)
    expect(meetUp.slug).toBe('reachout')
    expect(meetUp.why).toMatch(/light version/i)
  })

  it('says why a Suggestion is gentle when she is low on energy', async () => {
    const p = await plan(setup(), { energy: 'low', minutes: 30, budgetAed: 0 })
    expect(p.suggestions.filter((s) => !s.light).some((s) => /low energy/i.test(s.why))).toBe(true)
  })
})

describe('fitting across energy x time x budget', () => {
  const energies = ['low', 'steady', 'high']
  const times = [30, 60, 120, 240]
  const budgets = [0, 100, 250, 500]
  it('never leaves a Pillar empty and never runs over her time or budget', async () => {
    for (const energy of energies)
      for (const minutes of times)
        for (const budgetAed of budgets) {
          const p = await plan(setup(), { energy, minutes, budgetAed })
          const label = `${energy}/${minutes}/${budgetAed}`
          expect(pillarsOf(p), label).toEqual(['meal', 'meet_up', 'mindset', 'move'])
          expect(fullMinutes(p), label).toBeLessThanOrEqual(minutes)
          expect(totalCost(p), label).toBeLessThanOrEqual(budgetAed)
          expect(p.suggestions.every((s) => s.energyFit.includes(energy as never)), label).toBe(true)
        }
  })
})

describe('two-Pillar items', () => {
  it('a run club fills Move and Meet up as one Suggestion, and says so', async () => {
    const p = await plan(setup(), { energy: 'high', minutes: 120, budgetAed: 0, goal: 'connect' })
    const run = p.suggestions.find((s) => s.slug === 'runclub')
    expect(run?.pillars.sort()).toEqual(['meet_up', 'move'])
    expect(run?.why).toMatch(/Move \+ Meet up/)
    expect(p.suggestions).toHaveLength(3)
    expect(pillarsOf(p)).toEqual(['meal', 'meet_up', 'mindset', 'move'])
  })
})

describe('Dubai heat and sunset', () => {
  it('in the cool months an outdoor Suggestion names the sunset time', async () => {
    const p = await plan(setup(), { energy: 'low', minutes: 60, budgetAed: 0 })
    const outdoor = p.suggestions.find((s) => s.outdoor)!
    expect(outdoor).toBeTruthy()
    expect(outdoor.why).toContain(`Sunset is around ${sunsetAt('2026-11-16')}.`) // the NOAA time (DEC-013)
  })

  it('in the hot months outdoor is still allowed when nothing indoor fits, timed after sunset', async () => {
    const p = await plan(setup(), { energy: 'low', minutes: 60, budgetAed: 0 }, JULY)
    const outdoor = p.suggestions.find((s) => s.outdoor)!
    expect(outdoor.why).toContain(`Go after the ${sunsetAt('2026-07-10')} sunset`)
  })

  it('in the hot months an indoor Move beats an outdoor one that fits as well', async () => {
    const cool = await plan(setup(), { energy: 'high', minutes: 120, budgetAed: 0, goal: 'connect' })
    expect(cool.suggestions.find((s) => s.pillars.includes('move'))?.outdoor).toBe(true)
    const hot = await plan(setup(), { energy: 'high', minutes: 120, budgetAed: 0, goal: 'connect' }, JULY)
    expect(hot.suggestions.find((s) => s.pillars.includes('move'))?.outdoor).toBe(false)
  })
})

describe('the plan day and checking in again', () => {
  it('uses the Dubai date: 01:30 in Dubai is the new day', async () => {
    const p = await plan(setup(), { energy: 'steady', minutes: 60, budgetAed: 0 }, new Date('2026-11-16T21:30:00Z'))
    expect(p.date).toBe('2026-11-17')
  })

  it('checking in again replaces today\'s plan and marks its Suggestions replaced', async () => {
    const store = setup()
    const first = await plan(store, { energy: 'steady', minutes: 120, budgetAed: 250 })
    const second = await plan(store, { energy: 'low', minutes: 30, budgetAed: 0 }, new Date(NOV.getTime() + 3600_000))
    for (const s of store.suggestions.filter((x) => first.suggestions.some((f) => f.id === x.id))) expect(s.outcome).toBe('replaced')
    for (const s of store.suggestions.filter((x) => second.suggestions.some((f) => f.id === x.id))) expect(s.outcome).toBe('shown')
    const today = await todayPlan(store, MEMBER, new Date(NOV.getTime() + 7200_000))
    expect(today?.id).toBe(second.id)
  })

  it('has no plan for a day she has not checked in', async () => {
    const store = setup()
    await plan(store, { energy: 'steady', minutes: 60, budgetAed: 0 })
    expect(await todayPlan(store, MEMBER, new Date('2026-11-17T05:00:00Z'))).toBeNull()
  })
})

describe('the Check-in itself', () => {
  it('uses her Home area unless she picks another from the list', async () => {
    const store = setup()
    expect((await plan(store, { energy: 'low', minutes: 30, budgetAed: 0 })).checkIn.area).toBe('Dubai Marina')
    expect((await plan(store, { energy: 'low', minutes: 30, budgetAed: 0, area: 'Deira' })).checkIn.area).toBe('Deira')
  })

  it('refuses what it cannot plan from, and records nothing', async () => {
    const store = setup()
    const bad = [
      {},
      { energy: 'tired', minutes: 30, budgetAed: 0 },
      { energy: 'low', minutes: 0, budgetAed: 0 },
      { energy: 'low', minutes: 25, budgetAed: 0 }, // under 30 minutes, not every Pillar fits
      { energy: 'low', minutes: 30.5, budgetAed: 0 },
      { energy: 'low', minutes: 30, budgetAed: -1 },
      { energy: 'low', minutes: 30, budgetAed: 0, goal: 'win' },
      { energy: 'low', minutes: 30, budgetAed: 0, area: 'Mars' },
    ]
    for (const input of bad) expect((await checkIn(store, MEMBER, input, NOV)).outcome, JSON.stringify(input)).toBe('invalid')
    expect(store.checkIns).toHaveLength(0)
  })

  it('a signed-in woman who has not joined gets no plan', async () => {
    const r = await checkIn(setup(), { id: 'stranger' }, { energy: 'low', minutes: 30, budgetAed: 0 }, NOV)
    expect(r.outcome).toBe('notJoined')
  })
})

describe('the why line of a light version', () => {
  it('does not blame her time when she has plenty of it', async () => {
    const p = await plan(setup(), { energy: 'low', minutes: 240, budgetAed: 0 })
    const light = p.suggestions.find((s) => s.light)!
    expect(light).toBeTruthy()
    expect(light.why).not.toMatch(/short on time/i)
    expect(light.why).toMatch(/light version/i)
  })

  it('names her time when time is what ran out', async () => {
    const p = await plan(setup(), { energy: 'low', minutes: 30, budgetAed: 0 })
    expect(p.suggestions.filter((s) => s.light).some((s) => /short on time/i.test(s.why))).toBe(true)
  })
})
