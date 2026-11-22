import { describe, it, expect } from 'vitest'
import { createAdminApp, type AdminDeps } from './app'
import { firstNameOf } from './me'

const MEMBER = { id: 'member-1', email: 'member@example.test' }
const ADMIN = { id: 'admin-1', email: 'admin@example.test' }

describe('firstNameOf', () => {
  it('takes the first word', () => expect(firstNameOf('Renee Shaqirah')).toBe('Renee'))
  it('is null for an email', () => expect(firstNameOf('ren@example.test')).toBeNull())
  it('is null for null', () => expect(firstNameOf(null)).toBeNull())
  it('is null for blank', () => expect(firstNameOf('  ')).toBeNull())
  it('is null for empty', () => expect(firstNameOf('')).toBeNull())
  it('trims leading space', () => expect(firstNameOf('  Renee  Shaqirah ')).toBe('Renee'))
  it('caps at 40 characters', () => expect(firstNameOf('A'.repeat(60))).toBe('A'.repeat(40)))
})

function build(over: Partial<AdminDeps> = {}, displayName = async (_: string): Promise<string | null> => 'Renee Shaqirah') {
  const calls: string[] = []
  const deps: AdminDeps = {
    isAdmin: async (id) => id === ADMIN.id,
    userFromToken: async (t) => (t === 'member-token' ? MEMBER : t === 'admin-token' ? ADMIN : null),
    signInLink: {} as AdminDeps['signInLink'],
    overview: {},
    me: { displayName: async (id) => { calls.push(id); return displayName(id) } },
    ...over,
  }
  return { app: createAdminApp(deps), calls }
}
const get = (app: ReturnType<typeof build>['app'], token?: string) =>
  app.request('/admin/me', { headers: token ? { Authorization: `Bearer ${token}` } : {} })

describe('GET /admin/me', () => {
  it('admin gets isAdmin and first name', async () => {
    const { app, calls } = build()
    const res = await get(app, 'admin-token')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, data: { isAdmin: true, firstName: 'Renee' } })
    expect(calls).toEqual([ADMIN.id])
  })
  it('a Member gets 200 isAdmin false, and no name lookup', async () => {
    const { app, calls } = build()
    const res = await get(app, 'member-token')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, data: { isAdmin: false, firstName: null } })
    expect(calls).toEqual([])
  })
  it('no token is 401', async () => {
    expect((await get(build().app)).status).toBe(401)
  })
  it('an unknown token is 401', async () => {
    expect((await get(build().app, 'bogus')).status).toBe(401)
  })
  it('an admin with an email as display name gets null', async () => {
    const res = await get(build({}, async () => 'a@example.test').app, 'admin-token')
    expect((await res.json()).data).toEqual({ isAdmin: true, firstName: null })
  })
  it('an admin whose name lookup throws still gets in, no name', async () => {
    const res = await get(build({}, async () => { throw new Error('db down') }).app, 'admin-token')
    expect(res.status).toBe(200)
    expect((await res.json()).data).toEqual({ isAdmin: true, firstName: null })
  })
  it('fails closed when isAdmin throws: 500, no detail', async () => {
    const { app } = build({ isAdmin: async () => { throw new Error('secret db detail') } })
    const res = await get(app, 'admin-token')
    expect(res.status).toBe(500)
    const text = await res.text()
    expect(text).not.toContain('secret')
    expect(text).not.toContain('isAdmin":true')
  })
})
