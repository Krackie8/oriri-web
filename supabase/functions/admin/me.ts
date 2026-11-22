import type { Context } from 'hono'
import type { AdminDeps } from './app.ts'

export interface MeDeps {
  /** public.profiles.display_name for the user, or null. */
  displayName(userId: string): Promise<string | null>
}

/** First word of a display name, or null when empty or it looks like an email. */
export function firstNameOf(displayName: string | null): string | null {
  if (!displayName) return null
  const name = displayName.trim()
  if (!name || name.includes('@')) return null
  return name.split(/\s+/)[0].slice(0, 40) || null
}

/**
 * GET /admin/me. 401 with no user. A Member is a 200 with isAdmin false (never a 403), so the
 * site can show the login page. If the admin check itself fails we answer 500 with no detail,
 * which never reads as admin.
 */
export async function meHandler(
  c: Context,
  deps: Pick<AdminDeps, 'isAdmin' | 'userFromToken' | 'me'>,
): Promise<Response> {
  const header = c.req.header('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() || undefined : undefined
  const user = token ? await deps.userFromToken(token) : null
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  let admin: boolean
  try {
    admin = await deps.isAdmin(user.id)
  } catch {
    return c.json({ error: 'Something went wrong' }, 500)
  }
  if (!admin) return c.json({ success: true, data: { isAdmin: false, firstName: null } })
  let firstName: string | null = null
  try {
    firstName = firstNameOf(await deps.me.displayName(user.id))
  } catch { /* a missing name just means a plain greeting */ }
  return c.json({ success: true, data: { isAdmin: true, firstName } })
}
