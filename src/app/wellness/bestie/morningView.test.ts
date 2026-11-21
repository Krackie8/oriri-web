import { describe, expect, it } from 'vitest'
import { isWrapUpTime, streakLine, wrapUpView } from './morningView'
import type { DayPlan, Suggestion } from '../functionClient/bestie'

const streak = (count: number, restUsedThisWeek = false) => ({ count, todayDone: false, restUsedThisWeek, restDayYesterday: false })
const dubai = (hhmm: string, date = '2026-11-24') => new Date(`${date}T${hhmm}:00+04:00`)

describe('streakLine (DEC-013)', () => {
  it('reads as a count with the rest day', () => {
    expect(streakLine(streak(5))).toBe('5-day Streak · rest day available')
    expect(streakLine(streak(5, true))).toBe('5-day Streak · rest day used, Streak kept')
    expect(streakLine(streak(1))).toBe('1-day Streak · rest day available')
  })
  it('never scolds when it ends', () => {
    expect(streakLine(streak(0))).toBe("New Streak starts with today's first tick")
  })
})

describe('isWrapUpTime: from 18:00 to midnight, Dubai time', () => {
  it.each([['17:59', false], ['18:00', true], ['23:59', true], ['00:00', false], ['09:00', false]] as const)('%s → %s', (t, open) => {
    expect(isWrapUpTime(dubai(t))).toBe(open)
  })
})

const s = (id: string, done: boolean, readyAt = '2026-11-24T05:00:00.000Z'): Suggestion => ({
  id, slug: id, title: id, pillars: ['move'], minutes: 30, costAed: 0, light: false, outdoor: false, energyFit: ['low'],
  why: '', newForYou: false, readyAt, done: done ? { completionId: `c-${id}`, at: '2026-11-24T10:00:00Z' } : null,
})
const plan = (suggestions: Suggestion[]): DayPlan => ({
  id: 'p', date: '2026-11-24', engineVersion: 'bestie-3', checkIn: { energy: 'low', minutes: 120, budgetAed: 0, goal: null, area: 'Deira' }, suggestions,
})

describe('wrapUpView', () => {
  it('splits open from done and counts them', () => {
    const v = wrapUpView(plan([s('a', true), s('b', false), s('c', true), s('d', true)]).suggestions, (x) => !!x.done)
    expect(v.open.map((x) => x.id)).toEqual(['b'])
    expect(v.done.map((x) => x.id)).toEqual(['a', 'c', 'd'])
    expect(v.summary).toBe('3 of 4 done')
  })
  it('nothing ticked yet', () => {
    expect(wrapUpView(plan([s('a', false), s('b', false)]).suggestions, (x) => !!x.done).summary).toBe('0 of 2 done')
  })
})
