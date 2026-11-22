/**
 * Admin: the team-only sign-in link, "who am I" and the Overview numbers.
 * Overview mirrors supabase/functions/admin/overview.ts (src cannot import Deno code).
 */
import type { Core } from './core'
import type { Result } from './types'

export interface Overview {
  visits: { week: number; weekBefore: number; month: number; monthBefore: number }
  members: { total: number; week: number; month: number }
  activeWeek: number
  leads: number
  paying: null
}

export interface AdminMe {
  isAdmin: boolean
  firstName: string | null
}

export function createAdmin(core: Core) {
  return {
    async requestLink(email: string): Promise<Result<void>> {
      const r = await core.request('POST', '/admin/sign-in-link', { body: { email } })
      return r.ok ? { ok: true, data: undefined } : r
    },

    async me(): Promise<Result<AdminMe>> {
      const r = await core.request<{ data: AdminMe }>('GET', '/admin/me')
      return r.ok ? { ok: true, data: r.data.data } : r
    },

    async overview(): Promise<Result<Overview>> {
      const r = await core.request<{ data: Overview }>('GET', '/admin/overview')
      return r.ok ? { ok: true, data: r.data.data } : r
    },
  }
}

export const createAdminClient = createAdmin
export type AdminClient = ReturnType<typeof createAdmin>
