import { describe, expect, it } from 'vitest'
import { fromServerPlan, toServerCheckIn } from './serverPlan'
import type { ServerDayPlan } from '../functionClient'

const plan: ServerDayPlan = {
  id: 'p1', date: '2026-11-16', engineVersion: 'bestie-1',
  checkIn: { energy: 'steady', minutes: 120, budgetAed: 250, goal: 'connect', area: 'Dubai Marina' },
  suggestions: [
    { id: 's1', slug: 'runclub', title: 'Community run club', pillars: ['move', 'meet_up'], minutes: 45, costAed: 0, light: false, outdoor: true,
      energyFit: ['steady', 'high'], why: 'Counts for Move + Meet up, and it saves time. Sunset is around 5:35pm.', newForYou: false },
    { id: 's2', slug: 'brunch', title: 'Slow brunch', pillars: ['meal'], minutes: 60, costAed: 140, light: false, outdoor: false,
      energyFit: ['low', 'steady', 'high'], why: 'New for you. Easy to do with a friend.', newForYou: true },
    { id: 's3', slug: 'reachout', title: "Message a Stepsister you haven't seen", pillars: ['meet_up'], minutes: 5, costAed: 0, light: true, outdoor: false,
      energyFit: ['low', 'steady', 'high'], why: 'Short on time today, so here is a light version. It still counts.', newForYou: false },
    { id: 's4', slug: 'not-in-code', title: "Ren's new pick", pillars: ['mindset'], minutes: 20, costAed: 0, light: false, outdoor: false,
      energyFit: ['low'], why: 'You said low energy, so this one is gentle.', newForYou: false },
  ],
}

describe('fromServerPlan', () => {
  it("shows Bestie's Suggestions with their why line, places and links from the engine's option", () => {
    const p = fromServerPlan(plan)
    expect(p.items.map((i) => i.id)).toEqual(['s1', 's2', 's3', 's4'])
    const run = p.items[0]
    expect(run.label).toBe('Move + Meet up')
    expect(run.reason).toMatch(/Move \+ Meet up/)
    expect(run.venue).toMatch(/Dubai Marina/)
    expect(run.links[0]?.url).toMatch(/maps/i)
    expect(p.items[1].priceLabel).toMatch(/AED/)
    expect(p.items[1].label).toBe('Meal · new for you')
    expect(p.items[2].label).toBe('Meet up · light')
  })

  it('still shows an item Ren added without a code entry', () => {
    const ren = fromServerPlan(plan).items[3]
    expect(ren).toMatchObject({ title: "Ren's new pick", pillar: 'mindset', priceLabel: 'Free', links: [] })
  })

  it('adds up time and spend', () => {
    const p = fromServerPlan(plan)
    expect(p.minutes).toBe(130)
    expect(p.total).toBe(140)
  })
})

describe('toServerCheckIn', () => {
  it('sends her answers in Bestie\'s words, with Connect first when she picked it', () => {
    expect(toServerCheckIn({ energy: 'Low', goals: ['Glow', 'Connect'], minutes: 30, budget: 0, area: 'Deira' }))
      .toEqual({ energy: 'low', minutes: 30, budgetAed: 0, goal: 'connect', area: 'Deira' })
    expect(toServerCheckIn({ energy: 'High', goals: ['Focus'], minutes: 60, budget: 100, area: '' }))
      .toEqual({ energy: 'high', minutes: 60, budgetAed: 100, goal: 'focus' })
  })
})
