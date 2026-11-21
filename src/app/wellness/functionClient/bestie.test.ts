import { describe, expect, it } from 'vitest'
import { createFunctionClient, type FunctionClientEnv } from './client'
import { createFakeTransport, type FakeHandler } from './fakeTransport'
import type { CheckInInput, DayPlan } from './bestie'

const env = {} as unknown as FunctionClientEnv
const input: CheckInInput = { energy: 'steady', minutes: 120, budgetAed: 250, goal: null }
const plan: DayPlan = {
  id: 'p1', date: '2026-11-16', engineVersion: 'bestie-1',
  checkIn: { energy: 'steady', minutes: 120, budgetAed: 250, goal: null, area: 'Dubai Marina' },
  suggestions: [{ id: 's1', slug: 'runclub', title: 'Community run club', pillars: ['move', 'meet_up'], minutes: 45, costAed: 0,
    light: false, outdoor: true, energyFit: ['steady', 'high'], why: 'Counts for Move + Meet up, and it saves time.', newForYou: false }],
}
const client = (routes: Record<string, FakeHandler>) => {
  const fake = createFakeTransport(routes)
  return { fake, fc: createFunctionClient({ transport: fake, getToken: async () => 'user-token', env }) }
}
const reply = (status: number, json: unknown): FakeHandler => () => ({ status, json })

describe('bestie.checkIn', () => {
  it('sends her Check-in to the edge function with her own token', async () => {
    const { fc, fake } = client({ 'POST /bestie/check-in': reply(200, { success: true, plan }) })
    await fc.bestie.checkIn(input)
    expect(fake.calls).toEqual([{ method: 'POST', path: '/bestie/check-in', body: input, form: undefined, token: 'user-token' }])
  })
  it('planned: returns the Day plan from the server', async () => {
    const { fc } = client({ 'POST /bestie/check-in': reply(200, { success: true, plan }) })
    expect(await fc.bestie.checkIn(input)).toEqual({ ok: true, data: { outcome: 'planned', plan } })
  })
  it('invalid: passes on what to fix', async () => {
    const { fc } = client({ 'POST /bestie/check-in': reply(400, { success: false, error: 'Please pick a budget.' }) })
    expect(await fc.bestie.checkIn(input)).toEqual({ ok: true, data: { outcome: 'invalid', message: 'Please pick a budget.' } })
  })
  it('notJoined and signedOut are outcomes, not errors', async () => {
    expect(await client({ 'POST /bestie/check-in': reply(409, { success: false, error: 'Join' }) }).fc.bestie.checkIn(input))
      .toEqual({ ok: true, data: { outcome: 'notJoined' } })
    expect(await client({ 'POST /bestie/check-in': reply(401, { success: false, error: 'Unauthorized' }) }).fc.bestie.checkIn(input))
      .toEqual({ ok: true, data: { outcome: 'signedOut' } })
  })
  it('a server failure stays an error', async () => {
    const r = await client({ 'POST /bestie/check-in': reply(500, { success: false, error: 'boom' }) }).fc.bestie.checkIn(input)
    expect(r.ok).toBe(false)
  })
})

describe('bestie.today', () => {
  it("returns today's plan, or none", async () => {
    expect(await client({ 'GET /bestie/plan/today': reply(200, { success: true, plan }) }).fc.bestie.today())
      .toEqual({ ok: true, data: { outcome: 'planned', plan } })
    expect(await client({ 'GET /bestie/plan/today': reply(200, { success: true, plan: null }) }).fc.bestie.today())
      .toEqual({ ok: true, data: { outcome: 'none' } })
    expect(await client({ 'GET /bestie/plan/today': reply(401, { success: false }) }).fc.bestie.today())
      .toEqual({ ok: true, data: { outcome: 'signedOut' } })
  })
})

describe('bestie.options, swap and skip (#71)', () => {
  const opt = { catalogueItemId: 'c2', slug: 'yoga', title: 'Yoga class', pillars: ['move'], minutes: 60, costAed: 120, light: false, outdoor: false, why: 'x' }
  it('options: up to three choices, or gone when the Suggestion is no longer open', async () => {
    const { fc, fake } = client({ 'GET /bestie/suggestions/s1/options': reply(200, { success: true, options: [opt] }) })
    expect(await fc.bestie.options('s1')).toEqual({ ok: true, data: { outcome: 'options', options: [opt] } })
    expect(fake.calls[0]).toMatchObject({ method: 'GET', path: '/bestie/suggestions/s1/options', token: 'user-token' })
    expect(await client({ 'GET /bestie/suggestions/s1/options': reply(404, { success: false }) }).fc.bestie.options('s1'))
      .toEqual({ ok: true, data: { outcome: 'gone' } })
  })
  it('swap: sends her pick and returns the new plan; a stale pick is notOffered', async () => {
    const { fc, fake } = client({ 'POST /bestie/suggestions/s1/swap': reply(200, { success: true, plan }) })
    expect(await fc.bestie.swap('s1', 'c2')).toEqual({ ok: true, data: { outcome: 'planned', plan } })
    expect(fake.calls[0]).toMatchObject({ method: 'POST', path: '/bestie/suggestions/s1/swap', body: { catalogueItemId: 'c2' } })
    expect(await client({ 'POST /bestie/suggestions/s1/swap': reply(400, { success: false }) }).fc.bestie.swap('s1', 'c9'))
      .toEqual({ ok: true, data: { outcome: 'notOffered' } })
  })
  it('skip: returns the plan without it; signedOut, notJoined and gone are outcomes; a 500 stays an error', async () => {
    expect(await client({ 'POST /bestie/suggestions/s1/skip': reply(200, { success: true, plan }) }).fc.bestie.skip('s1'))
      .toEqual({ ok: true, data: { outcome: 'planned', plan } })
    expect(await client({ 'POST /bestie/suggestions/s1/skip': reply(401, {}) }).fc.bestie.skip('s1')).toEqual({ ok: true, data: { outcome: 'signedOut' } })
    expect(await client({ 'POST /bestie/suggestions/s1/skip': reply(409, {}) }).fc.bestie.skip('s1')).toEqual({ ok: true, data: { outcome: 'notJoined' } })
    expect(await client({ 'POST /bestie/suggestions/s1/skip': reply(404, {}) }).fc.bestie.skip('s1')).toEqual({ ok: true, data: { outcome: 'gone' } })
    expect((await client({ 'POST /bestie/suggestions/s1/skip': reply(500, {}) }).fc.bestie.skip('s1')).ok).toBe(false)
  })
})

describe('bestie.complete, undo, photos and the Journal (#72)', () => {
  it('complete: sends the Reflection and returns the plan', async () => {
    const { fc, fake } = client({ 'POST /bestie/suggestions/s1/complete': reply(200, { success: true, plan }) })
    expect(await fc.bestie.complete('s1', 'Rest is part of it')).toEqual({ ok: true, data: { outcome: 'planned', plan, progress: { levelUps: [], moment: null } } })
    expect(fake.calls[0]).toMatchObject({ method: 'POST', path: '/bestie/suggestions/s1/complete', body: { reflection: 'Rest is part of it' } })
  })
  it('complete: a refusal carries its reason and gentle message; tooSoon carries when it opens', async () => {
    const tooSoon = { success: false, reason: 'tooSoon', readyAt: '2026-11-20T05:45:00.000Z', error: 'Not quite yet.' }
    expect(await client({ 'POST /bestie/suggestions/s1/complete': reply(409, tooSoon) }).fc.bestie.complete('s1'))
      .toEqual({ ok: true, data: { outcome: 'refused', reason: 'tooSoon', message: 'Not quite yet.', readyAt: '2026-11-20T05:45:00.000Z' } })
    const capped = { success: false, reason: 'mealCapped', error: 'One Meal counts per mealtime.' }
    expect(await client({ 'POST /bestie/suggestions/s1/complete': reply(409, capped) }).fc.bestie.complete('s1'))
      .toEqual({ ok: true, data: { outcome: 'refused', reason: 'mealCapped', message: 'One Meal counts per mealtime.' } })
    const reflection = { success: false, reason: 'reflectionNeeded', error: 'Write one line.' }
    expect(await client({ 'POST /bestie/suggestions/s1/complete': reply(400, reflection) }).fc.bestie.complete('s1'))
      .toEqual({ ok: true, data: { outcome: 'refused', reason: 'reflectionNeeded', message: 'Write one line.' } })
  })
  it('complete: a 409 without a reason is notJoined; gone, signedOut and a 500 as elsewhere', async () => {
    expect(await client({ 'POST /bestie/suggestions/s1/complete': reply(409, { success: false, error: 'Join' }) }).fc.bestie.complete('s1'))
      .toEqual({ ok: true, data: { outcome: 'notJoined' } })
    expect(await client({ 'POST /bestie/suggestions/s1/complete': reply(404, {}) }).fc.bestie.complete('s1')).toEqual({ ok: true, data: { outcome: 'gone' } })
    expect(await client({ 'POST /bestie/suggestions/s1/complete': reply(401, {}) }).fc.bestie.complete('s1')).toEqual({ ok: true, data: { outcome: 'signedOut' } })
    expect((await client({ 'POST /bestie/suggestions/s1/complete': reply(500, {}) }).fc.bestie.complete('s1')).ok).toBe(false)
  })
  it('undo: returns the plan, or gone once the day has passed', async () => {
    const { fc, fake } = client({ 'POST /bestie/completions/c1/undo': reply(200, { success: true, plan }) })
    expect(await fc.bestie.undo('c1')).toEqual({ ok: true, data: { outcome: 'planned', plan, progress: { levelUps: [], moment: null } } })
    expect(fake.calls[0]).toMatchObject({ method: 'POST', path: '/bestie/completions/c1/undo' })
    expect(await client({ 'POST /bestie/completions/c1/undo': reply(404, {}) }).fc.bestie.undo('c1')).toEqual({ ok: true, data: { outcome: 'gone' } })
  })
  it('addPhoto: sends the JPEG as the body; a refusal passes its message on', async () => {
    const jpeg = new Blob([new Uint8Array([0xff, 0xd8])], { type: 'image/jpeg' })
    const { fc, fake } = client({ 'POST /bestie/completions/c1/photo': reply(200, { success: true }) })
    expect(await fc.bestie.addPhoto('c1', jpeg)).toEqual({ ok: true, data: { outcome: 'saved' } })
    expect(fake.calls[0]).toMatchObject({ method: 'POST', path: '/bestie/completions/c1/photo', blob: jpeg })
    expect(await client({ 'POST /bestie/completions/c1/photo': reply(413, { success: false, error: 'Too big.' }) }).fc.bestie.addPhoto('c1', jpeg))
      .toEqual({ ok: true, data: { outcome: 'refused', message: 'Too big.' } })
    expect(await client({ 'POST /bestie/completions/c1/photo': reply(415, { success: false, error: 'Please choose a photo.' }) }).fc.bestie.addPhoto('c1', jpeg))
      .toEqual({ ok: true, data: { outcome: 'refused', message: 'Please choose a photo.' } })
  })
  it('deletePhoto and journal', async () => {
    expect(await client({ 'DELETE /bestie/completions/c1/photo': reply(200, { success: true }) }).fc.bestie.deletePhoto('c1'))
      .toEqual({ ok: true, data: { outcome: 'deleted' } })
    const entries = [{ completionId: 'c1', title: 'Sunset walk', pillars: ['move'], reflection: null, completedAt: '2026-11-20T15:00:00Z', photoUrl: null }]
    expect(await client({ 'GET /bestie/journal': reply(200, { success: true, entries }) }).fc.bestie.journal())
      .toEqual({ ok: true, data: { outcome: 'entries', entries } })
    expect(await client({ 'GET /bestie/journal': reply(401, {}) }).fc.bestie.journal()).toEqual({ ok: true, data: { outcome: 'signedOut' } })
  })
})

describe('bestie Levels, Status and the Profile (#73)', () => {
  const progress = { levelUps: [{ pillar: 'move', level: 2 }], moment: { shape: 'move', tier: 'rising', name: 'Rising Mover' } }
  it('complete and undo pass the progress through', async () => {
    expect(await client({ 'POST /bestie/suggestions/s1/complete': reply(200, { success: true, plan, progress }) }).fc.bestie.complete('s1'))
      .toEqual({ ok: true, data: { outcome: 'planned', plan, progress } })
    expect(await client({ 'POST /bestie/completions/c1/undo': reply(200, { success: true, plan, progress }) }).fc.bestie.undo('c1'))
      .toEqual({ ok: true, data: { outcome: 'planned', plan, progress } })
  })
  it('a reply without progress reads as no change', async () => {
    expect(await client({ 'POST /bestie/suggestions/s1/complete': reply(200, { success: true, plan }) }).fc.bestie.complete('s1'))
      .toEqual({ ok: true, data: { outcome: 'planned', plan, progress: { levelUps: [], moment: null } } })
  })
  it('profile: her Profile, notJoined, or signedOut', async () => {
    const profile = {
      levels: { move: 2, meal: 5, mindset: 2, meet_up: 1 }, levels30: { move: 1, meal: 5, mindset: 1, meet_up: 1 },
      points: { move: 40, meal: 300, mindset: 30, meet_up: 0 }, nextAt: { move: 80, meal: 450, mindset: 80, meet_up: 30 },
      status: { shape: 'meal', tier: 'glowing', name: 'Glowing Clean Eater' }, moments: [],
    }
    const { fc, fake } = client({ 'GET /bestie/profile': reply(200, { success: true, profile }) })
    expect(await fc.bestie.profile()).toEqual({ ok: true, data: { outcome: 'profile', profile } })
    expect(fake.calls[0]).toMatchObject({ method: 'GET', path: '/bestie/profile' })
    expect(await client({ 'GET /bestie/profile': reply(409, {}) }).fc.bestie.profile()).toEqual({ ok: true, data: { outcome: 'notJoined' } })
    expect(await client({ 'GET /bestie/profile': reply(401, {}) }).fc.bestie.profile()).toEqual({ ok: true, data: { outcome: 'signedOut' } })
    expect((await client({ 'GET /bestie/profile': reply(500, {}) }).fc.bestie.profile()).ok).toBe(false)
  })
})
