import { describe, it, expect, vi } from 'vitest'
import { createAdminApp, type AdminDeps } from './app'
import type { EventKind, EventsDeps, StoredEvent } from './events'

const BASE = 'https://proj.supabase.co/storage/v1/object/public/make-a278ea32-wellness/'
const NOW = new Date('2026-11-26T08:00:00Z')
const ME = '00000000-0000-0000-0000-00000000a001'
const PREFIX: Record<EventKind, string> = { moment: 'wellness:moment:', event: 'wellness:event:' }

function build(opts: { admin?: boolean; user?: boolean } = {}) {
  const kv = new Map<string, unknown>()
  const logs: unknown[] = []
  let seen: string | null = null
  let clock = NOW.getTime()
  const events: EventsDeps = {
    list: vi.fn(async (kind: EventKind) => [...kv].filter(([k]) => k.startsWith(PREFIX[kind])).map(([, v]) => v as StoredEvent)),
    get: vi.fn(async (kind: EventKind, id: string) => (kv.get(PREFIX[kind] + id) as StoredEvent | undefined) ?? null),
    put: vi.fn(async (kind: EventKind, e: StoredEvent) => { kv.set(PREFIX[kind] + e.id, e) }),
    remove: vi.fn(async (kind: EventKind, id: string) => { kv.delete(PREFIX[kind] + id) }),
    rsvps: vi.fn(async (prefix: string) => [...kv].filter(([k]) => k.startsWith(prefix)).map(([, v]) => v)),
    removeRsvps: vi.fn(async (keys: string[]) => { for (const k of keys) kv.delete(k) }),
    upload: vi.fn(async () => `${BASE}admin/1-abcd1234.jpg`),
    log: vi.fn(async (entry) => { logs.push(entry) }),
    seenAt: vi.fn(async () => seen),
    markSeen: vi.fn(async (_id: string, at: string) => { seen = at }),
    photoBase: BASE,
    now: () => new Date(clock),
  }
  const deps = {
    isAdmin: async () => opts.admin ?? true,
    userFromToken: async () => (opts.user === false ? null : { id: ME, email: 'khairul@example.test', signedInAt: null }),
    events,
  } as unknown as AdminDeps
  const app = createAdminApp(deps)
  const call = (method: string, path: string, body?: unknown, auth = true) =>
    app.request(path, {
      method,
      headers: { ...(auth ? { Authorization: 'Bearer t' } : {}), ...(body === undefined || body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    })
  const json = async (r: Response) => (await r.json()) as any
  const tick = () => { clock += 1000 }
  const rsvp = (ref: string, email: string) => kv.set(`rsvp:${ref}:${email.toLowerCase()}`, { ref, email: email.toLowerCase(), name: 'Ana', phone: '+971', guests: 2, bookedAt: '2026-11-25T10:00:00Z' })
  return { kv, logs, events, call, json, tick, rsvp }
}

const MEETUP = { kind: 'moment', title: 'Sunset walk', date: '2026-11-29', startTime: '17:30' }
const ID = '3f2b9c1e-0000-4000-8000-000000000001'

describe('the guards', () => {
  const routes: [string, string, unknown][] = [
    ['GET', '/admin/events', undefined],
    ['POST', '/admin/events', MEETUP],
    ['PUT', `/admin/events/moment/${ID}`, { ...MEETUP, updatedAt: 'x' }],
    ['DELETE', `/admin/events/moment/${ID}`, undefined],
    ['GET', `/admin/events/moment/${ID}/bookings`, undefined],
    ['DELETE', `/admin/events/moment/${ID}/bookings/a%40example.test`, undefined],
    ['POST', '/admin/events/photo', new FormData()],
  ]
  it.each(routes)('%s %s is 401 with no token and 403 for a non-admin, touching nothing', async (method, path, body) => {
    const anon = build({ user: false })
    expect((await anon.call(method, path, body, false)).status).toBe(401)
    const member = build({ admin: false })
    expect((await member.call(method, path, body)).status).toBe(403)
    for (const b of [anon, member]) {
      for (const f of ['list', 'put', 'remove', 'removeRsvps', 'upload', 'markSeen'] as const) expect(b.events[f]).not.toHaveBeenCalled()
    }
  })
})

describe('create, list, edit', () => {
  it('creates a meet-up and lists it with its Meet up mark', async () => {
    const { call, json, logs } = build()
    const r = await call('POST', '/admin/events', MEETUP)
    expect(r.status).toBe(201)
    const made = (await json(r)).data
    expect(made).toMatchObject({ title: 'Sunset walk', date: '2026-11-29', startTime: '17:30', type: 'upcoming', pinned: false, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() })
    expect(made.id).toMatch(/^[0-9a-f-]{36}$/)
    const list = (await json(await call('GET', '/admin/events'))).data
    expect(list.upcoming).toHaveLength(1)
    expect(list.upcoming[0]).toMatchObject({ id: made.id, kind: 'moment', inMeetUp: true, bookings: 0 })
    expect(logs).toEqual([{ actor: ME, kind: 'moment', id: made.id, action: 'create' }])
  })

  it('refuses a bad kind, and a bad field with its wording', async () => {
    const { call, json, events } = build()
    expect((await call('POST', '/admin/events', { ...MEETUP, kind: 'party' })).status).toBe(400)
    const r = await call('POST', '/admin/events', { ...MEETUP, link: 'javascript:alert(1)' })
    expect(r.status).toBe(400)
    expect(await json(r)).toEqual({ error: 'invalid', problem: 'Links must start with https://' })
    expect(events.put).not.toHaveBeenCalled()
  })

  it('edits keep the id and createdAt; a stale edit is refused and the first one stays', async () => {
    const { call, json, tick, kv } = build()
    const made = (await json(await call('POST', '/admin/events', MEETUP))).data
    tick()
    const first = await call('PUT', `/admin/events/moment/${made.id}`, { ...MEETUP, title: 'Ren’s version', updatedAt: made.updatedAt })
    expect(first.status).toBe(200)
    const edited = (await json(first)).data
    expect(edited).toMatchObject({ id: made.id, createdAt: made.createdAt, title: 'Ren’s version' })
    expect(edited.updatedAt).not.toBe(made.updatedAt)
    tick()
    const second = await call('PUT', `/admin/events/moment/${made.id}`, { ...MEETUP, title: 'Khairul’s version', updatedAt: made.updatedAt })
    expect(second.status).toBe(409)
    expect(await json(second)).toEqual({ error: 'stale' })
    expect((kv.get(`wellness:moment:${made.id}`) as StoredEvent).title).toBe('Ren’s version')
  })

  it('an edit of a missing event is 404; a bad kind or id is 404 and touches nothing', async () => {
    const { call, events } = build()
    expect((await call('PUT', `/admin/events/moment/${ID}`, { ...MEETUP, updatedAt: 'x' })).status).toBe(404)
    expect((await call('PUT', `/admin/events/party/${ID}`, { ...MEETUP, updatedAt: 'x' })).status).toBe(404)
    expect((await call('DELETE', '/admin/events/moment/..%2Fx')).status).toBe(404)
    expect((await call('GET', '/admin/events/moment/abc/bookings')).status).toBe(404)
    expect(events.put).not.toHaveBeenCalled()
    expect(events.remove).not.toHaveBeenCalled()
  })
})

describe('delete and bookings', () => {
  it('deleting takes only its own bookings', async () => {
    const { call, json, kv, rsvp, logs } = build()
    const a = (await json(await call('POST', '/admin/events', MEETUP))).data
    const b = (await json(await call('POST', '/admin/events', { ...MEETUP, kind: 'event', title: 'Reformer' }))).data
    rsvp(`m-${a.id}`, 'Ana+test@Example.test')
    rsvp(`m-${a.id}`, 'b@example.test')
    rsvp(`e-${b.id}`, 'c@example.test')
    const r = await call('DELETE', `/admin/events/moment/${a.id}`)
    expect(r.status).toBe(200)
    expect((await json(r)).data).toEqual({ bookingsRemoved: 2 })
    expect([...kv.keys()].filter((k) => k.startsWith('rsvp:'))).toEqual([`rsvp:e-${b.id}:c@example.test`])
    expect(kv.has(`wellness:moment:${a.id}`)).toBe(false)
    expect((await call('DELETE', `/admin/events/moment/${a.id}`)).status).toBe(404)
    expect(JSON.stringify(logs)).not.toMatch(/@/)
  })

  it('lists an event’s bookings and removes one, once', async () => {
    const { call, json, kv, rsvp, logs } = build()
    const a = (await json(await call('POST', '/admin/events', MEETUP))).data
    rsvp(`m-${a.id}`, 'Ana+test@Example.test')
    const list = (await json(await call('GET', `/admin/events/moment/${a.id}/bookings`))).data
    expect(list).toEqual([{ ref: `m-${a.id}`, name: 'Ana', email: 'ana+test@example.test', phone: '+971', guests: 2, bookedAt: '2026-11-25T10:00:00Z' }])
    const path = `/admin/events/moment/${a.id}/bookings/${encodeURIComponent('Ana+test@Example.test')}`
    expect((await call('DELETE', path)).status).toBe(200)
    expect([...kv.keys()].some((k) => k.startsWith('rsvp:'))).toBe(false)
    expect((await call('DELETE', path)).status).toBe(404)
    expect(logs.at(-1)).toEqual({ actor: ME, kind: 'moment', id: a.id, action: 'booking_removed' })
    expect(JSON.stringify(logs)).not.toMatch(/@/)
  })

  it('removing a booking matches the whole email, not a prefix of a longer one', async () => {
    const { call, json, kv, rsvp } = build()
    const a = (await json(await call('POST', '/admin/events', MEETUP))).data
    rsvp(`m-${a.id}`, 'ana@example.testing')
    expect((await call('DELETE', `/admin/events/moment/${a.id}/bookings/${encodeURIComponent('ana@example.test')}`)).status).toBe(404)
    expect(kv.has(`rsvp:m-${a.id}:ana@example.testing`)).toBe(true)
  })
})

describe('the seen marker', () => {
  it('?seen=1 marks Events seen once; Home’s call does not', async () => {
    const { call, events } = build()
    await call('GET', '/admin/events')
    expect(events.markSeen).not.toHaveBeenCalled()
    await call('GET', '/admin/events?seen=1')
    expect(events.markSeen).toHaveBeenCalledTimes(1)
    expect(events.markSeen).toHaveBeenCalledWith(ME, NOW.toISOString())
  })
})

describe('photo upload', () => {
  const form = (bytes: number[], size = bytes.length, type = 'image/jpeg', name = 'p.jpg') => {
    const buf = new Uint8Array(size)
    buf.set(bytes)
    const f = new FormData()
    f.append('file', new File([buf], name, { type }))
    return f
  }
  it('takes a JPEG, PNG or WebP by its bytes and returns its URL', async () => {
    const { call, json, events } = build()
    for (const [bytes, type] of [
      [[0xff, 0xd8, 0xff, 0xe0], 'image/jpeg'],
      [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'image/png'],
      [[0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50], 'image/webp'],
    ] as const) {
      const r = await call('POST', '/admin/events/photo', form([...bytes], 64))
      expect(r.status, type).toBe(200)
      expect((await json(r)).data).toEqual({ url: `${BASE}admin/1-abcd1234.jpg` })
      expect((events.upload as any).mock.calls.at(-1)[1]).toBe(type)
    }
  })
  it('refuses a GIF named .jpg, no file, and anything over 8 MB', async () => {
    const { call, json, events } = build()
    const gif = await call('POST', '/admin/events/photo', form([0x47, 0x49, 0x46, 0x38], 64, 'image/jpeg', 'x.jpg'))
    expect(gif.status).toBe(400)
    expect(await json(gif)).toEqual({ error: 'invalid', problem: 'Photos must be JPEG, PNG or WebP.' })
    expect((await call('POST', '/admin/events/photo', new FormData())).status).toBe(400)
    const big = await call('POST', '/admin/events/photo', form([0xff, 0xd8, 0xff], 8 * 1024 * 1024 + 1))
    expect(await json(big)).toEqual({ error: 'invalid', problem: 'Photos can be up to 8 MB.' })
    expect(events.upload).not.toHaveBeenCalled()
  })
})
