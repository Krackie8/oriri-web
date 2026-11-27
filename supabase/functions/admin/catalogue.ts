/**
 * Catalogue review: the rules for a decision body, and the handlers that turn a SQL result into the
 * words Ren sees. Pure and Deno-free so vitest can import it under Node; index.tsx builds the real
 * deps (the SQL functions) and mounts the handlers.
 *
 * - A body keeps only its known fields, trimmed and checked; the first problem is the one she sees.
 * - 'bad_run' is never a reason a route accepts: only undo writes it.
 * - No ids or technical words in anything that goes back to her.
 */

import type { Context } from 'hono'
import type { AdminUser } from './app.ts'
import { isUuid } from './members.ts'

export const REJECT_REASONS = ['not_women_friendly', 'doesnt_feel_right', 'too_far', 'wrong_price', 'closed',
  'duplicate', 'not_a_fit', 'other'] as const
export type RejectReason = typeof REJECT_REASONS[number]
export type Decision = 'approved' | 'edited_approved' | 'rejected'

export interface PlaceDecisionBody { decision: Decision; reason?: RejectReason; note?: string
  activities: { catalogueItemId: string; approve: boolean; priceMinAed?: number; priceMaxAed?: number; durationMin?: number }[]
  edits?: { name?: string; area?: string; signals?: { id: string; text: string }[] } }
export interface ActivityDecisionBody { decision: Decision; reason?: RejectReason; note?: string
  edits?: { priceMinAed?: number; priceMaxAed?: number; durationMin?: number } }
export interface EventDecisionBody { decision: Decision; reason?: RejectReason; note?: string
  edits?: { title?: string; timeNote?: string; endsOn?: string } }
export interface ContentDecisionBody { decision: 'released' | 'removed'; note?: string }

export type DecideResult = 'decided' | 'notPending' | 'notHeld' | 'needsActivity' | 'activitiesMismatch'
  | 'noPosition' | 'placeNotApproved' | 'notFound'
export interface UndoResult { result: 'undone' | 'alreadyUndone' | 'stillRunning' | 'notFound'
  rejected: number; restored: number; skipped: { changeId: number; field: string }[] }

export interface CatalogueDeps {
  decidePlace(actor: string, placeId: string, body: PlaceDecisionBody): Promise<DecideResult>
  decideActivity(actor: string, placeId: string, itemId: string, body: ActivityDecisionBody): Promise<DecideResult>
  decideEvent(actor: string, itemId: string, body: EventDecisionBody): Promise<DecideResult>
  decideContent(actor: string, contentId: string, body: ContentDecisionBody): Promise<DecideResult>
  undoRun(actor: string, runId: string): Promise<UndoResult>
}

const LIMITS = { note: 280, signal: 140, name: 200, area: 200, timeNote: 140 }
const MAX_DURATION_MIN = 1440
const TOO_LONG = "That's longer than it can be."
const PICK_REASON = 'Pick a reason.'
const GONE = "That's no longer here."
const PRICE_ORDER = "Check the prices: the lowest can't be above the highest."
const PRICE_RANGE = 'Prices are in AED, from 0 to 5000.'
const NO_NAME = 'Give it a name.'
const UNCLEAR = "That didn't come through right. Try again."

export class Problem extends Error {}
const refuse = (problem: string): never => { throw new Problem(problem) }

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
function capped(v: unknown, max: number): string {
  const s = str(v)
  if (s.length > max) refuse(TOO_LONG)
  return s
}
const record = (v: unknown): Record<string, unknown> =>
  (v && typeof v === 'object' && !Array.isArray(v) ? v : refuse(UNCLEAR)) as Record<string, unknown>
const present = (v: unknown) => v !== undefined && v !== null && v !== ''

function price(v: unknown): number | undefined {
  if (!present(v)) return undefined
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 5000) return refuse(PRICE_RANGE)
  return v
}
function duration(v: unknown): number | undefined {
  if (!present(v)) return undefined
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > MAX_DURATION_MIN) return refuse(UNCLEAR)
  return v
}
/** Only the price and duration fields that were given, in range, and not upside down. */
function priceFields(o: Record<string, unknown>): { priceMinAed?: number; priceMaxAed?: number; durationMin?: number } {
  const out: { priceMinAed?: number; priceMaxAed?: number; durationMin?: number } = {}
  const min = price(o.priceMinAed)
  const max = price(o.priceMaxAed)
  const mins = duration(o.durationMin)
  if (min !== undefined) out.priceMinAed = min
  if (max !== undefined) out.priceMaxAed = max
  if (mins !== undefined) out.durationMin = mins
  if (min !== undefined && max !== undefined && min > max) refuse(PRICE_ORDER)
  return out
}

function realDate(v: unknown): string {
  const s = str(v)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return refuse(UNCLEAR)
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) refuse(UNCLEAR)
  return s
}

/** decision, reason and note: the reason only goes with a rejection, and a rejection needs one. */
function common(b: Record<string, unknown>): { decision: Decision; reason?: RejectReason; note?: string } {
  const d = b.decision
  if (d !== 'approved' && d !== 'edited_approved' && d !== 'rejected') refuse(UNCLEAR)
  const out: { decision: Decision; reason?: RejectReason; note?: string } = { decision: d as Decision }
  if (d === 'rejected') {
    if (!(REJECT_REASONS as readonly unknown[]).includes(b.reason)) refuse(PICK_REASON)
    out.reason = b.reason as RejectReason
  }
  const note = capped(b.note, LIMITS.note)
  if (note) out.note = note
  return out
}

function nameOf(v: unknown): string {
  const s = capped(v, LIMITS.name)
  if (!s) refuse(NO_NAME)
  return s
}

export function cleanPlaceDecision(body: unknown): PlaceDecisionBody {
  const b = record(body)
  const out = { ...common(b), activities: [] } as PlaceDecisionBody
  if (b.activities !== undefined && !Array.isArray(b.activities)) refuse(UNCLEAR)
  out.activities = ((b.activities ?? []) as unknown[]).map((raw) => {
    const a = record(raw)
    if (typeof a.catalogueItemId !== 'string' || !isUuid(a.catalogueItemId) || typeof a.approve !== 'boolean') refuse(UNCLEAR)
    return { catalogueItemId: a.catalogueItemId as string, approve: a.approve as boolean, ...priceFields(a) }
  })
  if (present(b.edits)) {
    const e = record(b.edits)
    const edits: NonNullable<PlaceDecisionBody['edits']> = {}
    if (e.name !== undefined) edits.name = nameOf(e.name)
    if (e.area !== undefined) {
      const area = capped(e.area, LIMITS.area)
      if (area) edits.area = area
    }
    if (e.signals !== undefined) {
      if (!Array.isArray(e.signals)) refuse(UNCLEAR)
      edits.signals = (e.signals as unknown[]).map((raw) => {
        const s = record(raw)
        if (typeof s.id !== 'string' || !s.id) refuse(UNCLEAR)
        return { id: s.id as string, text: capped(s.text, LIMITS.signal) }
      })
    }
    if (Object.keys(edits).length) out.edits = edits
  }
  return out
}

export function cleanActivityDecision(body: unknown): ActivityDecisionBody {
  const b = record(body)
  const out: ActivityDecisionBody = common(b)
  if (present(b.edits)) {
    const edits = priceFields(record(b.edits))
    if (Object.keys(edits).length) out.edits = edits
  }
  return out
}

export function cleanEventDecision(body: unknown): EventDecisionBody {
  const b = record(body)
  const out: EventDecisionBody = common(b)
  if (present(b.edits)) {
    const e = record(b.edits)
    const edits: NonNullable<EventDecisionBody['edits']> = {}
    if (e.title !== undefined) edits.title = nameOf(e.title)
    if (e.timeNote !== undefined) {
      const t = capped(e.timeNote, LIMITS.timeNote)
      if (t) edits.timeNote = t
    }
    if (present(e.endsOn)) edits.endsOn = realDate(e.endsOn)
    if (Object.keys(edits).length) out.edits = edits
  }
  return out
}

export function cleanContentDecision(body: unknown): ContentDecisionBody {
  const b = record(body)
  if (b.decision !== 'released' && b.decision !== 'removed') refuse(UNCLEAR)
  const out: ContentDecisionBody = { decision: b.decision as 'released' | 'removed' }
  const note = capped(b.note, LIMITS.note)
  if (note) out.note = note
  return out
}

/** HTTP status and the words Ren sees. */
export function answerFor(result: DecideResult): { status: number; body: { ok: true } | { problem: string } } {
  const said = (status: number, problem: string) => ({ status, body: { problem } })
  switch (result) {
    case 'decided': return { status: 200, body: { ok: true } }
    case 'notPending':
    case 'notHeld': return said(409, 'Someone already decided this one.')
    case 'needsActivity': return said(422, 'Pick at least one thing they offer, or reject the place.')
    case 'activitiesMismatch': return said(409, 'This place changed while you were looking. Open it again.')
    case 'noPosition': return said(422, "This place has no map position yet. It comes back after Saturday's run.")
    case 'placeNotApproved': return said(422, 'Approve the place first.')
    case 'notFound': return said(404, GONE)
  }
}

/* ── Routes ──────────────────────────────────────────────────────────────── */

const failed = (c: Context, what: string, err: unknown) => {
  console.error(`admin/catalogue: ${what} failed`, (err as { message?: string } | null)?.message)
  return c.json({ problem: 'Something went wrong. Try again.' }, 500)
}
const gone = (c: Context) => c.json({ problem: GONE }, 404)
const readBody = (c: Context) => c.req.json().catch(() => null) as Promise<unknown>

/** The path ids, or null when any isn't a UUID (nothing is read or called for those). */
function ids(c: Context, names: string[]): string[] | null {
  const out = names.map((n) => c.req.param(n) ?? '')
  return out.every(isUuid) ? out : null
}

async function decide<B>(
  c: Context, names: string[], clean: (b: unknown) => B, run: (ids: string[], body: B) => Promise<DecideResult>, what: string,
): Promise<Response> {
  const path = ids(c, names)
  if (!path) return gone(c)
  let body: B
  try { body = clean(await readBody(c)) } catch (e) {
    if (e instanceof Problem) return c.json({ problem: e.message }, 400)
    throw e
  }
  try {
    const a = answerFor(await run(path, body))
    return c.json(a.body, a.status as 200)
  } catch (err) { return failed(c, what, err) }
}

export const decidePlaceHandler = (c: Context, deps: CatalogueDeps, user: AdminUser): Promise<Response> =>
  decide(c, ['placeId'], cleanPlaceDecision, ([p], b) => deps.decidePlace(user.id, p, b), 'decide place')

export const decideActivityHandler = (c: Context, deps: CatalogueDeps, user: AdminUser): Promise<Response> =>
  decide(c, ['placeId', 'itemId'], cleanActivityDecision, ([p, i], b) => deps.decideActivity(user.id, p, i, b), 'decide activity')

export const decideEventHandler = (c: Context, deps: CatalogueDeps, user: AdminUser): Promise<Response> =>
  decide(c, ['itemId'], cleanEventDecision, ([i], b) => deps.decideEvent(user.id, i, b), 'decide event')

export const decideContentHandler = (c: Context, deps: CatalogueDeps, user: AdminUser): Promise<Response> =>
  decide(c, ['contentId'], cleanContentDecision, ([i], b) => deps.decideContent(user.id, i, b), 'decide content')

export async function undoRunHandler(c: Context, deps: CatalogueDeps, user: AdminUser): Promise<Response> {
  const path = ids(c, ['runId'])
  if (!path) return gone(c)
  try {
    const r = await deps.undoRun(user.id, path[0])
    if (r.result === 'notFound') return gone(c)
    if (r.result === 'stillRunning') return c.json({ problem: "That run is still going. Try again when it's finished." }, 409)
    return c.json(r, 200)
  } catch (err) { return failed(c, 'undo run', err) }
}
