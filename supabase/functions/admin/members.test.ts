import { describe, it, expect, vi } from 'vitest'
import type { Hono } from 'hono'
import { createAdminApp, type AdminDeps } from './app'
import { toListItem, toDetail, cleanQuery, floorOf, type MembersDeps } from './members'
import { levelsFrom, statusOf, statusName, emptySums } from '../server/progress'

const ID = '11111111-2222-3333-4444-555555555555'
const noRow = {
  email: 'a@example.test', display_name: null, joined: new Date('2026-11-01T08:00:00Z'), email_confirmed: true,
  last_sign_in_at: null, banned: false, providers: [], home_area: null, instagram_handle: null, adult_confirmed: false,
  consents: {}, check_ins: '0', last_check_in: null, completions: 0, flagged: 0n, completion_days: [], sums: {}, recorded: [],
  membership_status: null,
}

function build(over: Partial<MembersDeps> = {}, user: { id: string } | null = { id: 'admin-1' }, admin = true) {
  const members: MembersDeps = {
    list: vi.fn(async () => []),
    detail: vi.fn(async () => noRow),
    adminIds: async () => ['admin-1'],
    testEmails: async () => new Set<string>(),
    now: () => new Date('2026-11-23T10:00:00Z'),
    ...over,
  }
  const deps = {
    isAdmin: async () => admin,
    userFromToken: async () => (user ? { ...user, email: 'x@example.test', signedInAt: null } : null),
    members,
  } as unknown as AdminDeps
  const app: Hono = createAdminApp(deps)
  const get = (path: string, auth = true) =>
    app.request(path, { headers: auth ? { Authorization: 'Bearer t' } : {} })
  return { members, get }
}

describe('routes', () => {
  it('401 with no token', async () => {
    const { get } = build({}, null)
    expect((await get('/admin/members', false)).status).toBe(401)
  })
  it('403 for a non-admin, list never called', async () => {
    const { get, members } = build({}, { id: 'u' }, false)
    expect((await get('/admin/members')).status).toBe(403)
    expect(members.list).not.toHaveBeenCalled()
  })
  it('lower-cases and trims q', async () => {
    const { get, members } = build()
    const res = await get('/admin/members?q=' + encodeURIComponent('  SaRa '))
    expect(res.status).toBe(200)
    expect(members.list).toHaveBeenCalledWith('sara')
  })
  it('a non-uuid id is 404 and detail is not called', async () => {
    const { get, members } = build()
    const res = await get('/admin/members/not-a-uuid')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Not found' })
    expect(members.detail).not.toHaveBeenCalled()
  })
  it('no row is 404', async () => {
    const { get } = build({ detail: async () => undefined })
    expect((await get('/admin/members/' + ID)).status).toBe(404)
  })
  it('returns the detail', async () => {
    const { get } = build()
    const res = await get('/admin/members/' + ID.toUpperCase())
    expect(res.status).toBe(200)
    expect((await res.json()).data.email).toBe('a@example.test')
  })
  it('detail throwing is a 500 with a fixed message', async () => {
    const { get } = build({ detail: async () => { throw new Error('boom a@example.test') } })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await get('/admin/members/' + ID)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ success: false, error: 'Could not load Members' })
    spy.mockRestore()
  })
  it('list throwing is a 500 with a fixed message', async () => {
    const { get } = build({ list: async () => { throw new Error('boom') } })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await get('/admin/members')
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ success: false, error: 'Could not load Members' })
    spy.mockRestore()
  })
})

describe('toListItem', () => {
  const row = { id: ID, email: 'Sara@Example.test', display_name: 'Sara Q', joined: new Date('2026-11-01T08:00:00Z'), last_sign_in_at: null }
  it('maps and ISO-formats dates', () => {
    expect(toListItem(row, new Set(), new Set())).toEqual({
      id: ID, name: 'Sara Q', email: 'Sara@Example.test', joined: '2026-11-01T08:00:00.000Z', lastSeen: null, tags: [],
    })
  })
  it('tags an admin as team', () => {
    expect(toListItem(row, new Set([ID]), new Set()).tags).toEqual(['team'])
  })
  it('tags a test email in any case as test', () => {
    expect(toListItem(row, new Set(), new Set(['sara@example.test'])).tags).toEqual(['test'])
  })
  it('an email-like name is null', () => {
    expect(toListItem({ ...row, display_name: 'x@y.test' }, new Set(), new Set()).name).toBeNull()
  })
  it('caps the name at 60 characters', () => {
    expect(toListItem({ ...row, display_name: ` ${'a'.repeat(80)} ` }, new Set(), new Set()).name).toHaveLength(60)
  })
})

describe('toDetail', () => {
  it('an empty-activity row', () => {
    const d = toDetail(noRow, ID, new Set(), new Set(), '2026-11-23')
    expect(d.bestie).toMatchObject({ checkIns: 0, done: 0, streak: 0, photosReported: 0, lastCheckIn: null })
    expect(d.membership).toBe('Free')
    expect(Object.values(d.consents).every((v) => v === null)).toBe(true)
    expect(Object.keys(d.consents).sort()).toEqual(['location', 'marketing', 'personalisation', 'push', 'terms', 'wellness_signals'])
    expect(d.account.joined).toBe('2026-11-01T08:00:00.000Z')
    expect(d.tags).toEqual([])
  })
  it('status matches the Member app for move: 30', () => {
    const sums = { ...emptySums(), move: 30 }
    const want = statusName(statusOf(levelsFrom(sums, {}), sums))
    expect(toDetail({ ...noRow, sums: { move: 30 } }, ID, new Set(), new Set(), '2026-11-23').bestie.status).toBe(want)
  })
  it('a recorded level raises the floor like the Member app', () => {
    const recorded = [{ kind: 'level', pillar: 'move', level: 3, shape: null, tier: null, reachedAt: '2026-11-22T08:00:00+00:00' }]
    const want = statusName(statusOf(levelsFrom(emptySums(), { move: 3 }), emptySums()))
    expect(toDetail({ ...noRow, recorded }, ID, new Set(), new Set(), '2026-11-23').bestie.status).toBe(want)
  })
  it('maps consents, membership, counts, streak and dates', () => {
    const d = toDetail({
      ...noRow,
      consents: { terms: true, push: false },
      membership_status: 'past_due',
      check_ins: '4', completions: '5', flagged: 1n,
      last_check_in: new Date('2026-11-22T09:00:00Z'),
      last_sign_in_at: new Date('2026-11-22T10:00:00Z'),
      completion_days: ['2026-11-22', '2026-11-23'],
      providers: ['email'],
      banned: true,
    }, ID, new Set([ID]), new Set(), '2026-11-23')
    expect(d.consents.terms).toBe(true)
    expect(d.consents.push).toBe(false)
    expect(d.consents.location).toBeNull()
    expect(d.membership).toBe('Payment overdue')
    expect(d.bestie).toMatchObject({ checkIns: 4, done: 5, photosReported: 1, streak: 2, lastCheckIn: '2026-11-22T09:00:00.000Z' })
    expect(d.account).toMatchObject({ lastSignIn: '2026-11-22T10:00:00.000Z', signsInWith: ['email'], blocked: true })
    expect(d.tags).toEqual(['team'])
  })
  it('maps every membership word', () => {
    const w = (s: string | null) => toDetail({ ...noRow, membership_status: s }, ID, new Set(), new Set(), '2026-11-23').membership
    expect([w('trialing'), w('active'), w('past_due'), w('cancelled'), w('expired'), w(null)])
      .toEqual(['Trial', 'Paying', 'Payment overdue', 'Cancelled', 'Ended', 'Free'])
  })
})

describe('floorOf (copy of server/bestie.ts)', () => {
  const r = (kind: 'level' | 'status', pillar: any, level: number | null) =>
    ({ id: 'x', kind, pillar, level, shape: null, tier: null, reachedAt: '2026-11-22T08:00:00Z' })
  it('takes the highest level row per pillar, ignoring status rows', () => {
    expect(floorOf([r('level', 'move', 2), r('level', 'move', 4), r('level', 'meal', 3), r('status', 'move', 9), r('level', null, 5), r('level', 'mindset', null)]))
      .toEqual({ move: 4, meal: 3 })
  })
})

describe('cleanQuery', () => {
  it('trims, lower-cases, caps at 100, and blanks non-strings', () => {
    expect(cleanQuery('  SaRa ')).toBe('sara')
    expect(cleanQuery('a'.repeat(150))).toHaveLength(100)
    expect(cleanQuery(undefined)).toBe('')
    expect(cleanQuery(['a'])).toBe('')
  })
})
