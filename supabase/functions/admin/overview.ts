/**
 * The Overview numbers. Pure and Deno-free so vitest can import it under Node.
 * Days are Dubai days (UTC+4), the same as the stats keys the Member function writes.
 */
export interface Overview {
  visits: { week: number; weekBefore: number; month: number; monthBefore: number }
  members: { total: number; week: number; month: number }
  activeWeek: number
  leads: number
  paying: null
}

/** What OVERVIEW_SQL returns. Counts may arrive as strings or bigints from the driver. */
export interface OverviewRow {
  members_total?: unknown
  members_week?: unknown
  members_month?: unknown
  active_week?: unknown
  non_lead_emails?: string[] | null
}

export interface OverviewKv {
  get(key: string): Promise<unknown>
  /** Values only, as server/kv_store.tsx returns them. */
  getByPrefix(prefix: string): Promise<unknown[]>
}

export interface OverviewDeps {
  kv: OverviewKv
  /** User ids that hold a live admin row; they are left out of every count. */
  adminIds(): Promise<string[]>
  /** Runs OVERVIEW_SQL with ($1 ids, $2 emails) and returns its one row. */
  queryRow(ids: string[], emails: string[]): Promise<OverviewRow | undefined>
  now?: () => Date
}

const DAY_MS = 86_400_000

/** Same arithmetic as the Member function's dubaiDate. */
export const dubaiDate = (d: Date = new Date()): string =>
  new Date(d.getTime() + 4 * 3600 * 1000).toISOString().slice(0, 10)

/** The date `n` days before `date` (both YYYY-MM-DD). */
export function daysBefore(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) - n * DAY_MS).toISOString().slice(0, 10)
}

/** A finite integer >= 0, whatever came in. */
export function count(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

/**
 * Visits for one Dubai day: the rolled-up stats:day:<date>.sessions when it exists, otherwise the
 * session hits. Mirrors the read side of the Member function's rollup but never writes.
 */
export async function visitsForDay(date: string, kv: OverviewKv): Promise<number> {
  const rolled = (await kv.get(`stats:day:${date}`)) as { sessions?: unknown } | null | undefined
  if (rolled && typeof rolled === 'object') return count(rolled.sessions)
  const hits = ((await kv.getByPrefix(`stats:hit:${date}:`)) || []).filter(Boolean) as { t?: unknown }[]
  return hits.filter((h) => h.t === 'session').length
}

const sumDays = (dayVisits: Record<string, number>, today: string, from: number, to: number): number => {
  let total = 0
  for (let i = from; i < to; i++) total += count(dayVisits[daysBefore(today, i)])
  return total
}

export function buildOverview(input: {
  today: string
  dayVisits: Record<string, number>
  row: OverviewRow
  leadEmails: string[]
  testEmails: Set<string>
}): Overview {
  const { today, dayVisits, row, leadEmails, testEmails } = input
  const nonLeads = new Set((row.non_lead_emails ?? []).map((e) => String(e).trim().toLowerCase()))
  const leads = new Set<string>()
  for (const raw of leadEmails) {
    const email = String(raw ?? '').trim().toLowerCase()
    if (!email.includes('@') || nonLeads.has(email) || testEmails.has(email)) continue
    leads.add(email)
  }
  return {
    visits: {
      week: sumDays(dayVisits, today, 0, 7),
      weekBefore: sumDays(dayVisits, today, 7, 14),
      month: sumDays(dayVisits, today, 0, 30),
      monthBefore: sumDays(dayVisits, today, 30, 60),
    },
    members: { total: count(row.members_total), week: count(row.members_week), month: count(row.members_month) },
    activeWeek: count(row.active_week),
    leads: leads.size,
    paying: null,
  }
}

const emailOf = (r: unknown): string =>
  r && typeof r === 'object' && typeof (r as { email?: unknown }).email === 'string'
    ? (r as { email: string }).email
    : ''

/** Lower-cased emails of the leads flagged as test (bestie:leadflag:* with test === true). */
export async function testEmailsFrom(kv: OverviewKv): Promise<Set<string>> {
  const flags = ((await kv.getByPrefix('bestie:leadflag:')) || []).filter(Boolean) as { email?: unknown; test?: unknown }[]
  return new Set(
    flags.filter((f) => f.test === true).map((f) => emailOf(f).trim().toLowerCase()).filter(Boolean),
  )
}

/** Gathers everything and builds the Overview. */
export async function loadOverview(deps: OverviewDeps): Promise<Overview> {
  const today = dubaiDate((deps.now ?? (() => new Date()))())
  const { kv } = deps
  const testEmails = await testEmailsFrom(kv)
  const [adminIds, waitlist, signups, nourish] = await Promise.all([
    deps.adminIds(),
    kv.getByPrefix('waitlist:bestie:'),
    kv.getByPrefix('plan:signup:'),
    kv.getByPrefix('nourish:lead:'),
  ])
  const row = (await deps.queryRow(adminIds, [...testEmails])) ?? {}
  const dates = Array.from({ length: 60 }, (_, i) => daysBefore(today, i))
  const dayVisits: Record<string, number> = {}
  const counts = await Promise.all(dates.map((d) => visitsForDay(d, kv)))
  dates.forEach((d, i) => { dayVisits[d] = counts[i] })
  const leadEmails = [...(waitlist || []), ...(signups || []), ...(nourish || [])].filter(Boolean).map(emailOf)
  return buildOverview({ today, dayVisits, row, leadEmails, testEmails })
}
