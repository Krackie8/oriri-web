/**
 * Admin: the team-only sign-in link, "who am I" and the Overview numbers.
 * Overview mirrors supabase/functions/admin/overview.ts; MemberListItem and MemberDetail
 * mirror members.ts; TeamMember and TeamChange mirror team.ts; the Event types mirror events.ts
 * (src cannot import Deno code).
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

export type EventKind = 'moment' | 'event'
export const EVENT_CATEGORIES = ['Movement', 'Mind', 'Food', 'Beauty', 'Workshop', 'Pop-up', 'Community'] as const

export interface StoredEvent {
  id: string
  title: string
  date: string
  startTime?: string
  location?: string
  description?: string
  link?: string
  pinned: boolean
  createdAt: string
  updatedAt: string
  type?: 'upcoming' | 'recap'
  photos?: string[]
  category?: string
  image?: string
  partner?: string
}
export type EventFields = Partial<Omit<StoredEvent, 'id' | 'createdAt' | 'updatedAt'>>

export interface EventListItem extends StoredEvent {
  kind: EventKind
  bookings: number
  spots: number
  newBookings: number
  inMeetUp: boolean
}
export interface EventsList {
  upcoming: EventListItem[]
  past: EventListItem[]
  tile: { comingUp: number; bookings: number; fresh: boolean }
}
export interface Booking { ref: string; name: string; email: string; phone: string; guests: number; bookedAt: string }

export type EventProblem = { kind: 'invalid'; problem: string } | { kind: 'stale' } | { kind: 'other' }

/** Reads the server's Events error: 400 { error: 'invalid', problem }, 409 { error: 'stale' }; anything else is 'other'. */
export function eventProblem(e: FunctionError): EventProblem {
  const d = e.details as { error?: unknown; problem?: unknown } | null | undefined
  if (d?.error === 'invalid' && typeof d.problem === 'string') return { kind: 'invalid', problem: d.problem }
  if (d?.error === 'stale') return { kind: 'stale' }
  return { kind: 'other' }
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

    async events(opts: { seen?: boolean } = {}): Promise<Result<EventsList>> {
      const r = await core.request<{ data: EventsList }>('GET', opts.seen ? '/events?seen=1' : '/events')
      return r.ok ? { ok: true, data: r.data.data } : r
    },

    async createEvent(kind: EventKind, fields: EventFields): Promise<Result<StoredEvent>> {
      const r = await core.request<{ data: StoredEvent }>('POST', '/events', { body: { kind, ...fields } })
      return r.ok ? { ok: true, data: r.data.data } : r
    },

    async updateEvent(kind: EventKind, id: string, updatedAt: string, fields: EventFields): Promise<Result<StoredEvent>> {
      const r = await core.request<{ data: StoredEvent }>('PUT', `/events/${kind}/${encodeURIComponent(id)}`, { body: { updatedAt, ...fields } })
      return r.ok ? { ok: true, data: r.data.data } : r
    },

    async deleteEvent(kind: EventKind, id: string): Promise<Result<{ bookingsRemoved: number }>> {
      const r = await core.request<{ data: { bookingsRemoved: number } }>('DELETE', `/events/${kind}/${encodeURIComponent(id)}`)
      return r.ok ? { ok: true, data: r.data.data } : r
    },

    async bookings(kind: EventKind, id: string): Promise<Result<Booking[]>> {
      const r = await core.request<{ data: Booking[] }>('GET', `/events/${kind}/${encodeURIComponent(id)}/bookings`)
      return r.ok ? { ok: true, data: r.data.data } : r
    },

    async removeBooking(kind: EventKind, id: string, email: string): Promise<Result<void>> {
      const r = await core.request('DELETE', `/events/${kind}/${encodeURIComponent(id)}/bookings/${encodeURIComponent(email)}`)
      return r.ok ? { ok: true, data: undefined } : r
    },

    async uploadPhoto(file: Blob): Promise<Result<string>> {
      const form = new FormData()
      form.append('file', file)
      const r = await core.request<{ data: { url: string } }>('POST', '/events/photo', { form })
      return r.ok ? { ok: true, data: r.data.data.url } : r
    },
  }
}

export const createAdminClient = createAdmin
export type AdminClient = ReturnType<typeof createAdmin>
