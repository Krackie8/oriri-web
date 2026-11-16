/**
 * Join (GLOSSARY.md): a signed-in woman becomes a Member.
 * - She must confirm she is 18+, pick a Home area from the Check-in's list and grant terms.
 * - Every Consent is recorded separately, with CONSENT_VERSION and a timestamp. Anything not
 *   exactly `true` is recorded as refused.
 * - Joining twice changes nothing.
 * - Her earlier Free day lead (same email) is marked joined. That is best-effort: it never blocks joining.
 *
 * No Deno or network code here, so vitest drives it with the in-memory store.
 * The Postgres store lives in index.tsx.
 */

/** Same list, same order as DUBAI_AREAS in src/app/wellness/content.ts (a test keeps them equal). */
export const HOME_AREAS = [
  'Al Barsha',
  'Al Furjan',
  'Al Quoz',
  'Al Sufouh',
  'Al Wasl / City Walk',
  'Arabian Ranches',
  'Bluewaters',
  'Bur Dubai',
  'Business Bay',
  'DAMAC Hills',
  'Deira',
  'DIFC',
  'Discovery Gardens',
  'Downtown Dubai',
  'Dubai Creek Harbour',
  'Dubai Hills Estate',
  'Dubai Marina',
  'Dubai Silicon Oasis',
  'Dubai South',
  'Dubai Sports City',
  'Emirates Hills',
  'Jumeirah',
  'Jumeirah Beach Residence (JBR)',
  'Jumeirah Lake Towers (JLT)',
  'Jumeirah Village Circle (JVC)',
  'Jumeirah Village Triangle (JVT)',
  'Karama',
  'Meydan',
  'Mirdif',
  'Motor City',
  'Palm Jumeirah',
  'The Greens & The Views',
  'The Springs / Meadows / Lakes',
  'Town Square',
  'Umm Suqeim',
  'Somewhere else',
] as const

export const CONSENT_PURPOSES = ['terms', 'location', 'wellness_signals', 'personalisation', 'push', 'marketing'] as const
export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number]

/** One version for the whole consent set: change it whenever any consent wording changes. */
export const CONSENT_VERSION = '2026-11-16'

export interface MemberView {
  city: string
  homeArea: string
  instagram: string | null
}

export interface MemberRow {
  id: string
  city: string
  home_area: string
  instagram_handle: string | null
  adult_confirmed_at: string
}

export interface ConsentRow {
  member_id: string
  purpose: ConsentPurpose
  version: string
  granted: boolean
  recorded_at: string
}

/** The storage port. `createMember` writes the Member and her consents together, or not at all. */
export interface JoinStore {
  getMember(id: string): Promise<MemberRow | null>
  /** Returns false when the Member already existed (nothing written). */
  createMember(member: MemberRow, consents: ConsentRow[]): Promise<boolean>
  markFreeDayLeadJoined(email: string, memberId: string, joinedAt: string): Promise<void>
}

export type JoinOutcome =
  | { outcome: 'joined'; member: MemberView }
  | { outcome: 'alreadyJoined'; member: MemberView }
  | { outcome: 'invalid'; message: string }

const HANDLE = /^[a-z0-9._]{1,30}$/i

const view = (m: MemberRow): MemberView => ({ city: m.city, homeArea: m.home_area, instagram: m.instagram_handle })

export async function memberOf(store: JoinStore, id: string): Promise<MemberView | null> {
  const m = await store.getMember(id)
  return m ? view(m) : null
}

export async function join(
  store: JoinStore,
  user: { id: string; email?: string | null },
  input: unknown,
  now: Date,
): Promise<JoinOutcome> {
  const existing = await store.getMember(user.id)
  if (existing) return { outcome: 'alreadyJoined', member: view(existing) }

  const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  if (body.adult !== true) return { outcome: 'invalid', message: 'Please confirm you are 18 or older.' }
  const homeArea = body.homeArea
  if (typeof homeArea !== 'string' || !(HOME_AREAS as readonly string[]).includes(homeArea)) {
    return { outcome: 'invalid', message: 'Please pick your home area.' }
  }
  const given = (body.consents && typeof body.consents === 'object' ? body.consents : {}) as Record<string, unknown>
  if (given.terms !== true) return { outcome: 'invalid', message: 'Please accept the terms to join.' }
  const rawHandle = typeof body.instagram === 'string' ? body.instagram.trim().replace(/^@/, '') : ''
  if (rawHandle && !HANDLE.test(rawHandle)) {
    return { outcome: 'invalid', message: 'That Instagram handle does not look right.' }
  }

  const at = now.toISOString()
  const member: MemberRow = {
    id: user.id,
    city: 'dubai',
    home_area: homeArea,
    instagram_handle: rawHandle || null,
    adult_confirmed_at: at,
  }
  const consents: ConsentRow[] = CONSENT_PURPOSES.map((purpose) => ({
    member_id: user.id,
    purpose,
    version: CONSENT_VERSION,
    granted: given[purpose] === true,
    recorded_at: at,
  }))

  const created = await store.createMember(member, consents)
  if (!created) {
    // Lost a race with her own second tab: report what is stored.
    const winner = await store.getMember(user.id)
    return { outcome: 'alreadyJoined', member: view(winner ?? member) }
  }

  const email = (user.email ?? '').trim().toLowerCase()
  if (email) {
    try {
      await store.markFreeDayLeadJoined(email, user.id, at)
    } catch (e) {
      console.log(`join: could not mark Free day lead for member ${user.id}: ${e}`)
    }
  }
  return { outcome: 'joined', member: view(member) }
}

/** In-memory store for tests. */
export function createMemoryJoinStore(opts: { freeDayLeads?: string[]; failLeadMark?: boolean } = {}) {
  const members = new Map<string, MemberRow>()
  const consents: ConsentRow[] = []
  const leads = new Set(opts.freeDayLeads ?? [])
  const joinedLeads: { email: string; memberId: string; joinedAt: string }[] = []
  const store: JoinStore & { members: typeof members; consents: typeof consents; joinedLeads: typeof joinedLeads } = {
    members,
    consents,
    joinedLeads,
    async getMember(id) {
      return members.get(id) ?? null
    },
    async createMember(m, cs) {
      if (members.has(m.id)) return false
      members.set(m.id, m)
      consents.push(...cs)
      return true
    },
    async markFreeDayLeadJoined(email, memberId, joinedAt) {
      if (opts.failLeadMark) throw new Error('kv down')
      if (leads.has(email)) joinedLeads.push({ email, memberId, joinedAt })
    },
  }
  return store
}
