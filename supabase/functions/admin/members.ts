/**
 * The Members page: rows from membersQuery.ts mapped to API shapes. Pure and Deno-free so vitest can
 * import it under Node. Dates go out as ISO strings; the site formats them.
 */
import { firstNameOf } from './me.ts'
import { count } from './overview.ts'
import { streakOf } from '../server/streak.ts'
import {
  levelsFrom, statusOf, statusName, emptySums,
  type Tier, type RecordedRow, type Levels, type Sums,
} from '../server/progress.ts'

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

export interface MembersDeps {
  /** Runs MEMBERS_LIST_SQL with ($1 = the cleaned search) and returns its rows. */
  list(q: string): Promise<Record<string, unknown>[]>
  /** Runs MEMBER_DETAIL_SQL with ($1 = the Member's id) and returns its row, if any. */
  detail(id: string): Promise<Record<string, unknown> | undefined>
  adminIds(): Promise<string[]>
  /** Lower-cased, from bestie:leadflag:* with test === true. */
  testEmails(): Promise<Set<string>>
  now?: () => Date
}

type Row = Record<string, unknown>

/** Trimmed, lower-cased, at most 100 characters; '' for anything that is not a string. */
export function cleanQuery(q: unknown): string {
  return typeof q === 'string' ? q.trim().toLowerCase().slice(0, 100) : ''
}

/** An ISO string for a Date or date text; null stays null. */
const iso = (v: unknown): string | null => {
  if (v === null || v === undefined || v === '') return null
  const d = v instanceof Date ? v : new Date(v as string)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)

/** The whole trimmed display name (at most 60 characters); null when empty or it looks like an email. */
function nameOf(displayName: unknown): string | null {
  const raw = typeof displayName === 'string' ? displayName : null
  if (firstNameOf(raw) === null) return null
  return raw!.trim().slice(0, 60)
}

function tagsOf(id: string, email: string, adminIds: Set<string>, testEmails: Set<string>): MemberTag[] {
  const tags: MemberTag[] = []
  if (adminIds.has(id)) tags.push('team')
  if (testEmails.has(email.trim().toLowerCase())) tags.push('test')
  return tags
}

export function toListItem(row: Row, adminIds: Set<string>, testEmails: Set<string>): MemberListItem {
  const id = str(row.id)
  const email = str(row.email)
  return {
    id,
    name: nameOf(row.display_name),
    email,
    joined: iso(row.joined) ?? '',
    lastSeen: iso(row.last_sign_in_at),
    tags: tagsOf(id, email, adminIds, testEmails),
  }
}

/** Copied from the private floorOf in server/bestie.ts (server is not modified): her highest recorded Level per Pillar. */
export const floorOf = (rows: RecordedRow[]): Partial<Levels> => {
  const f: Partial<Levels> = {}
  for (const r of rows) if (r.kind === 'level' && r.pillar && r.level) f[r.pillar] = Math.max(f[r.pillar] ?? 1, r.level)
  return f
}

const MEMBERSHIP_WORDS: Record<string, string> = {
  trialing: 'Trial',
  active: 'Paying',
  past_due: 'Payment overdue',
  cancelled: 'Cancelled',
  expired: 'Ended',
}

const asObject = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

export function toDetail(row: Row, id: string, adminIds: Set<string>, testEmails: Set<string>, today: string): MemberDetail {
  const email = str(row.email)
  const consentRow = asObject(row.consents)
  const consents = {} as MemberDetail['consents']
  for (const p of CONSENT_PURPOSES) consents[p] = typeof consentRow[p] === 'boolean' ? (consentRow[p] as boolean) : null

  const sumRow = asObject(row.sums)
  const sums: Sums = emptySums()
  for (const p of Object.keys(sums) as (keyof Sums)[]) sums[p] = count(sumRow[p])
  const recorded: RecordedRow[] = (Array.isArray(row.recorded) ? row.recorded : []).map((r, i) => {
    const o = asObject(r)
    return {
      id: String(i),
      kind: o.kind === 'status' ? 'status' : 'level',
      pillar: (strOrNull(o.pillar) as RecordedRow['pillar']) ?? null,
      level: typeof o.level === 'number' ? o.level : null,
      shape: strOrNull(o.shape),
      tier: strOrNull(o.tier) as Tier | null,
      reachedAt: iso(o.reachedAt) ?? '',
    }
  })
  const status = statusName(statusOf(levelsFrom(sums, floorOf(recorded)), sums))
  const days = (Array.isArray(row.completion_days) ? row.completion_days : []).map(String)
  const membershipStatus = strOrNull(row.membership_status)

  return {
    name: nameOf(row.display_name),
    email,
    tags: tagsOf(id, email, adminIds, testEmails),
    account: {
      joined: iso(row.joined) ?? '',
      emailConfirmed: row.email_confirmed === true,
      lastSignIn: iso(row.last_sign_in_at),
      signsInWith: (Array.isArray(row.providers) ? row.providers : []).map(String),
      blocked: row.banned === true,
    },
    profile: {
      area: strOrNull(row.home_area),
      instagram: strOrNull(row.instagram_handle),
      adultConfirmed: row.adult_confirmed === true,
    },
    consents,
    bestie: {
      checkIns: count(row.check_ins),
      lastCheckIn: iso(row.last_check_in),
      done: count(row.completions),
      streak: streakOf(days, today).count,
      status,
      photosReported: count(row.flagged),
    },
    membership: membershipStatus ? (MEMBERSHIP_WORDS[membershipStatus] ?? membershipStatus) : 'Free',
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (s: string): boolean => UUID.test(s)
