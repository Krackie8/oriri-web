/**
 * Bestie (GLOSSARY.md): a Member's Check-in in, her Day plan out.
 * - One Suggestion per Pillar, fitted into her time and budget together. A two-Pillar item fills
 *   both of its Pillars with one Suggestion. A Pillar that nothing fits gets its light version.
 * - Each Suggestion has a "why" line; outdoor ones also name today's Dubai sunset, and in the hot
 *   months (May to October) outdoor ranks below indoor but is never banned.
 * - The plan's day is the Dubai calendar date. Checking in again the same day replaces the plan,
 *   and its open Suggestions are marked replaced.
 * - The Check-in and every Suggestion (outcome shown, with the engine version) are recorded
 *   before the plan is returned.
 *
 * No Deno or network code here, so vitest drives it with the in-memory store.
 * The Postgres store lives in index.tsx (its SQL is replayed in supabase/tests/day_plan_store.test.sql).
 */
import { HOME_AREAS } from './join.ts'
import { CATALOGUE_SEED, type Energy, type Goal, type Pillar, type SeedItem } from './catalogueSeed.ts'

export type { Energy, Goal, Pillar }

/** Names the plan-fitting rules. Bump it whenever they change (a fingerprint test enforces this). */
export const BESTIE_ENGINE_VERSION = 'bestie-1'

export const PILLARS: Pillar[] = ['move', 'meal', 'mindset', 'meet_up']
const ENERGIES: Energy[] = ['low', 'steady', 'high']
const GOALS: Goal[] = ['recharge', 'focus', 'glow', 'connect', 'unwind']
const PILLAR_NAME: Record<Pillar, string> = { move: 'Move', meal: 'Meal', mindset: 'Mindset', meet_up: 'Meet up' }

export interface CatalogueItem extends SeedItem {
  id: string
}

export interface CheckInRow {
  id: string
  member_id: string
  energy: Energy
  time_min: number
  budget_aed: number
  goal: Goal | null
  city: string
  area: string
  created_at: string
}

export interface DayPlanRow {
  id: string
  member_id: string
  check_in_id: string
  plan_date: string
  created_at: string
}

export interface SuggestionRow {
  id: string
  catalogue_item_id: string
  pillar: Pillar
  is_light: boolean
  reason: string
  outcome: 'shown' | 'accepted' | 'swapped' | 'skipped' | 'completed' | 'replaced'
  engine_version: string
}

export interface StoredPlan {
  plan: DayPlanRow
  checkIn: CheckInRow
  suggestions: SuggestionRow[]
}

export interface NewPlan {
  memberId: string
  planDate: string
  at: string
  checkIn: Omit<CheckInRow, 'id' | 'member_id' | 'created_at'>
  suggestions: Omit<SuggestionRow, 'id' | 'outcome'>[]
}

/** The storage port. */
export interface BestieStore {
  getMember(id: string): Promise<{ id: string; home_area: string | null } | null>
  /** Live (not retired) Catalogue items for a city. */
  catalogue(city: string): Promise<CatalogueItem[]>
  activePlan(memberId: string, planDate: string): Promise<StoredPlan | null>
  /**
   * In one transaction: mark her active plan for that date replaced (and its shown or accepted
   * Suggestions replaced), then record the Check-in, the new active plan and its Suggestions as shown.
   */
  recordPlan(p: NewPlan): Promise<StoredPlan>
}

export interface SuggestionView {
  id: string
  slug: string
  title: string
  pillars: Pillar[]
  minutes: number
  costAed: number
  light: boolean
  outdoor: boolean
  energyFit: Energy[]
  why: string
}

export interface DayPlan {
  id: string
  date: string
  engineVersion: string
  checkIn: { energy: Energy; minutes: number; budgetAed: number; goal: Goal | null; area: string }
  suggestions: SuggestionView[]
}

export type CheckInOutcome =
  | { outcome: 'planned'; plan: DayPlan }
  | { outcome: 'notJoined' }
  | { outcome: 'invalid'; message: string }

/* ── Dubai time ─────────────────────────────────────────────────────────── */
const DUBAI_OFFSET_MS = 4 * 3600_000 // UTC+4, no daylight saving
const dubai = (now: Date) => new Date(now.getTime() + DUBAI_OFFSET_MS)
const dubaiDate = (now: Date) => dubai(now).toISOString().slice(0, 10)
/** Approximate sunset by month (0 = January). */
const SUNSET = ['6:00pm', '6:20pm', '6:30pm', '6:40pm', '6:55pm', '7:10pm', '7:10pm', '6:55pm', '6:30pm', '6:00pm', '5:35pm', '5:35pm']
const HOT_MONTHS = [4, 5, 6, 7, 8, 9] // May to October
/** The shortest Check-in: enough for a light version in every Pillar, which count against her time too. */
export const MIN_MINUTES = 30

interface Input {
  energy: Energy
  minutes: number
  budgetAed: number
  goal: Goal | null
  area: string
}

function parse(raw: unknown, homeArea: string | null): Input | string {
  const b = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  if (!ENERGIES.includes(b.energy as Energy)) return 'Please pick your energy.'
  const minutes = b.minutes
  if (typeof minutes !== 'number' || !Number.isInteger(minutes) || minutes < MIN_MINUTES || minutes > 720) return `Bestie needs at least ${MIN_MINUTES} minutes to fit something from every Pillar.`
  const budget = b.budgetAed
  if (typeof budget !== 'number' || !Number.isFinite(budget) || budget < 0 || budget > 10000) return 'Please pick a budget.'
  const goal = b.goal ?? null
  if (goal !== null && !GOALS.includes(goal as Goal)) return 'That goal is not one Bestie knows.'
  const area = b.area ?? homeArea ?? 'Somewhere else'
  if (typeof area !== 'string' || !(HOME_AREAS as readonly string[]).includes(area)) return 'Please pick an area.'
  return { energy: b.energy as Energy, minutes, budgetAed: budget, goal: goal as Goal | null, area }
}

/** Items whose only goal is Connect are offered only to a Member who picked Connect. */
const offered = (i: CatalogueItem, input: Input) =>
  i.energyFit.includes(input.energy) && !(i.goals.length === 1 && i.goals[0] === 'connect' && input.goal !== 'connect')

/** The fitted items, and the light versions given because a fuller pick for that Pillar did not fit her time. */
function fit(catalogue: CatalogueItem[], input: Input, hot: boolean): { items: CatalogueItem[]; shortOnTime: Set<string> } {
  let timeLeft = input.minutes
  let moneyLeft = input.budgetAed
  const filled = new Set<Pillar>()
  const picked: CatalogueItem[] = []
  const shortOnTime = new Set<string>()
  const order: Pillar[] = input.goal === 'connect' ? ['meet_up', 'move', 'meal', 'mindset'] : PILLARS
  const rank = (i: CatalogueItem) => [
    hot && i.outdoor ? 0 : 1, // in the heat, indoor first
    i.pillars.length, // two-Pillar items save time
    input.goal && i.goals.includes(input.goal) ? 1 : 0,
    i.costAed, // she told us her budget: use it
    i.durationMin,
  ]
  const better = (a: CatalogueItem, b: CatalogueItem) => {
    const ra = rank(a), rb = rank(b)
    for (let k = 0; k < ra.length; k++) if (ra[k] !== rb[k]) return rb[k] - ra[k]
    return a.slug < b.slug ? -1 : 1
  }
  const lightFor = (p: Pillar) =>
    catalogue
      .filter((i) => i.light && i.fallback && i.pillars.length === 1 && i.pillars[0] === p && i.energyFit.includes(input.energy))
      .sort((a, b) => a.durationMin - b.durationMin || (a.slug < b.slug ? -1 : 1))[0]
  // Time held back for the light versions of Pillars still open, so the whole plan fits.
  const reserveAfter = (covers: Pillar[]) =>
    PILLARS.filter((q) => !filled.has(q) && !covers.includes(q)).reduce((t, q) => t + (lightFor(q)?.durationMin ?? 0), 0)
  for (const p of order) {
    if (filled.has(p)) continue
    const pick = catalogue
      .filter((i) => !i.light && i.pillars.includes(p) && i.pillars.every((q) => !filled.has(q)) && offered(i, input)
        && i.durationMin + reserveAfter(i.pillars) <= timeLeft && i.costAed <= moneyLeft)
      .sort(better)[0]
    if (!pick) continue
    picked.push(pick)
    pick.pillars.forEach((q) => filled.add(q))
    timeLeft -= pick.durationMin
    moneyLeft -= pick.costAed
  }
  for (const p of PILLARS) {
    if (filled.has(p)) continue
    const fallback = lightFor(p)
    if (!fallback) throw new Error(`catalogue has no light fallback for ${p}`)
    const fullerButTooLong = catalogue.some((i) => !i.light && i.pillars.includes(p) && offered(i, input) && i.costAed <= moneyLeft)
    if (fullerButTooLong) shortOnTime.add(fallback.id)
    picked.push(fallback)
    filled.add(p)
    timeLeft -= fallback.durationMin
  }
  return { items: picked.sort((a, b) => PILLARS.indexOf(a.pillars[0]) - PILLARS.indexOf(b.pillars[0])), shortOnTime }
}

const GOAL_LINE: Record<Goal, string> = {
  recharge: 'It helps you recharge.', focus: 'It helps you focus.', glow: 'Good for that glow.',
  connect: 'Easy to do with a friend.', unwind: 'It helps you unwind.',
}

function why(i: CatalogueItem, input: Input, month: number, shortOnTime: boolean): string {
  const parts: string[] = []
  if (i.light) parts.push(shortOnTime ? 'Short on time today, so here is a light version. It still counts.' : 'A light version for today. It still counts.')
  else if (i.pillars.length > 1) parts.push(`Counts for ${i.pillars.map((p) => PILLAR_NAME[p]).join(' + ')}, and it saves time.`)
  else if (input.energy === 'low') parts.push('You said low energy, so this one is gentle.')
  else if (input.goal && i.goals.includes(input.goal)) parts.push(GOAL_LINE[input.goal])
  else parts.push(i.costAed > 0 ? `Fits your ${input.minutes} minutes and AED ${input.budgetAed}.` : `Fits your ${input.minutes} minutes, and it's free.`)
  const hot = HOT_MONTHS.includes(month)
  if (i.outdoor) parts.push(hot ? `Go after the ${SUNSET[month]} sunset, when it's cooler.` : `Sunset is around ${SUNSET[month]}.`)
  else if (hot && i.costAed > 0 && (i.kind === 'workout' || i.kind === 'recovery')) parts.push('Indoors and air-conditioned, so any time works.')
  return parts.join(' ')
}

function view(stored: StoredPlan, byId: Map<string, CatalogueItem>): DayPlan {
  const c = stored.checkIn
  return {
    id: stored.plan.id,
    date: stored.plan.plan_date,
    engineVersion: stored.suggestions[0]?.engine_version ?? BESTIE_ENGINE_VERSION,
    checkIn: { energy: c.energy, minutes: c.time_min, budgetAed: c.budget_aed, goal: c.goal, area: c.area },
    suggestions: stored.suggestions.map((s) => {
      const i = byId.get(s.catalogue_item_id)
      if (!i) throw new Error(`suggestion ${s.id} points at a missing catalogue item`)
      return {
        id: s.id, slug: i.slug, title: i.title, pillars: i.pillars, minutes: i.durationMin, costAed: i.costAed,
        light: s.is_light, outdoor: i.outdoor, energyFit: i.energyFit, why: s.reason,
      }
    }),
  }
}

export async function checkIn(store: BestieStore, user: { id: string }, raw: unknown, now: Date): Promise<CheckInOutcome> {
  const member = await store.getMember(user.id)
  if (!member) return { outcome: 'notJoined' }
  const input = parse(raw, member.home_area)
  if (typeof input === 'string') return { outcome: 'invalid', message: input }

  const month = dubai(now).getUTCMonth()
  const catalogue = await store.catalogue('dubai')
  const { items, shortOnTime } = fit(catalogue, input, HOT_MONTHS.includes(month))
  const stored = await store.recordPlan({
    memberId: member.id,
    planDate: dubaiDate(now),
    at: now.toISOString(),
    checkIn: { energy: input.energy, time_min: input.minutes, budget_aed: input.budgetAed, goal: input.goal, city: 'dubai', area: input.area },
    suggestions: items.map((i) => ({
      catalogue_item_id: i.id, pillar: i.pillars[0], is_light: i.light, reason: why(i, input, month, shortOnTime.has(i.id)), engine_version: BESTIE_ENGINE_VERSION,
    })),
  })
  return { outcome: 'planned', plan: view(stored, new Map(catalogue.map((i) => [i.id, i]))) }
}

/** Her active Day plan for today (Dubai date), or null. */
export async function todayPlan(store: BestieStore, user: { id: string }, now: Date): Promise<DayPlan | null> {
  const stored = await store.activePlan(user.id, dubaiDate(now))
  if (!stored) return null
  const catalogue = await store.catalogue('dubai')
  return view(stored, new Map(catalogue.map((i) => [i.id, i])))
}

/** In-memory store for tests. The Catalogue defaults to the seed, with ids `cat-<slug>`. */
export function createMemoryBestieStore(opts: { members?: { id: string; home_area: string | null }[]; catalogue?: CatalogueItem[] } = {}) {
  const members = new Map((opts.members ?? []).map((m) => [m.id, m]))
  const items = opts.catalogue ?? CATALOGUE_SEED.map((i) => ({ ...i, id: `cat-${i.slug}` }))
  const checkIns: CheckInRow[] = []
  const plans: (DayPlanRow & { status: 'active' | 'replaced' })[] = []
  const suggestions: (SuggestionRow & { day_plan_id: string; member_id: string })[] = []
  let n = 0
  const id = (p: string) => `${p}-${++n}`
  const load = (plan: DayPlanRow): StoredPlan => ({
    plan,
    checkIn: checkIns.find((c) => c.id === plan.check_in_id)!,
    suggestions: suggestions.filter((s) => s.day_plan_id === plan.id),
  })
  const store: BestieStore & { checkIns: typeof checkIns; plans: typeof plans; suggestions: typeof suggestions } = {
    checkIns,
    plans,
    suggestions,
    async getMember(memberId) {
      return members.get(memberId) ?? null
    },
    async catalogue() {
      return items
    },
    async activePlan(memberId, planDate) {
      const p = plans.find((x) => x.member_id === memberId && x.plan_date === planDate && x.status === 'active')
      return p ? load(p) : null
    },
    async recordPlan(np) {
      for (const p of plans.filter((x) => x.member_id === np.memberId && x.plan_date === np.planDate && x.status === 'active')) {
        p.status = 'replaced'
        for (const s of suggestions) if (s.day_plan_id === p.id && (s.outcome === 'shown' || s.outcome === 'accepted')) s.outcome = 'replaced'
      }
      const c: CheckInRow = { ...np.checkIn, id: id('ci'), member_id: np.memberId, created_at: np.at }
      checkIns.push(c)
      const plan = { id: id('plan'), member_id: np.memberId, check_in_id: c.id, plan_date: np.planDate, created_at: np.at, status: 'active' as const }
      plans.push(plan)
      for (const s of np.suggestions) suggestions.push({ ...s, id: id('s'), outcome: 'shown', day_plan_id: plan.id, member_id: np.memberId })
      return load(plan)
    },
  }
  return store
}
