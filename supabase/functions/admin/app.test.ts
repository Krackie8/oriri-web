import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { createAdminApp, requireAdmin, type AdminDeps } from './app'

const MEMBER = { id: 'member-1', email: 'member@example.test', signedInAt: null }
const ADMIN = { id: 'admin-1', email: 'admin@example.test', signedInAt: null }

function fakeDeps(): AdminDeps {
  return {
    isAdmin: async (id) => id === ADMIN.id,
    userFromToken: async (token) =>
      token === 'member-token' ? MEMBER : token === 'admin-token' ? ADMIN : null,
    signInLink: {} as AdminDeps["signInLink"],
    overview: {
      kv: { get: async () => null, getByPrefix: async () => [] },
      adminIds: async () => [],
      queryRow: async () => ({ members_total: '2', members_week: '1', members_month: '2', active_week: '1', non_lead_emails: null }),
    },
    me: {},
    catalogue: {} as AdminDeps['catalogue'],
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
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await createAdminApp(deps).request('/admin/overview', { headers: { Authorization: 'Bearer admin-token' } })
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('secret')
    expect(spy.mock.calls.flat().join(' ')).toContain('secret db detail')
    spy.mockRestore()
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

describe('catalogue routes', () => {
  const PL = '00000000-0000-4000-8000-000000000002'
  const IT = '00000000-0000-4000-8000-000000000003'
  const routes = [
    `/admin/catalogue/places/${PL}/decision`,
    `/admin/catalogue/places/${PL}/activities/${IT}/decision`,
    `/admin/catalogue/events/${IT}/decision`,
    `/admin/catalogue/content/${IT}/decision`,
    `/admin/catalogue/runs/${IT}/undo`,
  ]
  const withCatalogue = () => {
    const catalogue = {
      decidePlace: vi.fn(async () => 'decided'),
      decideActivity: vi.fn(async () => 'decided'),
      decideEvent: vi.fn(async () => 'decided'),
      decideContent: vi.fn(async () => 'decided'),
      undoRun: vi.fn(async () => ({ result: 'stillRunning', rejected: 0, restored: 0, skipped: [] })),
    }
    return { catalogue, deps: { ...fakeDeps(), catalogue } as unknown as AdminDeps }
  }
  const post = (deps: AdminDeps, path: string, token?: string, body: unknown = { decision: 'approved' }) =>
    createAdminApp(deps).request(path, {
      method: 'POST', body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })

  for (const path of routes) {
    it(`${path.replace(/[0-9a-f-]{36}/g, ':id')}: 401 with no token, 403 for a non-admin`, async () => {
      const { deps, catalogue } = withCatalogue()
      expect((await post(deps, path)).status).toBe(401)
      expect((await post(deps, path, 'member-token')).status).toBe(403)
      for (const fn of Object.values(catalogue)) expect(fn).not.toHaveBeenCalled()
    })
  }
  it('an admin place decision reaches decidePlace with the cleaned body', async () => {
    const { deps, catalogue } = withCatalogue()
    const res = await post(deps, routes[0], 'admin-token', { decision: 'approved', note: '  hi  ', junk: 1 })
    expect(res.status).toBe(200)
    expect(catalogue.decidePlace).toHaveBeenCalledWith(ADMIN.id, PL, { decision: 'approved', note: 'hi', activities: [] })
  })
  it('the other decision routes reach their deps', async () => {
    const { deps, catalogue } = withCatalogue()
    expect((await post(deps, routes[1], 'admin-token')).status).toBe(200)
    expect((await post(deps, routes[2], 'admin-token')).status).toBe(200)
    expect((await post(deps, routes[3], 'admin-token', { decision: 'released' })).status).toBe(200)
    expect(catalogue.decideActivity).toHaveBeenCalledWith(ADMIN.id, PL, IT, { decision: 'approved' })
    expect(catalogue.decideEvent).toHaveBeenCalledWith(ADMIN.id, IT, { decision: 'approved' })
    expect(catalogue.decideContent).toHaveBeenCalledWith(ADMIN.id, IT, { decision: 'released' })
  })
  it('an undo that is still running answers 409 with the exact words', async () => {
    const { deps } = withCatalogue()
    const res = await post(deps, routes[4], 'admin-token', {})
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ problem: "That run is still going. Try again when it's finished." })
  })
})
