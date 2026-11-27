import { describe, it, expect } from 'vitest'
import {
  placeParams, activityParams, eventParams, contentParams, undoParams, undoFromJson, decideResultFrom, PLACE_SQL,
} from './catalogueQuery'

const A = '00000000-0000-4000-8000-000000000001'
const P = '00000000-0000-4000-8000-000000000002'
const I = '00000000-0000-4000-8000-000000000003'

describe('placeParams', () => {
  it('maps camelCase to the snake_case json, approve stays a boolean, absent prices are omitted', () => {
    const [actor, place, decision, reason, note, acts, edits] = placeParams(A, P, {
      decision: 'rejected', reason: 'closed', note: 'n',
      activities: [
        { catalogueItemId: I, approve: false },
        { catalogueItemId: P, approve: true, priceMinAed: 0, priceMaxAed: 90, durationMin: 60 },
      ],
      edits: { name: 'N', signals: [{ id: I, text: 't' }] },
    })
    expect([actor, place, decision, reason, note]).toEqual([A, P, 'rejected', 'closed', 'n'])
    expect(JSON.parse(acts as string)).toEqual([
      { catalogue_item_id: I, approve: false },
      { catalogue_item_id: P, approve: true, price_min_aed: 0, price_max_aed: 90, duration_min: 60 },
    ])
    expect(JSON.parse(edits as string)).toEqual({ name: 'N', signals: [{ id: I, text: 't' }] })
  })
  it('passes null for absent reason, note and edits', () => {
    const p = placeParams(A, P, { decision: 'approved', activities: [] })
    expect(p.slice(3, 5)).toEqual([null, null])
    expect(p[5]).toBe('[]')
    expect(p[6]).toBeNull()
  })
  it('the statement names every parameter', () => { expect(PLACE_SQL).toContain('$7::jsonb') })
})

describe('the other params', () => {
  it('activity edits are snake_case with absent keys omitted', () => {
    const p = activityParams(A, P, I, { decision: 'edited_approved', edits: { priceMaxAed: 5 } })
    expect(p.slice(0, 3)).toEqual([A, P, I])
    expect(JSON.parse(p[6] as string)).toEqual({ price_max_aed: 5 })
  })
  it('event edits', () => {
    const p = eventParams(A, I, { decision: 'approved', edits: { title: 'T', timeNote: 'x', endsOn: '2026-12-01' } })
    expect(JSON.parse(p[5] as string)).toEqual({ title: 'T', time_note: 'x', ends_on: '2026-12-01' })
    expect(eventParams(A, I, { decision: 'approved' })[5]).toBeNull()
  })
  it('content and undo', () => {
    expect(contentParams(A, I, { decision: 'removed' })).toEqual([A, I, 'removed', null])
    expect(undoParams(A, I)).toEqual([A, I])
  })
})

describe('results', () => {
  it('a known decide result passes, anything else throws', () => {
    expect(decideResultFrom('decided')).toBe('decided')
    expect(decideResultFrom('notPending')).toBe('notPending')
    expect(() => decideResultFrom('boom')).toThrow()
    expect(() => decideResultFrom(undefined)).toThrow()
  })
  it('undo snake_case comes back camelCase', () => {
    expect(undoFromJson({ result: 'undone', rejected: 2, restored: 1, skipped: [{ change_id: 7, field: 'name' }] }))
      .toEqual({ result: 'undone', rejected: 2, restored: 1, skipped: [{ changeId: 7, field: 'name' }] })
  })
  it('undo with only a result gets zero counts', () => {
    expect(undoFromJson({ result: 'stillRunning' })).toEqual({ result: 'stillRunning', rejected: 0, restored: 0, skipped: [] })
  })
  it('an unknown undo result throws', () => {
    expect(() => undoFromJson({ result: 'x' })).toThrow()
    expect(() => undoFromJson(null)).toThrow()
  })
})
