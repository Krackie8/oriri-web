import { describe, expect, it } from 'vitest'
import { streakOf, weekStart } from './streak'

// 2026-11-23 is a Monday.
describe('streakOf (DEC-013)', () => {
  describe('Streak and the rest day (prototype scenario)', () => {
    const done = ['2026-11-23', '2026-11-24']
    it('day 2: two days, today done', () => {
      expect(streakOf(done, '2026-11-24')).toEqual({ count: 2, todayDone: true, restUsedThisWeek: false, restDayYesterday: false })
    })
    it('day 3 before her first tick: today is never a missed day', () => {
      expect(streakOf(done, '2026-11-25')).toEqual({ count: 2, todayDone: false, restUsedThisWeek: false, restDayYesterday: false })
    })
    it('day 3 missed: the free rest day keeps the Streak', () => {
      expect(streakOf(done, '2026-11-26')).toEqual({ count: 2, todayDone: false, restUsedThisWeek: true, restDayYesterday: true })
    })
    it('day 4 missed too: the Streak resets', () => {
      expect(streakOf(done, '2026-11-27')).toEqual({ count: 0, todayDone: false, restUsedThisWeek: false, restDayYesterday: false })
    })
  })

  it('a rest day does not carry over: Sunday uses last week, Monday uses this week', () => {
    const s = streakOf(['2026-11-27', '2026-11-28'], '2026-12-01')
    expect(s.count).toBe(2)
    expect(s.restUsedThisWeek).toBe(true)
  })

  it('only the first missed day in a week is forgiven', () => {
    expect(streakOf(['2026-11-23', '2026-11-26'], '2026-11-27').count).toBe(1)
  })

  it('nothing yet', () => {
    expect(streakOf([], '2026-11-25')).toEqual({ count: 0, todayDone: false, restUsedThisWeek: false, restDayYesterday: false })
  })

  it('a missed day before her first Completion is not a rest day', () => {
    expect(streakOf(['2026-11-25'], '2026-11-25')).toEqual({ count: 1, todayDone: true, restUsedThisWeek: false, restDayYesterday: false })
  })

  it('repeated dates count once', () => {
    expect(streakOf(['2026-11-24', '2026-11-24', '2026-11-23'], '2026-11-24').count).toBe(2)
  })

  it('weekStart is the Monday', () => {
    expect(weekStart('2026-11-23')).toBe('2026-11-23')
    expect(weekStart('2026-11-29')).toBe('2026-11-23')
    expect(weekStart('2026-11-30')).toBe('2026-11-30')
  })
})
