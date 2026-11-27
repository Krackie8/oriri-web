import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import {
  answerFor, cleanActivityDecision, cleanContentDecision, cleanEventDecision, cleanPlaceDecision,
  decideActivityHandler, decideContentHandler, decideEventHandler, decidePlaceHandler, undoRunHandler,
  type CatalogueDeps, type DecideResult, type UndoResult,
} from './catalogue'

const U1 = '11111111-1111-4111-8111-111111111111'
const U2 = '22222222-2222-4222-8222-222222222222'
const user = { id: 'u-1', email: 'ren@example.test', signedInAt: null }
const TOO_LONG = "That's longer than it can be."
const PRICES = 'Prices are in AED, from 0 to 5000.'
const GONE = "That's no longer here."

const place = (o: Record<string, unknown> = {}) => cleanPlaceDecision({ decision: 'approved', activities: [], ...o })

describe('cleanPlaceDecision', () => {
  it('needs a reason to reject', () => {
    expect(() => cleanPlaceDecision({ decision: 'rejected' })).toThrow('Pick a reason.')
    expect(() => cleanPlaceDecision({ decision: 'rejected', reason: 'bad_run' })).toThrow('Pick a reason.')
    expect(() => cleanPlaceDecision({ decision: 'rejected', reason: 'nonsense' })).toThrow('Pick a reason.')
    expect(cleanPlaceDecision({ decision: 'rejected', reason: 'too_far' }).reason).toBe('too_far')
  })
  it('drops the reason from an approval', () => {
    expect(place({ reason: 'too_far' }).reason).toBeUndefined()
  })
  it('caps notes at 280, trims, and drops unknown keys', () => {
    expect(() => place({ note: 'x'.repeat(281) })).toThrow(TOO_LONG)
    const r = place({ note: '  fine  ', sneaky: 1, edits: { name: ' Spa ', other: 2 } }) as unknown as Record<string, unknown>
    expect(r.note).toBe('fine')
    expect(r.sneaky).toBeUndefined()
    expect(r.edits).toEqual({ name: 'Spa' })
  })
  it('checks prices', () => {
    const act = (o: Record<string, unknown>) => place({ activities: [{ catalogueItemId: U1, approve: true, ...o }] })
    expect(() => act({ priceMinAed: 200, priceMaxAed: 150 })).toThrow("Check the prices: the lowest can't be above the highest.")
    expect(() => act({ priceMaxAed: 5001 })).toThrow(PRICES)
    expect(() => act({ priceMinAed: -1 })).toThrow(PRICES)
    expect(act({ priceMinAed: 0, priceMaxAed: 5000, durationMin: 60, junk: 1 }).activities)
      .toEqual([{ catalogueItemId: U1, approve: true, priceMinAed: 0, priceMaxAed: 5000, durationMin: 60 }])
  })
  it('needs a boolean approve and a real id on each activity', () => {
    expect(() => place({ activities: [{ catalogueItemId: U1 }] })).toThrow()
    expect(() => place({ activities: [{ catalogueItemId: 'abc', approve: true }] })).toThrow()
  })
  it('names: not empty, up to 200', () => {
    expect(() => place({ edits: { name: '   ' } })).toThrow('Give it a name.')
    expect(() => place({ edits: { name: 'n'.repeat(201) } })).toThrow(TOO_LONG)
  })
  it('signals: up to 140', () => {
    expect(() => place({ edits: { signals: [{ id: U2, text: 'x'.repeat(141) }] } })).toThrow(TOO_LONG)
    expect(place({ edits: { signals: [{ id: U2, text: ' ok ', z: 1 }] } }).edits).toEqual({ signals: [{ id: U2, text: 'ok' }] })
  })
})

describe('fix round 1', () => {
  const UNCLEAR = "That didn't come through right. Try again."
  it('timeNote is capped at 60', () => {
    const t = (n: number) => cleanEventDecision({ decision: 'approved', edits: { timeNote: 'x'.repeat(n) } })
    expect(() => t(61)).toThrow(TOO_LONG)
    expect(t(60).edits).toEqual({ timeNote: 'x'.repeat(60) })
  })
  it('signal ids must be UUIDs and text not empty', () => {
    expect(() => place({ edits: { signals: [{ id: 's1', text: 'ok' }] } })).toThrow(UNCLEAR)
    expect(() => place({ edits: { signals: [{ id: U2, text: '  ' }] } })).toThrow(UNCLEAR)
  })
  it('a signal id appears at most once in one edit', () => {
    expect(() => place({ edits: { signals: [{ id: U2, text: 'one' }, { id: U2, text: 'two' }] } })).toThrow(UNCLEAR)
    expect(place({ edits: { signals: [{ id: U1, text: 'one' }, { id: U2, text: 'two' }] } }).edits?.signals).toHaveLength(2)
  })
  it('a price edit sends both bounds', () => {
    expect(() => place({ activities: [{ catalogueItemId: U1, approve: true, priceMinAed: 200 }] })).toThrow(UNCLEAR)
    expect(() => cleanActivityDecision({ decision: 'edited_approved', edits: { priceMaxAed: 200 } })).toThrow(UNCLEAR)
    expect(cleanActivityDecision({ decision: 'edited_approved', edits: { priceMinAed: 1, priceMaxAed: 2 } }).edits).toEqual({ priceMinAed: 1, priceMaxAed: 2 })
  })
})

describe('the other cleaners', () => {
  it('activity: reason and prices', () => {
    expect(() => cleanActivityDecision({ decision: 'rejected' })).toThrow('Pick a reason.')
    expect(() => cleanActivityDecision({ decision: 'edited_approved', edits: { priceMinAed: 9, priceMaxAed: 1 } })).toThrow('Check the prices')
  })
  it('event: reason, lengths', () => {
    expect(() => cleanEventDecision({ decision: 'rejected', reason: 'bad_run' })).toThrow('Pick a reason.')
    expect(() => cleanEventDecision({ decision: 'approved', edits: { title: ' ' } })).toThrow('Give it a name.')
    expect(cleanEventDecision({ decision: 'approved', edits: { title: ' Yoga ', endsOn: '2026-12-01' } }).edits)
      .toEqual({ title: 'Yoga', endsOn: '2026-12-01' })
  })
  it('content: released or removed only', () => {
    expect(cleanContentDecision({ decision: 'removed', note: ' n ', x: 1 })).toEqual({ decision: 'removed', note: 'n' })
    expect(() => cleanContentDecision({ decision: 'approved' })).toThrow()
    expect(() => cleanContentDecision({ decision: 'released', note: 'x'.repeat(281) })).toThrow(TOO_LONG)
  })
})

describe('answerFor', () => {
  const rows: [DecideResult, number, unknown][] = [
    ['decided', 200, { ok: true }],
    ['notPending', 409, { problem: 'Someone already decided this one.' }],
    ['notHeld', 409, { problem: 'Someone already decided this one.' }],
    ['needsActivity', 422, { problem: 'Pick at least one thing they offer, or reject the place.' }],
    ['activitiesMismatch', 409, { problem: 'This place changed while you were looking. Open it again.' }],
    ['noPosition', 422, { problem: "This place has no map position yet. It comes back after Saturday's run." }],
    ['placeNotApproved', 422, { problem: 'Approve the place first.' }],
    ['notFound', 404, { problem: GONE }],
  ]
  it.each(rows)('%s', (result, status, body) => {
    expect(answerFor(result)).toEqual({ status, body })
  })
})

function harness(result: DecideResult = 'decided', undo?: UndoResult) {
  const calls: unknown[][] = []
  const deps: CatalogueDeps = {
    decidePlace: async (...a) => { calls.push(['place', ...a]); return result },
    decideActivity: async (...a) => { calls.push(['activity', ...a]); return result },
    decideEvent: async (...a) => { calls.push(['event', ...a]); return result },
    decideContent: async (...a) => { calls.push(['content', ...a]); return result },
    undoRun: async (...a) => { calls.push(['undo', ...a]); return undo ?? { result: 'undone', rejected: 1, restored: 2, skipped: [] } },
  }
  const app = new Hono()
  app.post('/place/:placeId', (c) => decidePlaceHandler(c, deps, user))
  app.post('/place/:placeId/activity/:itemId', (c) => decideActivityHandler(c, deps, user))
  app.post('/event/:itemId', (c) => decideEventHandler(c, deps, user))
  app.post('/content/:contentId', (c) => decideContentHandler(c, deps, user))
  app.post('/run/:runId/undo', (c) => undoRunHandler(c, deps, user))
  const post = (path: string, body: unknown) =>
    app.request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  return { calls, post }
}

describe('handlers', () => {
  it('place: notPending answers 409 with the words', async () => {
    const h = harness('notPending')
    const res = await h.post(`/place/${U1}`, { decision: 'approved', activities: [] })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ problem: 'Someone already decided this one.' })
    expect(h.calls[0].slice(0, 3)).toEqual(['place', 'u-1', U1])
  })
  it('a path id that is not a UUID answers 404 and calls nothing', async () => {
    const h = harness()
    for (const path of ['/place/abc', `/place/${U1}/activity/abc`, '/event/abc', '/content/abc', '/run/abc/undo']) {
      const res = await h.post(path, { decision: 'approved' })
      expect(res.status).toBe(404)
      expect(await res.json()).toEqual({ problem: GONE })
    }
    expect(h.calls).toEqual([])
  })
  it('a validation problem answers 400 and calls nothing', async () => {
    const h = harness()
    const res = await h.post(`/place/${U1}`, { decision: 'rejected' })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ problem: 'Pick a reason.' })
    const bad = await h.post(`/event/${U1}`, 'not an object')
    expect(bad.status).toBe(400)
    expect(h.calls).toEqual([])
  })
  it('activity, event and content pass their ids', async () => {
    const h = harness()
    expect((await h.post(`/place/${U1}/activity/${U2}`, { decision: 'approved' })).status).toBe(200)
    expect((await h.post(`/event/${U2}`, { decision: 'approved' })).status).toBe(200)
    expect((await h.post(`/content/${U2}`, { decision: 'released' })).status).toBe(200)
    expect(h.calls.map((c) => c.slice(0, c[0] === 'activity' ? 4 : 3))).toEqual([
      ['activity', 'u-1', U1, U2], ['event', 'u-1', U2], ['content', 'u-1', U2],
    ])
  })
  it('a thrown dependency answers 500 without leaking', async () => {
    const deps = { decidePlace: async () => { throw new Error('secret table name') } } as unknown as CatalogueDeps
    const app = new Hono()
    app.post('/p/:placeId', (c) => decidePlaceHandler(c, deps, user))
    const res = await app.request(`/p/${U1}`, { method: 'POST', body: JSON.stringify({ decision: 'approved', activities: [] }) })
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('secret')
  })
  it('undo maps its results', async () => {
    const ok: UndoResult = { result: 'undone', rejected: 1, restored: 2, skipped: [{ changeId: 5, field: 'name' }] }
    const a = await harness('decided', ok).post(`/run/${U1}/undo`, {})
    expect(a.status).toBe(200)
    expect(await a.json()).toEqual(ok)
    const again = await harness('decided', { ...ok, result: 'alreadyUndone' }).post(`/run/${U1}/undo`, {})
    expect(again.status).toBe(200)
    const nf = await harness('decided', { ...ok, result: 'notFound' }).post(`/run/${U1}/undo`, {})
    expect(nf.status).toBe(404)
    expect(await nf.json()).toEqual({ problem: GONE })
    const sr = await harness('decided', { ...ok, result: 'stillRunning' }).post(`/run/${U1}/undo`, {})
    expect(sr.status).toBe(409)
    expect(await sr.json()).toEqual({ problem: "That run is still going. Try again when it's finished." })
  })
})
