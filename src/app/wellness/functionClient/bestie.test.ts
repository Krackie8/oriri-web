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
