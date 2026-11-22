import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { createAdminApp, requireAdmin, type AdminDeps } from './app'

const MEMBER = { id: 'member-1', email: 'member@example.test' }
const ADMIN = { id: 'admin-1', email: 'admin@example.test' }

function fakeDeps(): AdminDeps {
  return {
    isAdmin: async (id) => id === ADMIN.id,
    userFromToken: async (token) =>
      token === 'member-token' ? MEMBER : token === 'admin-token' ? ADMIN : null,
    signInLink: {} as AdminDeps["signInLink"],
    overview: {
      kv: { get: async () => null, getByPrefix: async () => [] },
      adminIds: async () => [],
      queryRow: async () => ({ members_total: '2', members_week: '1', members_month: '2', active_week: '1', member_emails: null }),
    },
    me: {},
  }
}

describe('createAdminApp', () => {
  it('unknown route is 404', async () => {
    const app = createAdminApp(fakeDeps())
    const res = await app.request('/admin/nope')
    expect(res.status).toBe(404)
  })
})

describe('GET /admin/overview', () => {
  const get = (token?: string) =>
    createAdminApp(fakeDeps()).request('/admin/overview', { headers: token ? { Authorization: `Bearer ${token}` } : {} })

  it('no token is 401', async () => {
    expect((await get()).status).toBe(401)
  })
  it('a Member is 403', async () => {
    expect((await get('member-token')).status).toBe(403)
  })
  it('an admin gets the Overview', async () => {
    const res = await get('admin-token')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      success: true,
      data: {
        visits: { week: 0, weekBefore: 0, month: 0, monthBefore: 0 },
        members: { total: 2, week: 1, month: 2 },
        activeWeek: 1,
        leads: 0,
        paying: null,
      },
    })
  })
  it('a failure answers 500 with no detail', async () => {
    const deps = fakeDeps()
    deps.overview.queryRow = async () => { throw new Error('secret db detail') }
    const res = await createAdminApp(deps).request('/admin/overview', { headers: { Authorization: 'Bearer admin-token' } })
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('secret')
  })
})

describe('requireAdmin', () => {
  const probe = () => {
    const deps = fakeDeps()
    const app = new Hono()
    app.get('/probe', async (c) => {
      const r = await requireAdmin(c, deps)
      if (r instanceof Response) return r
      return c.json({ id: r.user.id })
    })
    return app
  }
  const get = (token?: string) =>
    probe().request('/probe', { headers: token ? { Authorization: `Bearer ${token}` } : {} })

  it('no token is 401', async () => {
    expect((await get()).status).toBe(401)
  })
  it('an unknown token is 401', async () => {
    expect((await get('bogus')).status).toBe(401)
  })
  it('a Member is 403', async () => {
    expect((await get('member-token')).status).toBe(403)
  })
  it('an admin passes', async () => {
    const res = await get('admin-token')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: ADMIN.id })
  })
})
