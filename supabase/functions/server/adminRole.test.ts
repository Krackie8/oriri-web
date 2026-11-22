import { describe, expect, it } from 'vitest'
import { hasAdminRole, type RolesReader } from './adminRole'

/** A fake user_roles reader: returns the rows given, or an error. Records what it was asked. */
function reader(rows: { role: string; expires_at: string | null }[] | null, error: unknown = null) {
  const asked: { userId?: string } = {}
  const r: RolesReader = {
    from: () => ({
      select: () => ({
        eq: (_col: string, userId: string) => {
          asked.userId = userId
          return Promise.resolve({ data: rows, error })
        },
      }),
    }),
  }
  return { r, asked }
}

const NOW = new Date('2026-11-22T10:00:00Z')

describe('hasAdminRole: admin comes from public.user_roles, never from user_metadata', () => {
  it('an admin row with no expiry is admin', async () => {
    const { r, asked } = reader([{ role: 'admin', expires_at: null }])
    expect(await hasAdminRole(r, 'u1', NOW)).toBe(true)
    expect(asked.userId).toBe('u1')
  })

  it('only a user row is not admin', async () => {
    const { r } = reader([{ role: 'user', expires_at: null }])
    expect(await hasAdminRole(r, 'u1', NOW)).toBe(false)
  })

  it('a vip row is not admin', async () => {
    const { r } = reader([{ role: 'vip', expires_at: null }, { role: 'user', expires_at: null }])
    expect(await hasAdminRole(r, 'u1', NOW)).toBe(false)
  })

  it('an admin row that has expired is not admin', async () => {
    const { r } = reader([{ role: 'admin', expires_at: '2026-11-22T09:59:59Z' }])
    expect(await hasAdminRole(r, 'u1', NOW)).toBe(false)
  })

  it('an admin row that expires later is admin', async () => {
    const { r } = reader([{ role: 'admin', expires_at: '2026-12-01T00:00:00Z' }])
    expect(await hasAdminRole(r, 'u1', NOW)).toBe(true)
  })

  it('no rows is not admin', async () => {
    expect(await hasAdminRole(reader([]).r, 'u1', NOW)).toBe(false)
    expect(await hasAdminRole(reader(null).r, 'u1', NOW)).toBe(false)
  })

  it('a read error fails closed', async () => {
    const { r } = reader([{ role: 'admin', expires_at: null }], { message: 'boom' })
    expect(await hasAdminRole(r, 'u1', NOW)).toBe(false)
  })

  it('a thrown read fails closed', async () => {
    const r: RolesReader = { from: () => { throw new Error('down') } }
    expect(await hasAdminRole(r, 'u1', NOW)).toBe(false)
  })

  it('no user id is not admin, and nothing is read', async () => {
    const { r, asked } = reader([{ role: 'admin', expires_at: null }])
    expect(await hasAdminRole(r, '', NOW)).toBe(false)
    expect(await hasAdminRole(r, undefined, NOW)).toBe(false)
    expect(asked.userId).toBeUndefined()
  })
})
