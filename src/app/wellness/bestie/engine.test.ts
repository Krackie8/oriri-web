import { describe, expect, it } from 'vitest'
import { buildPlan, swapItem, type Energy, type PlanInputs } from '@/wellness/bestie/engine'

// A fixed date keeps Dubai heat and sunset timing deterministic (January: not a hot month).
const WINTER = new Date('2026-01-15T09:00:00+04:00')
const base: PlanInputs = { energy: 'Steady', goals: [], minutes: 120, budget: 250, area: 'Downtown Dubai' }
const plan = (over: Partial<PlanInputs> = {}) => buildPlan({ ...base, ...over }, WINTER)

const ENERGIES: Energy[] = ['Low', 'Steady', 'High']
const DURATIONS = [30, 60, 120, 240, 480]
const WORKOUTS = ['matpilates', 'runclub', 'hotclass', 'reformer', 'strength', 'swim']
/** Top of an item's shown price range, e.g. "AED 90–140" → 140; "Free" → 0. */
const topPrice = (label: string) => (label === 'Free' ? 0 : Number(label.split('–')[1]))

describe('buildPlan: energy', () => {
  it('never suggests a workout when energy is Low (the lowest energy)', () => {
    for (const minutes of DURATIONS) {
      const ids = plan({ energy: 'Low', minutes }).items.map((x) => x.id)
      for (const workout of WORKOUTS) expect(ids).not.toContain(workout)
    }
  })

  it('always gives a Move, a Meal and a Mindset item', () => {
    for (const energy of ENERGIES)
      for (const minutes of DURATIONS) {
        const pillars = plan({ energy, minutes }).items.map((x) => x.pillar)
        expect(pillars).toEqual(expect.arrayContaining(['move', 'meal', 'mindset']))
      }
  })
})

describe('buildPlan: budget', () => {
  it('with a zero budget, everything is free', () => {
    for (const energy of ENERGIES)
      for (const minutes of DURATIONS) {
        const p = plan({ energy, minutes, budget: 0 })
        expect(p.total).toBe(0)
        expect(p.totalLabel).toBe('Free')
        for (const item of p.items) {
          expect(item.cost).toBe(0)
          expect(item.priceLabel).toBe('Free')
        }
      }
  })

  it('treats a negative budget as zero', () => {
    expect(plan({ budget: -50 }).totalLabel).toBe('Free')
  })

  it('never goes over budget, even at the top of every price range', () => {
    for (const budget of [50, 100, 250, 500, 1000])
      for (const energy of ENERGIES)
        for (const minutes of DURATIONS) {
          const items = plan({ energy, minutes, budget }).items
          expect(items.reduce((s, x) => s + topPrice(x.priceLabel), 0)).toBeLessThanOrEqual(budget)
        }
  })

  it('uses a generous budget for at least one paid pick', () => {
    expect(plan({ minutes: 240, budget: 1000 }).total).toBeGreaterThan(0)
  })
})

describe('buildPlan: time', () => {
  it('fills exactly the time she has', () => {
    for (const energy of ENERGIES)
      for (const minutes of DURATIONS) {
        const p = plan({ energy, minutes })
        expect(p.minutes).toBe(minutes)
        expect(p.items.reduce((s, x) => s + x.minutes, 0)).toBe(minutes)
      }
  })

  it('stretches anything shorter than 30 minutes to a 30-minute plan', () => {
    expect(plan({ minutes: 10 }).minutes).toBe(30)
    expect(plan({ minutes: 0 }).minutes).toBe(30)
  })

  it('keeps a short (30 min) day to Move, Meal and Mindset, with no paid picks', () => {
    for (const energy of ENERGIES) {
      const p = plan({ energy, minutes: 30, budget: 1000 })
      expect(p.items.filter((x) => x.id !== 'rest').map((x) => x.pillar).sort()).toEqual(['meal', 'mindset', 'move'])
      expect(p.total).toBe(0)
    }
  })
})

describe('buildPlan: goals', () => {
  it('adds a Meet up on a half day only when she picks Connect', () => {
    expect(plan({ minutes: 240, goals: ['Connect'] }).items.map((x) => x.pillar)).toContain('meetup')
    expect(plan({ minutes: 240, goals: ['Unwind'] }).items.map((x) => x.pillar)).not.toContain('meetup')
  })
})

describe('buildPlan: determinism', () => {
  it('gives the same plan for the same inputs and date', () => {
    expect(plan({ minutes: 240, goals: ['Glow'] })).toEqual(plan({ minutes: 240, goals: ['Glow'] }))
  })
})

describe('swapItem', () => {
  it('replaces one pick with a different one in the same Pillar, keeping time and budget', () => {
    const inputs = { ...base, minutes: 240 }
    const before = buildPlan(inputs, WINTER)
    const move = before.items.find((x) => x.pillar === 'move')!
    const after = swapItem(inputs, before, move.id, [], WINTER)!
    expect(after).not.toBeNull()
    const ids = after.items.map((x) => x.id)
    expect(ids).not.toContain(move.id)
    expect(after.items.filter((x) => x.pillar === 'move').length).toBeGreaterThan(0)
    expect(after.minutes).toBe(240)
    expect(after.items.reduce((s, x) => s + topPrice(x.priceLabel), 0)).toBeLessThanOrEqual(inputs.budget)
  })

  it('returns null when nothing else fits', () => {
    const inputs: PlanInputs = { ...base, minutes: 240, goals: ['Connect'] }
    const before = buildPlan(inputs, WINTER)
    // Stepsisters is the only Meet up, so there is nothing to swap it for.
    expect(before.items.map((x) => x.id)).toContain('stepsisters')
    expect(swapItem(inputs, before, 'stepsisters', [], WINTER)).toBeNull()
  })

  it('returns null for an id that is not in the plan', () => {
    expect(swapItem(base, plan(), 'not-an-item', [], WINTER)).toBeNull()
  })
})
