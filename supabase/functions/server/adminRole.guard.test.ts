import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Guard: admin must never again be decided from user_metadata or an email, and the routes that granted
 * roles or set passwords over HTTP must stay gone. A Member can edit her own user_metadata.
 */
const files = ['./index.tsx', './vipRoutes.ts'].map((f) => ({
  f,
  src: readFileSync(new URL(f, import.meta.url), 'utf8'),
}))

describe('admin comes only from public.user_roles', () => {
  it.each(files)('$f reads no role, isAdmin or isCreator from user_metadata', ({ src }) => {
    expect(src).not.toMatch(/user_metadata\?*\.(role|isAdmin|isCreator)\b/)
    expect(src).not.toMatch(/user_metadata\[['"](role|isAdmin|isCreator)['"]\]/)
  })

  it.each(files)('$f has no hard-coded admin email', ({ src }) => {
    expect(src).not.toMatch(/admin@oriri\.com/)
  })

  it('index.tsx serves none of the removed account and role routes', () => {
    const index = files[0].src
    for (const r of ['make-admin', 'setup-admin', 'setup-demo-user', 'create-admin', 'promote-to-admin', 'revoke-admin']) {
      expect(index, r).not.toMatch(new RegExp(`app\\.(get|post|put|delete)\\('/make-server-a278ea32/${r}'`))
    }
  })

  // A floor, so the guard cannot pass on a file that lost its checks altogether.
  it('the admin checks are still there, now through user_roles', () => {
    const index = files[0].src
    // 27 direct checks when this was written, plus isCreator() and socialIsAdmin(), which wrap it.
    expect((index.match(/await isAdminUser\(/g) ?? []).length).toBeGreaterThanOrEqual(27)
    expect(index).toMatch(/const isCreator = \(user: any\) => isAdminUser\(user\?\.id\)/)
    expect(index).toMatch(/return isAdminUser\(user\?\.id\);/)
    expect(index).toMatch(/hasAdminRole\(supabase as unknown as RolesReader, userId\)/)
    expect((files[1].src.match(/await isAdmin\(user\)/g) ?? []).length).toBe(11)
  })
})
