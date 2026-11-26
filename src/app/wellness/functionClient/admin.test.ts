import { describe, expect, it } from 'vitest'
import { createAdminClient, teamProblem, type Overview } from './admin'
import { createCore } from './core'
import { createFakeTransport, type FakeHandler } from './fakeTransport'

const reply =
  (status: number, json: unknown): FakeHandler =>
  () => ({ status, json })

const build = (routes: Record<string, FakeHandler>) => {
  const fake = createFakeTransport(routes)
  return { fake, admin: createAdminClient(createCore(fake, async () => 'user-token')) }
}

const overview: Overview = {
  visits: { week: 10, weekBefore: 5, month: 40, monthBefore: 30 },
  members: { total: 3, week: 1, month: 2 },
  activeWeek: 2,
  leads: 4,
  paying: null,
}

describe('admin.requestLink', () => {
  it('posts the email to /sign-in-link', async () => {
    const { admin, fake } = build({ 'POST /sign-in-link': reply(200, { success: true, data: { sent: true } }) })
    expect(await admin.requestLink('ren@example.test')).toEqual({ ok: true, data: undefined })
    expect(fake.calls).toEqual([{ method: 'POST', path: '/sign-in-link', body: { email: 'ren@example.test' }, form: undefined, token: 'user-token' }])
  })

  it('passes a failure on', async () => {
    const { admin } = build({ 'POST /sign-in-link': reply(500, { success: false, error: 'x' }) })
    expect((await admin.requestLink('a@example.test')).ok).toBe(false)
  })
})

describe('admin.me', () => {
  it('reads /me', async () => {
    const { admin, fake } = build({ 'GET /me': reply(200, { success: true, data: { isAdmin: true, firstName: 'Ren' } }) })
    expect(await admin.me()).toEqual({ ok: true, data: { isAdmin: true, firstName: 'Ren' } })
    expect(fake.calls[0].path).toBe('/me')
  })

  it('a 401 is a failure the screen can read', async () => {
    const { admin } = build({ 'GET /me': reply(401, { success: false, error: 'no' }) })
    const r = await admin.me()
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.status).toBe(401)
  })
})

describe('admin.overview', () => {
  it('reads /overview', async () => {
    const { admin, fake } = build({ 'GET /overview': reply(200, { success: true, data: overview }) })
    expect(await admin.overview()).toEqual({ ok: true, data: overview })
    expect(fake.calls[0].path).toBe('/overview')
  })

  it('a 403 is a failure', async () => {
    const { admin } = build({ 'GET /overview': reply(403, { success: false, error: 'no' }) })
    expect((await admin.overview()).ok).toBe(false)
  })
})

describe('admin.members', () => {
  it('lists with the search encoded', async () => {
    const { admin, fake } = build({ 'GET /members?q=a%20b%26c': reply(200, { success: true, data: [] }) })
    expect(await admin.members('a b&c')).toEqual({ ok: true, data: [] })
    expect(fake.calls[0].method).toBe('GET')
    expect(fake.calls[0].path).toBe('/members?q=a%20b%26c')
  })

  it('an empty search still sends q=', async () => {
    const { admin, fake } = build({ 'GET /members?q=': reply(200, { success: true, data: [] }) })
    await admin.members('')
    expect(fake.calls[0].path).toBe('/members?q=')
  })
})

describe('admin.member', () => {
  it('reads one Member with the id encoded', async () => {
    const { admin, fake } = build({ 'GET /members/a%2Fb': reply(200, { success: true, data: { email: 'x@example.test' } }) })
    const r = await admin.member('a/b')
    expect(r.ok).toBe(true)
    expect(fake.calls[0].path).toBe('/members/a%2Fb')
  })
})

describe('admin.team', () => {
  it('reads /team', async () => {
    const data = { members: [], changes: [] }
    const { admin, fake } = build({ 'GET /team': reply(200, { success: true, data }) })
    expect(await admin.team()).toEqual({ ok: true, data })
    expect(fake.calls[0].method).toBe('GET')
  })
})

describe('admin.addToTeam', () => {
  it('posts the email and returns added', async () => {
    const { admin, fake } = build({ 'POST /team': reply(200, { success: true, data: { result: 'added' } }) })
    expect(await admin.addToTeam('a@example.test')).toEqual({ ok: true, data: 'added' })
    expect(fake.calls[0].body).toEqual({ email: 'a@example.test' })
  })

  it('returns already', async () => {
    const { admin } = build({ 'POST /team': reply(200, { success: true, data: { result: 'already' } }) })
    expect(await admin.addToTeam('a@example.test')).toEqual({ ok: true, data: 'already' })
  })
})

describe('admin.removeFromTeam', () => {
  it('deletes by id and returns removed', async () => {
    const { admin, fake } = build({ 'DELETE /team/u%201': reply(200, { success: true, data: { result: 'removed' } }) })
    expect(await admin.removeFromTeam('u 1')).toEqual({ ok: true, data: 'removed' })
    expect(fake.calls[0].method).toBe('DELETE')
    expect(fake.calls[0].path).toBe('/team/u%201')
  })
})

describe('teamProblem', () => {
  const problem = async (status: number, json: unknown) => {
    const { admin } = build({ 'POST /team': reply(status, json) })
    const r = await admin.addToTeam('a@example.test')
    if (r.ok) throw new Error('expected a failure')
    return teamProblem(r.error)
  }

  it('maps each known error to itself', async () => {
    expect(await problem(403, { success: false, error: 'reauth' })).toBe('reauth')
    expect(await problem(400, { error: 'invalid' })).toBe('invalid')
    expect(await problem(400, { error: 'self' })).toBe('self')
    expect(await problem(409, { error: 'last' })).toBe('last')
  })

  it('maps an unknown body to other', async () => {
    expect(await problem(500, { success: false, error: 'boom' })).toBe('other')
    expect(await problem(500, null)).toBe('other')
  })

  it('a 403 Forbidden (actor no longer admin) is other, not reauth', async () => {
    expect(await problem(403, { success: false, error: 'Forbidden' })).toBe('other')
  })

  it('an unreachable server is other', () => {
    expect(teamProblem({ status: 0, message: 'x' })).toBe('other')
  })
})

/* ── Events (#100 piece 3) ─────────────────────────────────────────────── */
import { eventProblem } from './admin'

describe('admin events calls', () => {
  const list = { upcoming: [], past: [], tile: { comingUp: 0, bookings: 0, fresh: false } }
  it('reads /events, with ?seen=1 when asked', async () => {
    const { admin, fake } = build({ 'GET /events': reply(200, { success: true, data: list }), 'GET /events?seen=1': reply(200, { success: true, data: list }) })
    expect(await admin.events()).toEqual({ ok: true, data: list })
    await admin.events({ seen: true })
    expect(fake.calls.map((c) => c.path)).toEqual(['/events', '/events?seen=1'])
  })
  it('creates, edits and deletes with the right method and path', async () => {
    const e = { id: 'abc123', title: 'T', date: '2026-11-29', pinned: false, createdAt: 'a', updatedAt: 'b' }
    const { admin, fake } = build({
      'POST /events': reply(201, { success: true, data: e }),
      'PUT /events/moment/abc123': reply(200, { success: true, data: e }),
      'DELETE /events/event/abc123': reply(200, { success: true, data: { bookingsRemoved: 2 } }),
    })
    expect(await admin.createEvent('moment', { title: 'T', date: '2026-11-29' })).toEqual({ ok: true, data: e })
    expect(fake.calls[0].body).toEqual({ kind: 'moment', title: 'T', date: '2026-11-29' })
    expect(await admin.updateEvent('moment', 'abc123', 'b', { title: 'T', date: '2026-11-29' })).toEqual({ ok: true, data: e })
    expect(fake.calls[1].body).toEqual({ updatedAt: 'b', title: 'T', date: '2026-11-29' })
    expect(await admin.deleteEvent('event', 'abc123')).toEqual({ ok: true, data: { bookingsRemoved: 2 } })
    expect(fake.calls.map((c) => `${c.method} ${c.path}`)).toEqual(['POST /events', 'PUT /events/moment/abc123', 'DELETE /events/event/abc123'])
  })
  it('reads bookings and removes one, encoding the email', async () => {
    const { admin, fake } = build({
      'GET /events/moment/abc123/bookings': reply(200, { success: true, data: [] }),
      'DELETE /events/moment/abc123/bookings/a%2Bb%40x.test': reply(200, { success: true, data: { removed: true } }),
    })
    expect(await admin.bookings('moment', 'abc123')).toEqual({ ok: true, data: [] })
    expect((await admin.removeBooking('moment', 'abc123', 'a+b@x.test')).ok).toBe(true)
    expect(fake.calls[1].path).toBe('/events/moment/abc123/bookings/a%2Bb%40x.test')
  })
  it('uploads a photo as a form', async () => {
    const { admin, fake } = build({ 'POST /events/photo': reply(200, { success: true, data: { url: 'https://x.test/p.jpg' } }) })
    expect(await admin.uploadPhoto(new Blob([new Uint8Array([0xff, 0xd8, 0xff])]))).toEqual({ ok: true, data: 'https://x.test/p.jpg' })
    expect(fake.calls[0].form).toBeInstanceOf(FormData)
    expect((fake.calls[0].form as FormData).get('file')).toBeTruthy()
  })
  it('eventProblem reads invalid, stale and anything else', () => {
    expect(eventProblem({ status: 400, message: '', details: { error: 'invalid', problem: 'Pick a date.' } })).toEqual({ kind: 'invalid', problem: 'Pick a date.' })
    expect(eventProblem({ status: 409, message: '', details: { error: 'stale' } })).toEqual({ kind: 'stale' })
    expect(eventProblem({ status: 500, message: '', details: { error: 'x' } })).toEqual({ kind: 'other' })
    expect(eventProblem({ status: 0, message: '' })).toEqual({ kind: 'other' })
  })
})
