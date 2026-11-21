import { describe, expect, it } from 'vitest'
import { momentOf, pickLine, skyHint, sunsetAt, thisWeeksMeetUp, type DailyLine, type LineContext } from './morning'
import type { StreakView } from './streak'

const streak = (s: Partial<StreakView> = {}): StreakView => ({ count: 0, todayDone: false, restUsedThisWeek: false, restDayYesterday: false, ...s })

describe('momentOf (DEC-013)', () => {
  const base = { today: '2026-12-10', joinedOn: '2026-11-01', lastDoneOn: '2026-12-09', streak: streak(), lastEnergy: null }
  it('comeback: 3 or more days away after her first week', () => {
    expect(momentOf({ ...base, lastDoneOn: '2026-12-07' })).toBe('comeback')
    expect(momentOf({ ...base, lastDoneOn: '2026-12-08' })).toBe('any')
  })
  it('comeback outranks low energy', () => {
    expect(momentOf({ ...base, lastDoneOn: '2026-12-01', lastEnergy: 'low' })).toBe('comeback')
  })
  it('never done anything after her first week is a comeback too', () => {
    expect(momentOf({ ...base, lastDoneOn: null })).toBe('comeback')
  })
  it('rest_day: yesterday was her rest day', () => {
    expect(momentOf({ ...base, lastDoneOn: '2026-12-08', streak: streak({ count: 4, restDayYesterday: true }) })).toBe('rest_day')
  })
  it('first_week: joined less than 7 days ago, even before a first tick', () => {
    expect(momentOf({ ...base, joinedOn: '2026-12-04', lastDoneOn: null })).toBe('first_week')
    expect(momentOf({ ...base, joinedOn: '2026-12-03', lastDoneOn: '2026-12-09' })).toBe('any')
  })
  it('streak: 3 days or more', () => {
    expect(momentOf({ ...base, streak: streak({ count: 3 }) })).toBe('streak')
    expect(momentOf({ ...base, streak: streak({ count: 2 }) })).toBe('any')
  })
  it('low_energy: her last Check-in was low', () => {
    expect(momentOf({ ...base, lastEnergy: 'low' })).toBe('low_energy')
  })
})

const line = (id: string, o: Partial<DailyLine> = {}): DailyLine =>
  ({ id, body: `line ${id}`, author: 'bestie', goal: null, pillar: null, energy: null, moment: 'any', showOn: null, ...o })
const ctx = (o: Partial<LineContext> = {}): LineContext =>
  ({ today: '2026-12-10', personal: true, moment: 'any', goal: null, energy: null, weakest: null, ...o })

describe('pickLine (DEC-013)', () => {
  it('a line dated today wins, even without the Consent', () => {
    const lines = [line('a'), line('b', { showOn: '2026-12-10' }), line('c', { moment: 'streak' })]
    expect(pickLine(lines, ctx({ personal: false }), [])?.id).toBe('b')
    expect(pickLine(lines, ctx({ moment: 'streak' }), [])?.id).toBe('b')
  })
  it('a line dated another day is never picked', () => {
    expect(pickLine([line('a', { showOn: '2026-12-11' })], ctx(), [])).toBeNull()
  })
  it('without the Consent only untagged "any" lines, the same for everyone that day', () => {
    const lines = [line('t', { goal: 'focus' }), line('s', { moment: 'streak' }), line('a1'), line('a2'), line('a3')]
    const pick = pickLine(lines, ctx({ personal: false, goal: 'focus', moment: 'streak' }), [])
    expect(['a1', 'a2', 'a3']).toContain(pick?.id)
    expect(pickLine([...lines].reverse(), ctx({ personal: false }), [])?.id).toBe(pick?.id)
  })
  it('the general line rotates by day', () => {
    const lines = [line('a1'), line('a2'), line('a3')]
    const days = ['2026-12-10', '2026-12-11', '2026-12-12'].map((today) => pickLine(lines, ctx({ personal: false, today }), [])?.id)
    expect(new Set(days).size).toBe(3)
  })
  it('with the Consent the best match wins: moment 4, goal 2, weakest Pillar 2, energy 1', () => {
    const lines = [line('any'), line('goal', { goal: 'focus' }), line('moment', { moment: 'streak' }), line('both', { moment: 'streak', pillar: 'meal' })]
    expect(pickLine(lines, ctx({ moment: 'streak', goal: 'focus', weakest: 'meal' }), [])?.id).toBe('both')
    expect(pickLine(lines, ctx({ goal: 'focus' }), [])?.id).toBe('goal')
  })
  it('a tag that does not match her makes the line ineligible', () => {
    const lines = [line('x', { goal: 'glow' }), line('y', { energy: 'high' }), line('z', { moment: 'comeback' })]
    expect(pickLine(lines, ctx({ goal: 'focus', energy: 'low', moment: 'streak' }), [])).toBeNull()
  })
  it('skips a line shown in the last 14 days when another fits', () => {
    const lines = [line('a'), line('b')]
    expect(pickLine(lines, ctx(), [{ lineId: 'a', shownOn: '2026-12-09' }])?.id).toBe('b')
    expect(pickLine(lines, ctx(), [{ lineId: 'b', shownOn: '2026-12-09' }])?.id).toBe('a')
  })
  it('a line shown 14 or more days ago is fresh again', () => {
    expect(pickLine([line('a'), line('b', { goal: 'focus' })], ctx({ goal: 'focus' }), [{ lineId: 'b', shownOn: '2026-11-26' }])?.id).toBe('b')
  })
  it('when every eligible line is recent, the one shown longest ago', () => {
    const lines = [line('a'), line('b'), line('c')]
    const recent = [{ lineId: 'a', shownOn: '2026-12-09' }, { lineId: 'b', shownOn: '2026-12-01' }, { lineId: 'c', shownOn: '2026-12-05' }]
    expect(pickLine(lines, ctx(), recent)?.id).toBe('b')
  })
  it('an empty bank gives null', () => {
    expect(pickLine([], ctx(), [])).toBeNull()
  })
})

const minutesOf = (s: string) => {
  const m = /^(\d{1,2}):(\d{2})(am|pm)$/.exec(s)
  if (!m) throw new Error(`bad time ${s}`)
  return ((Number(m[1]) % 12) + (m[3] === 'pm' ? 12 : 0)) * 60 + Number(m[2])
}

describe('sunsetAt: Dubai, NOAA formula', () => {
  it.each([
    ['2026-12-21', 17 * 60 + 33],
    ['2027-06-21', 19 * 60 + 13],
    // 18:00 + 19 min (55.27°E vs the 60°E zone meridian) + ~7 min equation of time + ~3.5 min refraction.
    ['2027-03-21', 18 * 60 + 30],
    ['2026-09-23', 18 * 60 + 13],
  ])('%s is within 4 minutes of the published time', (date, expected) => {
    expect(Math.abs(minutesOf(sunsetAt(date)) - expected)).toBeLessThanOrEqual(4)
  })
})

describe('skyHint', () => {
  it('in the hot season: outdoors after sunset', () => {
    const s = skyHint('2027-07-10')
    expect(s.hot).toBe(true)
    expect(s.hint).toBe(`Hot season: outdoors after sunset (${s.sunset})`)
  })
  it('in the cooler months: a good season for outdoors', () => {
    const s = skyHint('2026-12-10')
    expect(s.hot).toBe(false)
    expect(s.hint).toBe(`Good season for outdoors · sunset ${s.sunset}`)
  })
  it('never claims a forecast', () => {
    for (const d of ['2026-01-15', '2026-05-15', '2026-10-15', '2026-11-15']) {
      expect(skyHint(d).hint).not.toMatch(/today|°|degrees/i)
    }
  })
})

describe('thisWeeksMeetUp', () => {
  const today = '2026-12-10'
  it('pinned beats a sooner Stepsisters moment, which beats a sooner event', () => {
    const rows = [
      { id: 'e1', kind: 'event' as const, title: 'Event', date: '2026-12-10' },
      { id: 'm1', kind: 'moment' as const, title: 'Walk', date: '2026-12-12', startTime: '18:30', location: 'Dubai Marina' },
      { id: 'p1', kind: 'event' as const, title: 'Pinned', date: '2026-12-15', pinned: true },
    ]
    expect(thisWeeksMeetUp(rows, today)?.title).toBe('Pinned')
    expect(thisWeeksMeetUp(rows.slice(0, 2), today)).toEqual({ title: 'Walk', date: '2026-12-12', time: '6:30pm', location: 'Dubai Marina', url: null })
    expect(thisWeeksMeetUp(rows.slice(0, 1), today)?.title).toBe('Event')
  })
  it('only the next 7 days, and never a recap', () => {
    const rows = [
      { id: 'a', kind: 'moment' as const, title: 'Past', date: '2026-12-09' },
      { id: 'b', kind: 'moment' as const, title: 'Too far', date: '2026-12-17' },
      { id: 'c', kind: 'moment' as const, title: 'Recap', date: '2026-12-11', type: 'recap' },
    ]
    expect(thisWeeksMeetUp(rows, today)).toBeNull()
    expect(thisWeeksMeetUp([{ id: 'd', kind: 'moment', title: 'Last day', date: '2026-12-16' }], today)?.title).toBe('Last day')
  })
  it('skips rows with a bad date and drops a bad time', () => {
    const rows = [
      { id: 'a', kind: 'moment' as const, title: 'No date' },
      { id: 'b', kind: 'moment' as const, title: 'Bad date', date: '12/11/2026' },
      { id: 'c', kind: 'moment' as const, title: 'Number date', date: 20261211 },
      { id: 'd', kind: 'event' as const, title: 'Good', date: '2026-12-11', startTime: 'soon', link: 'https://example.com/x' },
    ]
    expect(thisWeeksMeetUp(rows, today)).toEqual({ title: 'Good', date: '2026-12-11', time: null, location: null, url: 'https://example.com/x' })
  })
  it('formats morning and noon times', () => {
    const t = (startTime: string) => thisWeeksMeetUp([{ id: 'a', kind: 'moment', title: 'x', date: today, startTime }], today)?.time
    expect(t('09:05')).toBe('9:05am')
    expect(t('12:00')).toBe('12:00pm')
    expect(t('00:30')).toBe('12:30am')
  })
  it('no rows, no Meet up', () => {
    expect(thisWeeksMeetUp([], today)).toBeNull()
  })
})
