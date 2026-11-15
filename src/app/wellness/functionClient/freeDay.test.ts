import { describe, expect, it } from 'vitest'
import { createFunctionClient, type FunctionClientEnv } from './client'
import { createFakeTransport, type FakeHandler } from './fakeTransport'
import type { FreeDayClaim } from './freeDay'

const KEY = 'wb_pending_free_day'

/** localStorage stand-in. Sharing one between two clients is two visits on the same phone. */
const memoryStorage = () => {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  }
}

const env = (storage: FunctionClientEnv['storage'] = memoryStorage()): FunctionClientEnv => ({
  storage,
  attribution: () => ({
    utm_source: 'instagram',
    utm_medium: 'bio',
    utm_campaign: 'nov',
    landing_page: '/plan/day',
    referrer: 'https://l.instagram.com/',
    first_touch_source: 'tiktok',
    first_touch_medium: 'video',
    first_touch_campaign: 'oct',
  }),
  sourceLabel: () => 'Instagram',
  localDay: () => '2026-11-15',
  pageUrl: () => 'https://www.oriri.me/plan/day?utm_source=instagram',
  now: () => new Date('2026-11-15T05:00:00.000Z'),
})

const claim: FreeDayClaim = {
  email: '  Me@X.com ',
  consent: true,
  inputs: { energy: 'Low', goals: ['Unwind'], minutes: 60, budget: 0, area: 'JLT' },
  plan: [{ time: '20 min', label: 'Move', title: 'Gentle stretch', venue: 'At home', cost: 'Free', url: 'https://youtube.com/x' }],
}

const client = (handler: FakeHandler, e = env()) => {
  const fake = createFakeTransport({ 'POST /bestie/free-day': handler })
  return { fake, fc: createFunctionClient({ transport: fake, getToken: async () => 'anon', env: e }) }
}
const reply =
  (status: number, json: unknown): FakeHandler =>
  () => ({ status, json })
const unreachable: FakeHandler = () => 'unreachable'

describe('freeDay.claim outcomes', () => {
  it('claimed: the server accepted it', async () => {
    const { fc } = client(reply(200, { success: true }))
    expect(await fc.freeDay.claim(claim)).toEqual({ ok: true, data: { outcome: 'claimed' } })
  })

  it('alreadyUsed: this email had its Free day on another day', async () => {
    const { fc } = client(reply(409, { success: false, used: true }))
    expect(await fc.freeDay.claim(claim)).toEqual({ ok: true, data: { outcome: 'alreadyUsed', today: false } })
  })

  it('alreadyUsed today: the same email on the same day keeps its Free day', async () => {
    const { fc } = client(reply(409, { success: false, used: true, today: true }))
    expect(await fc.freeDay.claim(claim)).toEqual({ ok: true, data: { outcome: 'alreadyUsed', today: true } })
  })

  it('invalid: a 400 comes back with the server message, and nothing is queued', async () => {
    const e = env()
    const { fc } = client(reply(400, { success: false, error: 'Please use a real email.' }), e)
    expect(await fc.freeDay.claim(claim)).toEqual({ ok: true, data: { outcome: 'invalid', message: 'Please use a real email.' } })
    expect(e.storage.getItem(KEY)).toBeNull()
  })

  it('invalid without a message falls back to a friendly one', async () => {
    const { fc } = client(reply(400, { success: false }))
    expect(await fc.freeDay.claim(claim)).toEqual({ ok: true, data: { outcome: 'invalid', message: 'Please check your details.' } })
  })

  it.each<[string, FakeHandler]>([
    ['the network fails', unreachable],
    ['the server errors', reply(500, { success: false, error: 'db down' })],
    ['a 200 comes back that is not JSON', reply(200, null)],
  ])('queued when %s, so the plan still unlocks', async (_, handler) => {
    const e = env()
    const { fc } = client(handler, e)
    expect(await fc.freeDay.claim(claim)).toEqual({ ok: true, data: { outcome: 'queued' } })
    expect(JSON.parse(e.storage.getItem(KEY)!).email).toBe('me@x.com')
  })

  it('still unlocks the plan when the queue cannot be saved (private mode)', async () => {
    const storage = memoryStorage()
    storage.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    const { fc } = client(unreachable, env(storage))
    expect(await fc.freeDay.claim(claim)).toEqual({ ok: true, data: { outcome: 'queued' } })
  })
})

describe('freeDay.claim payload', () => {
  it('sends the lower-cased email with attribution, the local day and the page', async () => {
    const { fake, fc } = client(reply(200, { success: true }))
    await fc.freeDay.claim(claim)
    expect(fake.calls[0].body).toEqual({
      email: 'me@x.com',
      consent: true,
      inputs: claim.inputs,
      plan: claim.plan,
      utm_source: 'instagram',
      utm_medium: 'bio',
      utm_campaign: 'nov',
      utm_content: '',
      utm_term: '',
      landing_page: '/plan/day',
      referrer: 'https://l.instagram.com/',
      first_touch_source: 'tiktok',
      first_touch_medium: 'video',
      first_touch_campaign: 'oct',
      wb_source: 'Instagram',
      submitted_at: '2026-11-15T05:00:00.000Z',
      local_day: '2026-11-15',
      page_url: 'https://www.oriri.me/plan/day?utm_source=instagram',
    })
  })

  it('counts "Me@X.com" and "me@x.com" as the same Free day', async () => {
    const { fake, fc } = client(reply(200, { success: true }))
    await fc.freeDay.claim({ ...claim, email: 'Me@X.com' })
    await fc.freeDay.claim({ ...claim, email: 'me@x.com' })
    expect(fake.calls.map((c) => (c.body as { email: string }).email)).toEqual(['me@x.com', 'me@x.com'])
  })
})

describe('freeDay.retryPending: the queue across visits', () => {
  const queueOnFirstVisit = async () => {
    const storage = memoryStorage()
    await client(unreachable, env(storage)).fc.freeDay.claim(claim)
    expect(storage.getItem(KEY)).not.toBeNull()
    return storage
  }

  it('re-sends the queued claim on the next visit, unchanged, and clears it', async () => {
    const storage = await queueOnFirstVisit()
    const queued = JSON.parse(storage.getItem(KEY)!)
    const { fake, fc } = client(reply(200, { success: true }), env(storage))
    expect(await fc.freeDay.retryPending()).toEqual({ ok: true, data: { outcome: 'sent' } })
    expect(fake.calls[0].body).toEqual(queued)
    expect(storage.getItem(KEY)).toBeNull()
  })

  it.each<[string, FakeHandler]>([
    ['already used', reply(409, { success: false, used: true })],
    ['invalid', reply(400, { success: false })],
  ])('drops the queued claim when the server says %s', async (_, handler) => {
    const storage = await queueOnFirstVisit()
    expect(await client(handler, env(storage)).fc.freeDay.retryPending()).toEqual({ ok: true, data: { outcome: 'dropped' } })
    expect(storage.getItem(KEY)).toBeNull()
  })

  it('keeps the queued claim for the visit after when it fails again', async () => {
    const storage = await queueOnFirstVisit()
    expect(await client(unreachable, env(storage)).fc.freeDay.retryPending()).toEqual({ ok: true, data: { outcome: 'kept' } })
    const third = client(reply(200, { success: true }), env(storage))
    expect(await third.fc.freeDay.retryPending()).toEqual({ ok: true, data: { outcome: 'sent' } })
    expect(storage.getItem(KEY)).toBeNull()
  })

  it('retries only once per visit', async () => {
    const storage = await queueOnFirstVisit()
    let attempts = 0
    const { fc } = client(() => (attempts++, 'unreachable'), env(storage))
    await fc.freeDay.retryPending()
    expect(await fc.freeDay.retryPending()).toEqual({ ok: true, data: { outcome: 'nothing' } })
    expect(attempts).toBe(1)
    expect(storage.getItem(KEY)).not.toBeNull()
  })

  it('does nothing when there is no queued claim', async () => {
    const { fake, fc } = client(reply(200, { success: true }))
    expect(await fc.freeDay.retryPending()).toEqual({ ok: true, data: { outcome: 'nothing' } })
    expect(fake.calls).toHaveLength(0)
  })

  it('drops a corrupt queue entry without sending or throwing', async () => {
    const storage = memoryStorage()
    storage.setItem(KEY, '{not json')
    const { fake, fc } = client(reply(200, { success: true }), env(storage))
    expect(await fc.freeDay.retryPending()).toEqual({ ok: true, data: { outcome: 'nothing' } })
    expect(fake.calls).toHaveLength(0)
    expect(storage.getItem(KEY)).toBeNull()
  })
})
