/**
 * Admin: the team-only sign-in link, "who am I" and the Overview numbers.
 * Overview mirrors supabase/functions/admin/overview.ts; MemberListItem and MemberDetail
 * mirror members.ts; TeamMember and TeamChange mirror team.ts (src cannot import Deno code).
 */
import type { Core } from './core'
import type { FunctionError, Result } from './types'

export interface Overview {
  visits: { week: number; weekBefore: number; month: number; monthBefore: number }
  members: { total: number; week: number; month: number }
  activeWeek: number
  leads: number
  paying: null
}

export type MemberTag = 'team' | 'test'

export interface MemberListItem {
  id: string
  name: string | null
  email: string
  joined: string
  lastSeen: string | null
  tags: MemberTag[]
}

export const CONSENT_PURPOSES = ['terms', 'location', 'wellness_signals', 'personalisation', 'push', 'marketing'] as const

export interface MemberDetail {
  name: string | null
  email: string
  tags: MemberTag[]
  account: { joined: string; emailConfirmed: boolean; lastSignIn: string | null; signsInWith: string[]; blocked: boolean }
  profile: { area: string | null; instagram: string | null; adultConfirmed: boolean }
  consents: Record<(typeof CONSENT_PURPOSES)[number], boolean | null>
  bestie: { checkIns: number; lastCheckIn: string | null; done: number; streak: number; status: string; photosReported: number }
  membership: string
}

export interface TeamMember { userId: string; name: string | null; email: string; since: string; lastSignIn: string | null; isYou: boolean }
export interface TeamChange { who: string; action: 'add' | 'remove'; whom: string; at: string }

export type TeamProblem = 'reauth' | 'invalid' | 'self' | 'last' | 'other'

/** Reads the server's Team error ({ error: 'reauth' | 'invalid' | 'self' | 'last' }); anything else (Forbidden, 404, 500, no reply) is 'other'. */
export function teamProblem(e: FunctionError): TeamProblem {
  const code = (e.details as { error?: unknown } | null | undefined)?.error
  return code === 'reauth' || code === 'invalid' || code === 'self' || code === 'last' ? code : 'other'
}

export interface AdminMe {
  isAdmin: boolean
  firstName: string | null
}

export function createAdmin(core: Core) {
  return {
    async requestLink(email: string): Promise<Result<void>> {
      const r = await core.request('POST', '/sign-in-link', { body: { email } })
      return r.ok ? { ok: true, data: undefined } : r
    },

    async me(): Promise<Result<AdminMe>> {
      const r = await core.request<{ data: AdminMe }>('GET', '/me')
      return r.ok ? { ok: true, data: r.data.data } : r
    },

    async overview(): Promise<Result<Overview>> {
      const r = await core.request<{ data: Overview }>('GET', '/overview')
      return r.ok ? { ok: true, data: r.data.data } : r
    },

    async members(q: string): Promise<Result<MemberListItem[]>> {
      const r = await core.request<{ data: MemberListItem[] }>('GET', `/members?q=${encodeURIComponent(q)}`)
      return r.ok ? { ok: true, data: r.data.data } : r
    },

    async member(id: string): Promise<Result<MemberDetail>> {
      const r = await core.request<{ data: MemberDetail }>('GET', `/members/${encodeURIComponent(id)}`)
      return r.ok ? { ok: true, data: r.data.data } : r
    },

    async team(): Promise<Result<{ members: TeamMember[]; changes: TeamChange[] }>> {
      const r = await core.request<{ data: { members: TeamMember[]; changes: TeamChange[] } }>('GET', '/team')
      return r.ok ? { ok: true, data: r.data.data } : r
    },

    async addToTeam(email: string): Promise<Result<'added' | 'already'>> {
      const r = await core.request<{ data: { result: 'added' | 'already' } }>('POST', '/team', { body: { email } })
      return r.ok ? { ok: true, data: r.data.data.result } : r
    },

    async removeFromTeam(userId: string): Promise<Result<'removed'>> {
      const r = await core.request<{ data: { result: 'removed' } }>('DELETE', `/team/${encodeURIComponent(userId)}`)
      return r.ok ? { ok: true, data: r.data.data.result } : r
    },
  }
}

export const createAdminClient = createAdmin
export type AdminClient = ReturnType<typeof createAdmin>
