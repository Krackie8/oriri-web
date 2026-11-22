import { describe, expect, it } from 'vitest'
import { createAdminClient, type Overview } from './admin'
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
