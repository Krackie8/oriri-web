/**
 * Bestie (GLOSSARY.md): a Member's Check-in in, her Day plan out.
 * - One Suggestion per Pillar, fitted into her time and budget together. A two-Pillar item fills
 *   both of its Pillars with one Suggestion. A Pillar that nothing fits gets its light version.
 * - Each Suggestion has a "why" line; outdoor ones also name today's Dubai sunset, and in the hot
 *   months (May to October) outdoor ranks below indoor but is never banned.
 * - The plan's day is the Dubai calendar date. Checking in again the same day replaces the plan,
 *   and its open Suggestions are marked replaced; completed, swapped and skipped ones stay.
 * - The Check-in and every Suggestion (outcome shown, with the engine version) are recorded
 *   before the plan is returned.
 * - Learning (#71, DEC-008): what she completed (+3), accepted (+1), skipped or swapped (-2) moves
 *   an item up or down, fading in a straight line to nothing over 30 days. Nothing but a light
 *   version is suggested two days running. One Suggestion per plan is new for her when one fits,
 *   and one day in three that slot leans towards her weakest Pillar.
 * - Swap: she picks from up to three that still fit with the rest of today's plan. The old one is
 *   recorded swapped; her pick and the ones she passed on point back to it.
 *
 * No Deno or network code here, so vitest drives it with the in-memory store.
 * The Postgres store lives in index.tsx (its SQL is replayed in supabase/tests/day_plan_store.test.sql).
 */
import { HOME_AREAS } from './join.ts'
import { CATALOGUE_SEED, type Energy, type Goal, type Pillar, type SeedItem } from './catalogueSeed.ts'
import { HOT_MONTHS, skyHint } from './morning.ts'
import { burstFlags, dubaiDayBounds, gateOpensAt, mealtimeOf, stripJpegMetadata, type LiveCompletion, type Mealtime } from './proof.ts'
import {
  emptySums, levelsFrom, nextAt, pointsFor, progressChanges, statusName, statusOf, PILLAR_ORDER,
  type Levels, type ProgressChanges, type RecordedRow, type Status, type Sums, type Tier,
} from './progress.ts'

export type { Energy, Goal, Pillar }

/** Names the plan-fitting rules. Bump it whenever they change (a fingerprint test enforces this). */
export const BESTIE_ENGINE_VERSION = 'bestie-3'

export const PILLARS: Pillar[] = ['move', 'meal', 'mindset', 'meet_up']
const ENERGIES: Energy[] = ['low', 'steady', 'high']
const GOALS: Goal[] = ['recharge', 'focus', 'glow', 'connect', 'unwind']
const PILLAR_NAME: Record<Pillar, string> = { move: 'Move', meal: 'Meal', mindset: 'Mindset', meet_up: 'Meet up' }

export interface CatalogueItem extends SeedItem {
  id: string
}

export type Outcome = 'shown' | 'accepted' | 'swapped' | 'skipped' | 'completed' | 'replaced' | 'not_picked'

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
  is_new_for_you: boolean
  reason: string
  outcome: Outcome
  engine_version: string
  replaces_id: string | null
  /** When she was shown it (her Check-in, or the swap): the time gate starts here. */
  created_at: string
}

export interface StoredPlan {
  plan: DayPlanRow
  checkIn: CheckInRow
  suggestions: SuggestionRow[]
  /** The live (not undone) Completions of this plan's Suggestions. */
  completions: { id: string; suggestion_id: string; completed_at: string }[]
}

export type NewSuggestion = Omit<SuggestionRow, 'id' | 'outcome' | 'replaces_id' | 'created_at'>

export interface NewPlan {
  memberId: string
  planDate: string
  at: string
  checkIn: Omit<CheckInRow, 'id' | 'member_id' | 'created_at'>
  suggestions: NewSuggestion[]
}

export interface NewSwap {
  memberId: string
  planId: string
  /** The Suggestion she swapped away. */
  oldId: string
  at: string
  picked: NewSuggestion
  passedOn: NewSuggestion[]
}

/** One Suggestion she was given, with its day, for learning. */
export interface HistoryRow {
  catalogue_item_id: string
  pillar: Pillar
  outcome: Outcome
  plan_date: string
}

export type ProofKind = 'tick' | 'reflection' | 'reach_out'

/** A Completion, with what the rules need from its Suggestion. */
export interface CompletionRow {
  id: string
  member_id: string
  suggestion_id: string
  catalogue_item_id: string
  /** When its Suggestion was shown. */
  shown_at: string
  proof_kind: ProofKind
  reflection: string | null
  photo_path: string | null
  flagged: boolean
  flag_reason: string | null
  completed_at: string
  undone_at: string | null
}

/** A Suggestion she wants to complete, with its plan. */
export interface CompletionTarget {
  suggestion: SuggestionRow
  plan_date: string
  plan_active: boolean
}

export interface NewCompletion {
  memberId: string
  suggestionId: string
  proofKind: ProofKind
  reflection: string | null
  at: string
  /** Flag the new Completion too. */
  flagNew: boolean
  /** Her earlier live Completions today that join the flagged burst. */
  flagIds: string[]
  flagReason: string
  /** The ledger rows this Completion earns, written in the same transaction (#73). */
  points: { pillar: Pillar; amount: number }[]
}

/** What her ledger and member_levels hold, as progressChanges reads them. */
export interface ProgressInputs {
  sums: Sums
  recorded: RecordedRow[]
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
  /** Her Suggestions on plans dated from `sinceDate` on, any outcome. */
  history(memberId: string, sinceDate: string): Promise<HistoryRow[]>
  /** Every Catalogue item she has ever been shown. */
  everShown(memberId: string): Promise<string[]>
  /** Moves her Suggestion from one of `from` to `to`; false when it is not hers or not in `from`. */
  setOutcome(memberId: string, suggestionId: string, from: Outcome[], to: Outcome, at: string): Promise<boolean>
  /**
   * In one transaction: mark the old Suggestion swapped (only if still shown or accepted), then record
   * her pick as shown and the ones she passed on as not_picked, all pointing to it. Null if it was no longer open.
   */
  recordSwap(s: NewSwap): Promise<StoredPlan | null>
  /** Her Suggestion with its plan, any outcome; null when it is not hers. */
  suggestionToComplete(memberId: string, suggestionId: string): Promise<CompletionTarget | null>
  /** Her live (not undone) Completions with completed_at in [from, to). */
  liveCompletionsBetween(memberId: string, from: string, to: string): Promise<CompletionRow[]>
  /**
   * In one transaction: move the Suggestion from shown or accepted to completed, record the Completion
   * and set the flags. Null (and nothing written) if the Suggestion was no longer open.
   */
  recordCompletion(c: NewCompletion): Promise<string | null>
  /** Her Completion, live or undone; null when it is not hers. */
  completion(memberId: string, completionId: string): Promise<CompletionRow | null>
  /**
   * In one transaction: set undone_at (only if still live) and move its Suggestion from completed back
   * to shown, or to replaced when its plan has been replaced since, and write one negative ledger row
   * per award (reason 'undo'). False if it was not live.
   */
  undoCompletion(memberId: string, completionId: string, at: string): Promise<boolean>
  /** Her per-Pillar sums from ledger rows created before `before`, and her member_levels rows reached before it (all, when null). */
  progressInputs(memberId: string, before: string | null): Promise<ProgressInputs>
  /**
   * In one transaction under her member-row lock: read her inputs, ask `decide`, then record its Level
   * rows and moment (at `at`) and delete the rows it retracts. Returns what `decide` returned.
   */
  settleProgress(memberId: string, at: string, decide: (i: ProgressInputs) => ProgressChanges): Promise<ProgressChanges>
  /** Sets or clears the photo path of her live Completion. */
  setPhoto(memberId: string, completionId: string, path: string | null): Promise<boolean>
  /** Her live Completions since `since`, newest first. */
  journal(memberId: string, since: string): Promise<CompletionRow[]>
}

/** Where photos live: the private bucket, reached only by the edge function. */
export interface PhotoStore {
  put(path: string, jpeg: Uint8Array): Promise<void>
  remove(path: string): Promise<void>
  signedUrl(path: string, seconds: number): Promise<string>
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
  newForYou: boolean
  /** When the time gate opens: she can complete it from then on. */
  readyAt: string
  /** Her live Completion of it, or null. */
  done: { completionId: string; at: string } | null
}

export interface DayPlan {
  id: string
  date: string
  engineVersion: string
  checkIn: { energy: Energy; minutes: number; budgetAed: number; goal: Goal | null; area: string }
  suggestions: SuggestionView[]
}

/** One of the swap choices: a Catalogue item, not yet a Suggestion. */
export interface SwapOption {
  catalogueItemId: string
  slug: string
  title: string
  pillars: Pillar[]
  minutes: number
  costAed: number
  light: boolean
  outdoor: boolean
  why: string
}

export type CheckInOutcome =
  | { outcome: 'planned'; plan: DayPlan }
  | { outcome: 'notJoined' }
  | { outcome: 'invalid'; message: string }

export type SwapOptionsOutcome = { outcome: 'options'; options: SwapOption[] } | { outcome: 'notJoined' } | { outcome: 'notFound' }
export type ChangeOutcome = { outcome: 'planned'; plan: DayPlan } | { outcome: 'notJoined' } | { outcome: 'notFound' } | { outcome: 'notOffered' }
/** What a Completion or undo did to her Levels and Status. */
export interface Progress {
  levelUps: { pillar: Pillar; level: number }[]
  moment: (Status & { name: string }) | null
}
export interface ProfileView {
  levels: Levels
  /** Her Levels as they were 30 days ago: the chart's inner outline. */
  levels30: Levels
  points: Sums
  /** Points that reach her next Level, per Pillar; null at Level 10. */
  nextAt: Record<Pillar, number | null>
  status: Status & { name: string }
  /** Her Status moments, newest first. */
  moments: (Status & { name: string; at: string })[]
}
export type ProfileOutcome = { outcome: 'profile'; profile: ProfileView } | { outcome: 'notJoined' }
export type CompleteOutcome =
  | { outcome: 'planned'; plan: DayPlan; progress: Progress }
  | { outcome: 'notJoined' }
  | { outcome: 'notFound' }
  | { outcome: 'tooSoon'; readyAt: string }
  | { outcome: 'reflectionNeeded' }
  | { outcome: 'reflectionTooLong' }
  | { outcome: 'mealCapped'; mealtime: Mealtime }
  | { outcome: 'reachOutCapped' }
export type UndoOutcome = { outcome: 'planned'; plan: DayPlan; progress: Progress } | { outcome: 'notJoined' } | { outcome: 'notFound' }
export type PhotoOutcome = { outcome: 'saved' } | { outcome: 'deleted' } | { outcome: 'notJoined' } | { outcome: 'notFound' } | { outcome: 'notJpeg' } | { outcome: 'tooLarge' }
export interface JournalEntry {
  completionId: string
  title: string
  pillars: Pillar[]
  reflection: string | null
  completedAt: string
  photoUrl: string | null
}

/* ── Dubai time ─────────────────────────────────────────────────────────── */
const DUBAI_OFFSET_MS = 4 * 3600_000 // UTC+4, no daylight saving
const DAY_MS = 86_400_000
const dubai = (now: Date) => new Date(now.getTime() + DUBAI_OFFSET_MS)
const dubaiDate = (now: Date) => dubai(now).toISOString().slice(0, 10)
const dayNumber = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / DAY_MS)
const addDays = (date: string, n: number) => new Date((dayNumber(date) + n) * DAY_MS).toISOString().slice(0, 10)
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

/* ── Learning ───────────────────────────────────────────────────────────── */
const POINTS: Partial<Record<Outcome, number>> = { completed: 3, accepted: 1, skipped: -2, swapped: -2 }
const FADE_DAYS = 30

/** How much her history lifts (or lowers) an item today: each outcome fades to nothing over 30 days. */
export function personalWeight(rows: HistoryRow[], itemId: string, today: string): number {
  let w = 0
  for (const r of rows) {
    if (r.catalogue_item_id !== itemId) continue
    const age = dayNumber(today) - dayNumber(r.plan_date)
    w += (POINTS[r.outcome] ?? 0) * Math.max(0, 1 - age / FADE_DAYS)
  }
  return w
}

/** One day in three the new-for-you slot leans towards her weakest Pillar. */
export const leansWeakest = (planDate: string) => dayNumber(planDate) % 3 === 0

/** Her Pillar with the fewest Completions in the last 30 days (Levels arrive in #73). */
function weakestPillar(rows: HistoryRow[], today: string): Pillar {
  const since = addDays(today, -FADE_DAYS)
  const count = (p: Pillar) => rows.filter((r) => r.outcome === 'completed' && r.pillar === p && r.plan_date >= since).length
  return PILLARS.reduce((best, p) => (count(p) < count(best) ? p : best), PILLARS[0])
}

interface Ctx {
  input: Input
  hot: boolean
  weight: (i: CatalogueItem) => number
  /** Not to be suggested today, except as a light version. */
  banned: Set<string>
}

async function context(store: BestieStore, memberId: string, input: Input, today: string) {
  const [catalogue, history, ever] = await Promise.all([
    store.catalogue('dubai'), store.history(memberId, addDays(today, -FADE_DAYS)), store.everShown(memberId),
  ])
  const yesterday = addDays(today, -1)
  const weights = new Map(catalogue.map((i) => [i.id, personalWeight(history, i.id, today)]))
  const ctx: Ctx = {
    input,
    hot: HOT_MONTHS.includes(dubai(new Date(`${today}T08:00:00Z`)).getUTCMonth()),
    weight: (i) => weights.get(i.id) ?? 0,
    banned: new Set(history.filter((r) => r.plan_date === yesterday && r.outcome !== 'not_picked').map((r) => r.catalogue_item_id)),
  }
  return { catalogue, history, ever: new Set(ever), ctx }
}

/* ── Fitting ────────────────────────────────────────────────────────────── */
/** Items whose only goal is Connect are offered only to a Member who picked Connect. */
const offered = (i: CatalogueItem, input: Input) =>
  i.energyFit.includes(input.energy) && !(i.goals.length === 1 && i.goals[0] === 'connect' && input.goal !== 'connect')

const rank = (i: CatalogueItem, ctx: Ctx) => [
  ctx.hot && i.outdoor ? 0 : 1, // in the heat, indoor first
  ctx.weight(i), // what she has done, accepted or skipped lately
  i.pillars.length, // two-Pillar items save time
  ctx.input.goal && i.goals.includes(ctx.input.goal) ? 1 : 0,
  i.costAed, // she told us her budget: use it
  i.durationMin,
]
const better = (ctx: Ctx) => (a: CatalogueItem, b: CatalogueItem) => {
  const ra = rank(a, ctx), rb = rank(b, ctx)
  for (let k = 0; k < ra.length; k++) if (ra[k] !== rb[k]) return rb[k] - ra[k]
  return a.slug < b.slug ? -1 : 1
}
const lightFor = (catalogue: CatalogueItem[], p: Pillar, energy: Energy) =>
  catalogue
    .filter((i) => i.light && i.fallback && i.pillars.length === 1 && i.pillars[0] === p && i.energyFit.includes(energy))
    .sort((a, b) => a.durationMin - b.durationMin || (a.slug < b.slug ? -1 : 1))[0]
const samePillars = (a: CatalogueItem, b: CatalogueItem) => [...a.pillars].sort().join() === [...b.pillars].sort().join()

/** The fitted items, and the light versions given because a fuller pick for that Pillar did not fit her time. */
function fit(catalogue: CatalogueItem[], ctx: Ctx): { items: CatalogueItem[]; shortOnTime: Set<string> } {
  const { input } = ctx
  let timeLeft = input.minutes
  let moneyLeft = input.budgetAed
  const filled = new Set<Pillar>()
  const picked: CatalogueItem[] = []
  const shortOnTime = new Set<string>()
  const order: Pillar[] = input.goal === 'connect' ? ['meet_up', 'move', 'meal', 'mindset'] : PILLARS
  // Time held back for the light versions of Pillars still open, so the whole plan fits.
  const reserveAfter = (covers: Pillar[]) =>
    PILLARS.filter((q) => !filled.has(q) && !covers.includes(q)).reduce((t, q) => t + (lightFor(catalogue, q, input.energy)?.durationMin ?? 0), 0)
  for (const p of order) {
    if (filled.has(p)) continue
    const pick = catalogue
      .filter((i) => !i.light && !ctx.banned.has(i.id) && i.pillars.includes(p) && i.pillars.every((q) => !filled.has(q)) && offered(i, input)
        && i.durationMin + reserveAfter(i.pillars) <= timeLeft && i.costAed <= moneyLeft)
      .sort(better(ctx))[0]
    if (!pick) continue
    picked.push(pick)
    pick.pillars.forEach((q) => filled.add(q))
    timeLeft -= pick.durationMin
    moneyLeft -= pick.costAed
  }
  for (const p of PILLARS) {
    if (filled.has(p)) continue
    const fallback = lightFor(catalogue, p, input.energy)
    if (!fallback) throw new Error(`catalogue has no light fallback for ${p}`)
    const fullerButTooLong = catalogue.some((i) => !i.light && !ctx.banned.has(i.id) && i.pillars.includes(p) && offered(i, input) && i.costAed <= moneyLeft)
    if (fullerButTooLong) shortOnTime.add(fallback.id)
    picked.push(fallback)
    filled.add(p)
    timeLeft -= fallback.durationMin
  }
  return { items: picked.sort((a, b) => PILLARS.indexOf(a.pillars[0]) - PILLARS.indexOf(b.pillars[0])), shortOnTime }
}

/**
 * The new-for-you slot: a pick she has never been shown, or else one swapped in for a pick covering
 * the same Pillars that still fits. Tried in Pillar order, her weakest Pillar first on a leaning day.
 */
function newForYou(catalogue: CatalogueItem[], items: CatalogueItem[], ctx: Ctx, ever: Set<string>, lean: Pillar | null): { items: CatalogueItem[]; fresh: string | null } {
  const order = lean ? [lean, ...PILLARS.filter((p) => p !== lean)] : PILLARS
  const full = (p: Pillar) => items.find((i) => !i.light && i.pillars.includes(p))
  for (const p of order) {
    const i = full(p)
    if (i && !ever.has(i.id)) return { items, fresh: i.id }
  }
  const slackMin = ctx.input.minutes - items.reduce((t, i) => t + i.durationMin, 0)
  const slackAed = ctx.input.budgetAed - items.reduce((t, i) => t + i.costAed, 0)
  for (const p of order) {
    const old = full(p)
    if (!old) continue
    const swapIn = catalogue
      .filter((i) => !i.light && !ever.has(i.id) && !ctx.banned.has(i.id) && !items.includes(i) && samePillars(i, old) && offered(i, ctx.input)
        && i.durationMin <= old.durationMin + slackMin && i.costAed <= old.costAed + slackAed)
      .sort(better(ctx))[0]
    if (swapIn) return { items: items.map((i) => (i === old ? swapIn : i)), fresh: swapIn.id }
  }
  return { items, fresh: null }
}

const GOAL_LINE: Record<Goal, string> = {
  recharge: 'It helps you recharge.', focus: 'It helps you focus.', glow: 'Good for that glow.',
  connect: 'Easy to do with a friend.', unwind: 'It helps you unwind.',
}

function why(i: CatalogueItem, input: Input, date: string, shortOnTime: boolean, fresh = false): string {
  const parts: string[] = []
  if (fresh) parts.push('New for you.')
  if (i.light) parts.push(shortOnTime ? 'Short on time today, so here is a light version. It still counts.' : 'A light version for today. It still counts.')
  else if (i.pillars.length > 1) parts.push(`Counts for ${i.pillars.map((p) => PILLAR_NAME[p]).join(' + ')}, and it saves time.`)
  else if (input.energy === 'low') parts.push('You said low energy, so this one is gentle.')
  else if (input.goal && i.goals.includes(input.goal)) parts.push(GOAL_LINE[input.goal])
  else parts.push(i.costAed > 0 ? `Fits your ${input.minutes} minutes and AED ${input.budgetAed}.` : `Fits your ${input.minutes} minutes, and it's free.`)
  const { hot, sunset } = skyHint(date)
  if (i.outdoor) parts.push(hot ? `Go after the ${sunset} sunset, when it's cooler.` : `Sunset is around ${sunset}.`)
  else if (hot && i.costAed > 0 && (i.kind === 'workout' || i.kind === 'recovery')) parts.push('Indoors and air-conditioned, so any time works.')
  return parts.join(' ')
}

/** What she sees: the Suggestions still in her plan (not swapped away, skipped or passed on). */
const IN_PLAN: Outcome[] = ['shown', 'accepted', 'completed']
/** What she can still swap or skip. */
const OPEN: Outcome[] = ['shown', 'accepted']

function view(stored: StoredPlan, byId: Map<string, CatalogueItem>): DayPlan {
  const c = stored.checkIn
  const live = stored.suggestions.filter((s) => IN_PLAN.includes(s.outcome))
  const doneBy = new Map(stored.completions.map((x) => [x.suggestion_id, x]))
  return {
    id: stored.plan.id,
    date: stored.plan.plan_date,
    engineVersion: live[0]?.engine_version ?? BESTIE_ENGINE_VERSION,
    checkIn: { energy: c.energy, minutes: c.time_min, budgetAed: c.budget_aed, goal: c.goal, area: c.area },
    suggestions: live.map((s) => {
      const i = byId.get(s.catalogue_item_id)
      if (!i) throw new Error(`suggestion ${s.id} points at a missing catalogue item`)
      return {
        id: s.id, slug: i.slug, title: i.title, pillars: i.pillars, minutes: i.durationMin, costAed: i.costAed,
        light: s.is_light, outdoor: i.outdoor, energyFit: i.energyFit, why: s.reason, newForYou: s.is_new_for_you,
        readyAt: gateOpensAt(s.created_at, i.durationMin).toISOString(),
        done: doneBy.has(s.id) ? { completionId: doneBy.get(s.id)!.id, at: doneBy.get(s.id)!.completed_at } : null,
      }
    }),
  }
}

const inputOf = (c: CheckInRow): Input => ({ energy: c.energy, minutes: c.time_min, budgetAed: Number(c.budget_aed), goal: c.goal, area: c.area })

export async function checkIn(store: BestieStore, user: { id: string }, raw: unknown, now: Date): Promise<CheckInOutcome> {
  const member = await store.getMember(user.id)
  if (!member) return { outcome: 'notJoined' }
  const input = parse(raw, member.home_area)
  if (typeof input === 'string') return { outcome: 'invalid', message: input }

  const today = dubaiDate(now)
  const { catalogue, history, ever, ctx } = await context(store, member.id, input, today)
  const fitted = fit(catalogue, ctx)
  const lean = leansWeakest(today) ? weakestPillar(history, today) : null
  const { items, fresh } = newForYou(catalogue, fitted.items, ctx, ever, lean)
  const stored = await store.recordPlan({
    memberId: member.id,
    planDate: today,
    at: now.toISOString(),
    checkIn: { energy: input.energy, time_min: input.minutes, budget_aed: input.budgetAed, goal: input.goal, city: 'dubai', area: input.area },
    suggestions: items.map((i) => ({
      catalogue_item_id: i.id, pillar: i.pillars[0], is_light: i.light, is_new_for_you: i.id === fresh,
      reason: why(i, input, today, fitted.shortOnTime.has(i.id), i.id === fresh), engine_version: BESTIE_ENGINE_VERSION,
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

/* ── Swap and skip ──────────────────────────────────────────────────────── */
type Open =
  | { outcome: 'notJoined' }
  | { outcome: 'notFound' }
  | { outcome: 'open'; memberId: string; stored: StoredPlan; target: SuggestionRow; today: string }

/** Her Suggestion in today's active plan, still open to swap or skip. */
async function openSuggestion(store: BestieStore, user: { id: string }, suggestionId: string, now: Date): Promise<Open> {
  const member = await store.getMember(user.id)
  if (!member) return { outcome: 'notJoined' }
  const today = dubaiDate(now)
  const stored = await store.activePlan(member.id, today)
  const target = stored?.suggestions.find((s) => s.id === suggestionId && OPEN.includes(s.outcome))
  if (!stored || !target) return { outcome: 'notFound' }
  return { outcome: 'open', memberId: member.id, stored, target, today }
}

async function alternatives(store: BestieStore, o: Extract<Open, { outcome: 'open' }>) {
  const input = inputOf(o.stored.checkIn)
  const { catalogue, history, ctx } = await context(store, o.memberId, input, o.today)
  const byId = new Map(catalogue.map((i) => [i.id, i]))
  const old = byId.get(o.target.catalogue_item_id)
  if (!old) return { options: [] as CatalogueItem[], input, byId }
  const others = o.stored.suggestions.filter((s) => s.id !== o.target.id && IN_PLAN.includes(s.outcome)).map((s) => byId.get(s.catalogue_item_id)).filter(Boolean) as CatalogueItem[]
  const timeLeft = input.minutes - others.reduce((t, i) => t + i.durationMin, 0)
  const moneyLeft = input.budgetAed - others.reduce((t, i) => t + i.costAed, 0)
  const shownToday = new Set(history.filter((r) => r.plan_date === o.today).map((r) => r.catalogue_item_id))
  const fits = (i: CatalogueItem) => !shownToday.has(i.id) && i.durationMin <= timeLeft && i.costAed <= moneyLeft
  const light = old.pillars.length === 1 ? lightFor(catalogue, old.pillars[0], input.energy) : undefined
  const withLight = light && fits(light) ? [light] : []
  const fuller = catalogue
    .filter((i) => !i.light && !ctx.banned.has(i.id) && samePillars(i, old) && offered(i, input) && fits(i))
    .sort(better(ctx))
    .slice(0, 3 - withLight.length)
  return { options: [...fuller, ...withLight], input, byId }
}

/** Up to three things she could do instead. Looking records nothing. */
export async function swapOptions(store: BestieStore, user: { id: string }, suggestionId: string, now: Date): Promise<SwapOptionsOutcome> {
  const o = await openSuggestion(store, user, suggestionId, now)
  if (o.outcome !== 'open') return o
  const { options, input } = await alternatives(store, o)
  const today = dubaiDate(now)
  return {
    outcome: 'options',
    options: options.map((i) => ({
      catalogueItemId: i.id, slug: i.slug, title: i.title, pillars: i.pillars, minutes: i.durationMin, costAed: i.costAed,
      light: i.light, outdoor: i.outdoor, why: why(i, input, today, false),
    })),
  }
}

/** She picked one of the options: the old Suggestion is swapped, the pick shown, the rest not picked. */
export async function swapSuggestion(store: BestieStore, user: { id: string }, suggestionId: string, catalogueItemId: string, now: Date): Promise<ChangeOutcome> {
  const o = await openSuggestion(store, user, suggestionId, now)
  if (o.outcome !== 'open') return o
  const { options, input, byId } = await alternatives(store, o)
  const pick = options.find((i) => i.id === catalogueItemId)
  if (!pick) return { outcome: 'notOffered' }
  const today = dubaiDate(now)
  const row = (i: CatalogueItem): NewSuggestion => ({
    catalogue_item_id: i.id, pillar: i.pillars[0], is_light: i.light, is_new_for_you: false,
    reason: why(i, input, today, false), engine_version: BESTIE_ENGINE_VERSION,
  })
  const stored = await store.recordSwap({
    memberId: o.memberId, planId: o.stored.plan.id, oldId: o.target.id, at: now.toISOString(),
    picked: row(pick), passedOn: options.filter((i) => i !== pick).map(row),
  })
  if (!stored) return { outcome: 'notFound' }
  return { outcome: 'planned', plan: view(stored, byId) }
}

/** She doesn't want this one today. */
export async function skipSuggestion(store: BestieStore, user: { id: string }, suggestionId: string, now: Date): Promise<ChangeOutcome> {
  const o = await openSuggestion(store, user, suggestionId, now)
  if (o.outcome !== 'open') return o
  if (!(await store.setOutcome(o.memberId, o.target.id, OPEN, 'skipped', now.toISOString()))) return { outcome: 'notFound' }
  const plan = await todayPlan(store, user, now)
  return plan ? { outcome: 'planned', plan } : { outcome: 'notFound' }
}

/* ── Completing with Proof (#72, DEC-003) ───────────────────────────────── */
export const MAX_REFLECTION = 280
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
/** Photos are kept 12 months; the sweeper that removes older ones is its own ticket. */
export const PHOTO_KEEP_MONTHS = 12
const JOURNAL_DAYS = 30
const PHOTO_URL_SECONDS = 600

const proofKindOf = (i: CatalogueItem): ProofKind =>
  i.pillars.includes('mindset') ? 'reflection' : i.kind === 'reach_out' ? 'reach_out' : 'tick'
const asLive = (c: CompletionRow, byId: Map<string, CatalogueItem>): LiveCompletion => ({
  id: c.id, completedAt: c.completed_at, shownAt: c.shown_at, minutes: byId.get(c.catalogue_item_id)?.durationMin ?? 0,
})

/**
 * She marks one of today's Suggestions done. Only her own, open Suggestions from today's active plan;
 * only once its duration could have passed since she was shown it; one Meal per mealtime and one
 * reach-out a day; a Mindset needs a Reflection. A burst she could not have kept up is flagged
 * quietly: it changes nothing she sees.
 *
 * The caps are read before the write. Two Meal (or reach-out) Suggestions are never open at once,
 * because checking in again replaces the open ones, so two taps cannot race past a cap; two taps
 * on the same Suggestion are stopped by the one-live-Completion index.
 */
export async function complete(store: BestieStore, user: { id: string }, suggestionId: string, proof: { reflection?: unknown }, now: Date): Promise<CompleteOutcome> {
  const member = await store.getMember(user.id)
  if (!member) return { outcome: 'notJoined' }
  const target = await store.suggestionToComplete(member.id, suggestionId)
  if (!target || !target.plan_active || target.plan_date !== dubaiDate(now) || !OPEN.includes(target.suggestion.outcome)) return { outcome: 'notFound' }
  const catalogue = await store.catalogue('dubai')
  const byId = new Map(catalogue.map((i) => [i.id, i]))
  const item = byId.get(target.suggestion.catalogue_item_id)
  if (!item) return { outcome: 'notFound' }

  const readyAt = gateOpensAt(target.suggestion.created_at, item.durationMin)
  if (now < readyAt) return { outcome: 'tooSoon', readyAt: readyAt.toISOString() }

  const kind = proofKindOf(item)
  let reflection: string | null = null
  if (kind === 'reflection') {
    reflection = typeof proof.reflection === 'string' ? proof.reflection.trim() : ''
    if (!reflection) return { outcome: 'reflectionNeeded' }
    if (reflection.length > MAX_REFLECTION) return { outcome: 'reflectionTooLong' }
  }

  const { from, to } = dubaiDayBounds(now)
  const today = await store.liveCompletionsBetween(member.id, from, to)
  const itemOf = (c: CompletionRow) => byId.get(c.catalogue_item_id)
  if (item.pillars.includes('meal')) {
    const mealtime = mealtimeOf(now)
    if (today.some((c) => itemOf(c)?.pillars.includes('meal') && mealtimeOf(new Date(c.completed_at)) === mealtime)) return { outcome: 'mealCapped', mealtime }
  }
  if (item.kind === 'reach_out' && today.some((c) => itemOf(c)?.kind === 'reach_out')) return { outcome: 'reachOutCapped' }

  const NEW = '__new__'
  const flags = burstFlags([
    ...today.map((c) => asLive(c, byId)),
    { id: NEW, completedAt: now.toISOString(), shownAt: target.suggestion.created_at, minutes: item.durationMin },
  ])
  const id = await store.recordCompletion({
    memberId: member.id, suggestionId, proofKind: kind, reflection, at: now.toISOString(),
    flagNew: flags.includes(NEW), flagIds: flags.filter((f) => f !== NEW), flagReason: 'too_fast',
    points: pointsFor(item, kind),
  })
  if (!id) return { outcome: 'notFound' }
  const progress = await settle(store, member.id, now)
  const plan = await todayPlan(store, user, now)
  return plan ? { outcome: 'planned', plan, progress } : { outcome: 'notFound' }
}

/**
 * Records her Level-ups and Status moment after the ledger changed; a same-day undo takes them back.
 * Runs after the Completion (or undo) has committed. If it fails, that write still stands, so this reports
 * no change instead of an error; the next settle writes whatever is missing, and her Profile reads Levels
 * from the ledger either way.
 */
async function settle(store: BestieStore, memberId: string, now: Date): Promise<Progress> {
  const dayStart = dubaiDayBounds(now).from
  try {
    const ch = await store.settleProgress(memberId, now.toISOString(), (i) => progressChanges({ ...i, dayStart }))
    return { levelUps: ch.levelUps, moment: ch.moment ? { ...ch.moment, name: statusName(ch.moment) } : null }
  } catch (e) {
    console.log(`bestie settleProgress failed for a member: ${e}`)
    return { levelUps: [], moment: null }
  }
}

const PROFILE_LAYER_DAYS = 30
const floorOf = (rows: RecordedRow[]): Partial<Levels> => {
  const f: Partial<Levels> = {}
  for (const r of rows) if (r.kind === 'level' && r.pillar && r.level) f[r.pillar] = Math.max(f[r.pillar] ?? 1, r.level)
  return f
}

/** Her Profile: Levels on the spider chart (now and 30 days ago), her Status and her moments. Private to her. */
export async function profile(store: BestieStore, user: { id: string }, now: Date): Promise<ProfileOutcome> {
  const member = await store.getMember(user.id)
  if (!member) return { outcome: 'notJoined' }
  const cut = new Date(now.getTime() - PROFILE_LAYER_DAYS * DAY_MS).toISOString()
  const [nowIn, thenIn] = await Promise.all([store.progressInputs(member.id, null), store.progressInputs(member.id, cut)])
  const levels = levelsFrom(nowIn.sums, floorOf(nowIn.recorded))
  const status = statusOf(levels, nowIn.sums)
  const next = {} as Record<Pillar, number | null>
  for (const p of PILLAR_ORDER) next[p] = nextAt(levels[p])
  const moments = nowIn.recorded
    .filter((r) => r.kind === 'status' && r.shape && r.tier)
    .sort((a, b) => Date.parse(b.reachedAt) - Date.parse(a.reachedAt))
    .slice(0, 10)
    .map((r) => { const st = { shape: r.shape!, tier: r.tier as Tier }; return { ...st, name: statusName(st), at: r.reachedAt } })
  return {
    outcome: 'profile',
    profile: {
      levels, levels30: levelsFrom(thenIn.sums, floorOf(thenIn.recorded)), points: { ...emptySums(), ...nowIn.sums },
      nextAt: next, status: { ...status, name: statusName(status) }, moments,
    },
  }
}

/** Her live Completion from today (Dubai date), or null. */
async function todaysCompletion(store: BestieStore, memberId: string, completionId: string, now: Date) {
  const c = await store.completion(memberId, completionId)
  if (!c || c.undone_at) return null
  const { from, to } = dubaiDayBounds(now)
  const at = Date.parse(c.completed_at)
  return at >= Date.parse(from) && at < Date.parse(to) ? c : null
}

/** She undoes a mis-tap, the same day. The row stays as history; its photo goes now. */
export async function undoCompletion(store: BestieStore, photos: PhotoStore, user: { id: string }, completionId: string, now: Date): Promise<UndoOutcome> {
  const member = await store.getMember(user.id)
  if (!member) return { outcome: 'notJoined' }
  const c = await todaysCompletion(store, member.id, completionId, now)
  if (!c || !(await store.undoCompletion(member.id, c.id, now.toISOString()))) return { outcome: 'notFound' }
  if (c.photo_path) await photos.remove(c.photo_path)
  const progress = await settle(store, member.id, now)
  const plan = await todayPlan(store, user, now)
  return plan ? { outcome: 'planned', plan, progress } : { outcome: 'notFound' }
}

/** An optional photo for one of her Completions: JPEG only, every metadata segment removed, private. */
export async function attachPhoto(store: BestieStore, photos: PhotoStore, user: { id: string }, completionId: string, bytes: Uint8Array): Promise<PhotoOutcome> {
  const member = await store.getMember(user.id)
  if (!member) return { outcome: 'notJoined' }
  const c = await store.completion(member.id, completionId)
  if (!c || c.undone_at) return { outcome: 'notFound' }
  if (bytes.length > MAX_PHOTO_BYTES) return { outcome: 'tooLarge' }
  const clean = stripJpegMetadata(bytes)
  if (!clean) return { outcome: 'notJpeg' }
  const path = `${member.id}/${c.id}.jpg`
  await photos.put(path, clean)
  if (!(await store.setPhoto(member.id, c.id, path))) {
    await photos.remove(path)
    return { outcome: 'notFound' }
  }
  return { outcome: 'saved' }
}

/** She removes a photo herself. */
export async function deletePhoto(store: BestieStore, photos: PhotoStore, user: { id: string }, completionId: string): Promise<PhotoOutcome> {
  const member = await store.getMember(user.id)
  if (!member) return { outcome: 'notJoined' }
  const c = await store.completion(member.id, completionId)
  if (!c || c.undone_at || !c.photo_path) return { outcome: 'notFound' }
  await photos.remove(c.photo_path)
  await store.setPhoto(member.id, c.id, null)
  return { outcome: 'deleted' }
}

/** Her Journal: the last 30 days of Completions, newest first, with short-lived photo links. */
export async function journal(store: BestieStore, photos: PhotoStore, user: { id: string }, now: Date): Promise<{ entries: JournalEntry[] }> {
  const since = new Date(now.getTime() - JOURNAL_DAYS * DAY_MS).toISOString()
  const [rows, catalogue] = await Promise.all([store.journal(user.id, since), store.catalogue('dubai')])
  const byId = new Map(catalogue.map((i) => [i.id, i]))
  const entries = await Promise.all(rows.map(async (c) => {
    const i = byId.get(c.catalogue_item_id)
    return {
      completionId: c.id, title: i?.title ?? 'Something from Bestie', pillars: i?.pillars ?? [], reflection: c.reflection,
      completedAt: c.completed_at, photoUrl: c.photo_path ? await photos.signedUrl(c.photo_path, PHOTO_URL_SECONDS) : null,
    }
  }))
  return { entries }
}

/** In-memory photo store for tests. */
export function createMemoryPhotoStore() {
  const files = new Map<string, Uint8Array>()
  const store: PhotoStore & { files: typeof files } = {
    files,
    async put(path, jpeg) { files.set(path, jpeg) },
    async remove(path) { files.delete(path) },
    async signedUrl(path, seconds) { return `memory://${path}?expires=${seconds}` },
  }
  return store
}

/** In-memory store for tests. The Catalogue defaults to the seed, with ids `cat-<slug>`. */
export function createMemoryBestieStore(opts: { members?: { id: string; home_area: string | null }[]; catalogue?: CatalogueItem[] } = {}) {
  const members = new Map((opts.members ?? []).map((m) => [m.id, m]))
  const items = opts.catalogue ?? CATALOGUE_SEED.map((i) => ({ ...i, id: `cat-${i.slug}` }))
  const checkIns: CheckInRow[] = []
  const plans: (DayPlanRow & { status: 'active' | 'replaced' })[] = []
  const suggestions: (SuggestionRow & { day_plan_id: string; member_id: string })[] = []
  const completions: (Omit<CompletionRow, 'catalogue_item_id' | 'shown_at'>)[] = []
  const points: { id: number; member_id: string; pillar: Pillar; amount: number; reason: 'completion' | 'undo'; completion_id: string | null; created_at: string }[] = []
  const levelRows: { id: number; member_id: string; kind: 'level' | 'status'; pillar: Pillar | null; level: number | null; status_shape: string | null; status_tier: string | null; reached_at: string }[] = []
  let rowId = 1000
  const inputs = (memberId: string, before: string | null): ProgressInputs => {
    const sums = emptySums()
    for (const r of points) if (r.member_id === memberId && (!before || r.created_at < before)) sums[r.pillar] += r.amount
    const recorded = levelRows
      .filter((r) => r.member_id === memberId && (!before || r.reached_at < before))
      .map((r) => ({ id: String(r.id), kind: r.kind, pillar: r.pillar, level: r.level, shape: r.status_shape, tier: r.status_tier, reachedAt: r.reached_at }))
    return { sums, recorded }
  }
  const withSuggestion = (c: (typeof completions)[number]): CompletionRow => {
    const s = suggestions.find((x) => x.id === c.suggestion_id)!
    return { ...c, catalogue_item_id: s.catalogue_item_id, shown_at: s.created_at }
  }
  let n = 0
  const id = (p: string) => `${p}-${++n}`
  const load = (plan: DayPlanRow): StoredPlan => ({
    plan,
    checkIn: checkIns.find((c) => c.id === plan.check_in_id)!,
    suggestions: suggestions.filter((s) => s.day_plan_id === plan.id),
    completions: completions
      .filter((c) => !c.undone_at && suggestions.some((s) => s.id === c.suggestion_id && s.day_plan_id === plan.id))
      .map((c) => ({ id: c.id, suggestion_id: c.suggestion_id, completed_at: c.completed_at })),
  })
  const store: BestieStore & {
    checkIns: typeof checkIns; plans: typeof plans; suggestions: typeof suggestions; completions: typeof completions
    points: typeof points; levelRows: typeof levelRows
    /** Test helper: ledger points from an earlier Completion, at a time. */
    seedPoints(memberId: string, pillar: Pillar, amount: number, at: string): void
  } = {
    checkIns,
    plans,
    suggestions,
    completions,
    points,
    levelRows,
    seedPoints(memberId, pillar, amount, at) {
      points.push({ id: ++rowId, member_id: memberId, pillar, amount, reason: 'completion', completion_id: null, created_at: at })
    },
    async progressInputs(memberId, before) {
      return inputs(memberId, before)
    },
    async settleProgress(memberId, at, decide) {
      const ch = decide(inputs(memberId, null))
      for (let i = levelRows.length - 1; i >= 0; i--) if (levelRows[i].member_id === memberId && ch.retract.includes(String(levelRows[i].id))) levelRows.splice(i, 1)
      for (const u of ch.newLevelRows) levelRows.push({ id: ++rowId, member_id: memberId, kind: 'level', pillar: u.pillar, level: u.level, status_shape: null, status_tier: null, reached_at: at })
      if (ch.moment) levelRows.push({ id: ++rowId, member_id: memberId, kind: 'status', pillar: null, level: null, status_shape: ch.moment.shape, status_tier: ch.moment.tier, reached_at: at })
      return ch
    },
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
        for (const s of suggestions) if (s.day_plan_id === p.id && OPEN.includes(s.outcome)) s.outcome = 'replaced'
      }
      const c: CheckInRow = { ...np.checkIn, id: id('ci'), member_id: np.memberId, created_at: np.at }
      checkIns.push(c)
      const plan = { id: id('plan'), member_id: np.memberId, check_in_id: c.id, plan_date: np.planDate, created_at: np.at, status: 'active' as const }
      plans.push(plan)
      for (const s of np.suggestions) suggestions.push({ ...s, id: id('s'), outcome: 'shown', replaces_id: null, created_at: np.at, day_plan_id: plan.id, member_id: np.memberId })
      return load(plan)
    },
    async history(memberId, sinceDate) {
      return suggestions
        .filter((s) => s.member_id === memberId)
        .map((s) => ({ s, date: plans.find((p) => p.id === s.day_plan_id)!.plan_date }))
        .filter((x) => x.date >= sinceDate)
        .map(({ s, date }) => ({ catalogue_item_id: s.catalogue_item_id, pillar: s.pillar, outcome: s.outcome, plan_date: date }))
    },
    async everShown(memberId) {
      return [...new Set(suggestions.filter((s) => s.member_id === memberId).map((s) => s.catalogue_item_id))]
    },
    async setOutcome(memberId, suggestionId, from, to) {
      const s = suggestions.find((x) => x.id === suggestionId && x.member_id === memberId && from.includes(x.outcome))
      if (!s) return false
      s.outcome = to
      return true
    },
    async recordSwap(sw) {
      const old = suggestions.find((x) => x.id === sw.oldId && x.member_id === sw.memberId && x.day_plan_id === sw.planId && OPEN.includes(x.outcome))
      if (!old) return null
      old.outcome = 'swapped'
      const add = (s: NewSuggestion, outcome: Outcome) =>
        suggestions.push({ ...s, id: id('s'), outcome, replaces_id: old.id, created_at: sw.at, day_plan_id: sw.planId, member_id: sw.memberId })
      add(sw.picked, 'shown')
      for (const s of sw.passedOn) add(s, 'not_picked')
      return load(plans.find((p) => p.id === sw.planId)!)
    },
    async suggestionToComplete(memberId, suggestionId) {
      const s = suggestions.find((x) => x.id === suggestionId && x.member_id === memberId)
      if (!s) return null
      const p = plans.find((x) => x.id === s.day_plan_id)!
      const { day_plan_id: _plan, member_id: _member, ...suggestion } = s
      return { suggestion, plan_date: p.plan_date, plan_active: p.status === 'active' }
    },
    async liveCompletionsBetween(memberId, from, to) {
      return completions.filter((c) => c.member_id === memberId && !c.undone_at && c.completed_at >= from && c.completed_at < to).map(withSuggestion)
    },
    async recordCompletion(nc) {
      const s = suggestions.find((x) => x.id === nc.suggestionId && x.member_id === nc.memberId && OPEN.includes(x.outcome))
      if (!s) return null
      s.outcome = 'completed'
      for (const f of completions) if (nc.flagIds.includes(f.id) && f.member_id === nc.memberId) { f.flagged = true; f.flag_reason = nc.flagReason }
      const c = {
        id: id('c'), member_id: nc.memberId, suggestion_id: s.id, proof_kind: nc.proofKind, reflection: nc.reflection, photo_path: null,
        flagged: nc.flagNew, flag_reason: nc.flagNew ? nc.flagReason : null, completed_at: nc.at, undone_at: null,
      }
      completions.push(c)
      for (const x of nc.points) points.push({ id: ++rowId, member_id: nc.memberId, pillar: x.pillar, amount: x.amount, reason: 'completion', completion_id: c.id, created_at: nc.at })
      return c.id
    },
    async completion(memberId, completionId) {
      const c = completions.find((x) => x.id === completionId && x.member_id === memberId)
      return c ? withSuggestion(c) : null
    },
    async undoCompletion(memberId, completionId, at) {
      const c = completions.find((x) => x.id === completionId && x.member_id === memberId && !x.undone_at)
      if (!c) return false
      c.undone_at = at
      for (const x of points.filter((r) => r.completion_id === c.id && r.reason === 'completion'))
        points.push({ ...x, id: ++rowId, amount: -x.amount, reason: 'undo', created_at: at })
      const s = suggestions.find((x) => x.id === c.suggestion_id && x.outcome === 'completed')
      if (s) s.outcome = plans.find((p) => p.id === s.day_plan_id)!.status === 'active' ? 'shown' : 'replaced'
      return true
    },
    async setPhoto(memberId, completionId, path) {
      const c = completions.find((x) => x.id === completionId && x.member_id === memberId && !x.undone_at)
      if (!c) return false
      c.photo_path = path
      return true
    },
    async journal(memberId, since) {
      return completions
        .filter((c) => c.member_id === memberId && !c.undone_at && c.completed_at >= since)
        .map(withSuggestion)
        .sort((a, b) => (a.completed_at < b.completed_at ? 1 : -1))
    },
  }
  return store
}
