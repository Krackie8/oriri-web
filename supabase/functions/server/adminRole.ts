/**
 * Who is an admin. The only source is a row in public.user_roles with role 'admin' (not expired),
 * read by this function as service_role.
 *
 * Never user_metadata: a signed-in Member can edit her own user_metadata from the browser, so any
 * check on it is a check she can pass by herself. Never an email either.
 *
 * Fails closed: no user id, no rows, or any read error means "not an admin".
 */

/** The small slice of a Supabase client this needs, so a test can hand in a fake. */
export interface RolesReader {
  from(table: 'user_roles'): {
    select(columns: string): {
      eq(column: 'user_id', value: string): PromiseLike<{
        data: { role: string; expires_at: string | null }[] | null
        error: unknown
      }>
    }
  }
}

export async function hasAdminRole(
  db: RolesReader,
  userId: string | null | undefined,
  now: Date = new Date(),
): Promise<boolean> {
  if (!userId) return false
  try {
    const { data, error } = await db.from('user_roles').select('role, expires_at').eq('user_id', userId)
    if (error) {
      console.error('[adminRole] user_roles read failed; treating as not admin')
      return false
    }
    return (data ?? []).some(
      (r) => r.role === 'admin' && (r.expires_at === null || new Date(r.expires_at).getTime() > now.getTime()),
    )
  } catch {
    console.error('[adminRole] user_roles read threw; treating as not admin')
    return false
  }
}

/** The user ids that hold a live admin row. For listing admins and counting them. */
export async function adminUserIds(db: {
  from(table: 'user_roles'): {
    select(columns: string): {
      eq(column: 'role', value: 'admin'): PromiseLike<{
        data: { user_id: string; expires_at: string | null }[] | null
        error: unknown
      }>
    }
  }
}, now: Date = new Date()): Promise<Set<string>> {
  try {
    const { data, error } = await db.from('user_roles').select('user_id, expires_at').eq('role', 'admin')
    if (error) return new Set()
    return new Set(
      (data ?? [])
        .filter((r) => r.expires_at === null || new Date(r.expires_at).getTime() > now.getTime())
        .map((r) => r.user_id),
    )
  } catch {
    return new Set()
  }
}
