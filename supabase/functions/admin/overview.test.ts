import { describe, it, expect } from 'vitest'
import { buildOverview, visitsForDay, loadOverview, daysBefore, type OverviewKv } from './overview'

const row = { members_total: '3', members_week: 1n, members_month: 2, active_week: '1', member_emails: ['m@example.test'] }
const base = { today: '2026-11-22', dayVisits: {}, row, leadEmails: [], testEmails: new Set<string>() }

describe('buildOverview', () => {
  it('splits the 14 days ending today into week and week before', () => {
    const dayVisits: Record<string, number> = {}
    for (let i = 0; i < 7; i++) dayVisits[daysBefore('2026-11-22', i)] = 2
    for (let i = 7; i < 14; i++) dayVisits[daysBefore('2026-11-22', i)] = 1
    const o = buildOverview({ ...base, dayVisits })
    expect(o.visits.week).toBe(14)
    expect(o.visits.weekBefore).toBe(7)
  })
  it('splits 60 days into month and month before; missing days count 0', () => {
    const dayVisits: Record<string, number> = {}
    dayVisits[daysBefore('2026-11-22', 29)] = 5 // last day of this month
    dayVisits[daysBefore('2026-11-22', 30)] = 3 // first day of the month before
    dayVisits[daysBefore('2026-11-22', 59)] = 4 // last day of the month before
    dayVisits[daysBefore('2026-11-22', 60)] = 99 // out of range
    const o = buildOverview({ ...base, dayVisits })
    expect(o.visits.month).toBe(5)
    expect(o.visits.monthBefore).toBe(7)
    expect(o.visits.week).toBe(0)
  })
  it('dedupes leads across case and padding', () => {
    expect(buildOverview({ ...base, leadEmails: ['A@x.test', 'a@x.test ', 'b@x.test', '', 'nope'] }).leads).toBe(3)
  })
  it('drops a lead who is a Member, and a test-flagged lead', () => {
    const o = buildOverview({
      ...base,
      leadEmails: [' M@Example.test', 't@example.test', 'real@example.test'],
      testEmails: new Set(['t@example.test']),
    })
    expect(o.leads).toBe(1)
  })
  it('coerces counts from the driver', () => {
    expect(buildOverview(base).members).toEqual({ total: 3, week: 1, month: 2 })
    expect(buildOverview(base).activeWeek).toBe(1)
  })
  it('gives all zeros and paying null for empty input, with null member_emails', () => {
    const o = buildOverview({ today: '2026-11-22', dayVisits: {}, row: { member_emails: null, members_total: null, active_week: 'x' }, leadEmails: [], testEmails: new Set() })
    expect(o).toEqual({
      visits: { week: 0, weekBefore: 0, month: 0, monthBefore: 0 },
      members: { total: 0, week: 0, month: 0 },
      activeWeek: 0,
      leads: 0,
      paying: null,
    })
  })
})

function fakeKv(rows: Record<string, unknown>) {
  const writes: string[] = []
  const kv: OverviewKv & { set: (k: string) => void } = {
    get: async (k) => rows[k] ?? null,
    getByPrefix: async (p) => Object.entries(rows).filter(([k]) => k.startsWith(p)).map(([, v]) => v),
    set: (k) => writes.push(k),
  }
  return { kv, writes }
}

describe('visitsForDay', () => {
  it('uses sessions from a rolled day', async () => {
    const { kv } = fakeKv({ 'stats:day:2026-11-20': { sessions: 7 }, 'stats:hit:2026-11-20:a': { t: 'session' } })
    expect(await visitsForDay('2026-11-20', kv)).toBe(7)
  })
  it('counts only session hits on an unrolled day', async () => {
    const { kv } = fakeKv({
      'stats:hit:2026-11-21:a': { t: 'session' },
      'stats:hit:2026-11-21:b': { t: 'view' },
      'stats:hit:2026-11-21:c': { t: 'click' },
      'stats:hit:2026-11-21:d': { t: 'session' },
      'stats:hit:2026-11-22:e': { t: 'session' },
    })
    expect(await visitsForDay('2026-11-21', kv)).toBe(2)
  })
  it('is 0 with no rows and never writes', async () => {
    const { kv, writes } = fakeKv({})
    expect(await visitsForDay('2026-11-21', kv)).toBe(0)
    expect(writes).toEqual([])
  })
})

describe('loadOverview', () => {
  it('works on Dubai days, passes admin ids and test emails to the query, and merges lead sources', async () => {
    const { kv } = fakeKv({
      'stats:hit:2026-11-23:a': { t: 'session' }, // 20:30 UTC on the 22nd is already the 23rd in Dubai
      'stats:hit:2026-11-16:b': { t: 'session' }, // 7 days before the 23rd: in the week before, not this week
      'waitlist:bestie:u1': { email: 'w@example.test' },
      'plan:signup:s@example.test': { email: 'S@example.test' },
      'nourish:lead:n@example.test': { email: 'n@example.test' },
      'bestie:leadflag:t@example.test': { email: 't@example.test', test: true },
      'bestie:leadflag:r@example.test': { email: 'r@example.test', test: false },
    })
    let args: unknown[] = []
    const o = await loadOverview({
      kv,
      adminIds: async () => ['admin-1'],
      queryRow: async (ids, emails) => { args = [ids, emails]; return { ...row, member_emails: ['s@example.test'] } },
      now: () => new Date('2026-11-22T20:30:00Z'),
    })
    expect(args).toEqual([['admin-1'], ['t@example.test']])
    expect(o.visits.week).toBe(1) // "today" is the 23rd
    expect(o.visits.weekBefore).toBe(1)
    expect(o.leads).toBe(2) // w and n; s is a Member
  })
  it('is all zeros on empty data', async () => {
    const o = await loadOverview({ kv: fakeKv({}).kv, adminIds: async () => [], queryRow: async () => undefined })
    expect(o.visits).toEqual({ week: 0, weekBefore: 0, month: 0, monthBefore: 0 })
    expect(o.leads).toBe(0)
  })
})
