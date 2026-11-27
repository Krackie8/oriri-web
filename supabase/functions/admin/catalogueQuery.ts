/**
 * Catalogue review: the SQL calls and the pure mapping between the camelCase bodies catalogue.ts
 * cleans and the snake_case json the bestie.* functions (migration 20261127000100) take and return.
 * Deno-free so vitest can import it; index.tsx runs the statements as service_role.
 *
 * Absent keys are omitted from the json; an absent reason, note or edits is passed as null.
 * Anything other than a known result string throws (the route then answers 500 with no detail).
 */
import type {
  ActivityDecisionBody, ContentDecisionBody, DecideResult, EventDecisionBody, PlaceDecisionBody, UndoResult,
} from './catalogue.ts'

export const PLACE_SQL = 'select bestie.decide_place($1::uuid, $2::uuid, $3, $4, $5, $6::jsonb, $7::jsonb) as result'
export const ACTIVITY_SQL = 'select bestie.decide_place_activity($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7::jsonb) as result'
export const EVENT_SQL = 'select bestie.decide_event($1::uuid, $2::uuid, $3, $4, $5, $6::jsonb) as result'
export const CONTENT_SQL = 'select bestie.decide_content($1::uuid, $2::uuid, $3, $4) as result'
export const UNDO_SQL = 'select bestie.undo_catalogue_run($1::uuid, $2::uuid) as result'

/** Only the keys that have a value, renamed. */
function pick(src: object, names: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [from, to] of Object.entries(names)) {
    const v = (src as Record<string, unknown>)[from]
    if (v !== undefined && v !== null) out[to] = v
  }
  return out
}
const json = (v: unknown) => (v === undefined ? null : JSON.stringify(v))

const PRICE_KEYS = { priceMinAed: 'price_min_aed', priceMaxAed: 'price_max_aed', durationMin: 'duration_min' }

export function placeParams(actor: string, placeId: string, b: PlaceDecisionBody): unknown[] {
  const activities = b.activities.map((a) => ({
    catalogue_item_id: a.catalogueItemId, approve: a.approve === true, ...pick(a, PRICE_KEYS),
  }))
  return [actor, placeId, b.decision, b.reason ?? null, b.note ?? null, JSON.stringify(activities), json(b.edits)]
}

export function activityParams(actor: string, placeId: string, itemId: string, b: ActivityDecisionBody): unknown[] {
  return [actor, placeId, itemId, b.decision, b.reason ?? null, b.note ?? null, json(b.edits && pick(b.edits, PRICE_KEYS))]
}

export function eventParams(actor: string, itemId: string, b: EventDecisionBody): unknown[] {
  const edits = b.edits && pick(b.edits, { title: 'title', timeNote: 'time_note', endsOn: 'ends_on' })
  return [actor, itemId, b.decision, b.reason ?? null, b.note ?? null, json(edits)]
}

export const contentParams = (actor: string, contentId: string, b: ContentDecisionBody): unknown[] =>
  [actor, contentId, b.decision, b.note ?? null]

export const undoParams = (actor: string, runId: string): unknown[] => [actor, runId]

const DECIDE_RESULTS: readonly string[] = ['decided', 'notPending', 'notHeld', 'needsActivity', 'activitiesMismatch',
  'noPosition', 'placeNotApproved', 'notFound']
export function decideResultFrom(v: unknown): DecideResult {
  if (typeof v !== 'string' || !DECIDE_RESULTS.includes(v)) throw new Error('decision gave no known result')
  return v as DecideResult
}

const UNDO_RESULTS: readonly string[] = ['undone', 'alreadyUndone', 'stillRunning', 'notFound']
export function undoFromJson(v: unknown): UndoResult {
  const o = (typeof v === 'string' ? JSON.parse(v) : v) as Record<string, unknown> | null
  if (!o || typeof o !== 'object' || typeof o.result !== 'string' || !UNDO_RESULTS.includes(o.result)) {
    throw new Error('undo gave no known result')
  }
  const skipped = Array.isArray(o.skipped) ? o.skipped as { change_id: number; field: string }[] : []
  return {
    result: o.result as UndoResult['result'],
    rejected: Number(o.rejected ?? 0),
    restored: Number(o.restored ?? 0),
    skipped: skipped.map((s) => ({ changeId: s.change_id, field: s.field })),
  }
}
