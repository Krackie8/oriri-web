import { describe, expect, it } from 'vitest'
import { createFunctionClient, type FunctionClientEnv } from './client'
import { createFakeTransport, type FakeHandler } from './fakeTransport'
import type { JoinInput } from './member'

const env = {
  storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  attribution: () => ({}),
  sourceLabel: () => '',
  localDay: () => '2026-11-16',
  pageUrl: () => 'https://www.oriri.me/join',
  now: () => new Date('2026-11-16T08:00:00.000Z'),
} as unknown as FunctionClientEnv

const input: JoinInput = {
  adult: true,
  homeArea: 'Dubai Marina',
  instagram: '@ren',
  consents: { terms: true, location: false, wellness_signals: false, personalisation: true, push: false, marketing: false },
}
const member = { city: 'dubai', homeArea: 'Dubai Marina', instagram: 'ren' }

const client = (routes: Record<string, FakeHandler>, token = 'user-token') => {
  const fake = createFakeTransport(routes)
  return { fake, fc: createFunctionClient({ transport: fake, getToken: async () => token, env }) }
}
const reply =
  (status: number, json: unknown): FakeHandler =>
  () => ({ status, json })

describe('member.join', () => {
  it('sends her answers to the edge function with her own token, never to the database', async () => {
    const { fc, fake } = client({ 'POST /bestie/join': reply(200, { success: true, outcome: 'joined', member }) })
    await fc.member.join(input)
    expect(fake.calls).toEqual([{ method: 'POST', path: '/bestie/join', body: input, form: undefined, token: 'user-token' }])
  })

  it('joined: returns her Member', async () => {
    const { fc } = client({ 'POST /bestie/join': reply(200, { success: true, outcome: 'joined', member }) })
    expect(await fc.member.join(input)).toEqual({ ok: true, data: { outcome: 'joined', member } })
  })

  it('alreadyJoined: returns the Member already stored', async () => {
    const { fc } = client({ 'POST /bestie/join': reply(200, { success: true, outcome: 'alreadyJoined', member }) })
    expect(await fc.member.join(input)).toEqual({ ok: true, data: { outcome: 'alreadyJoined', member } })
  })

  it('invalid: passes on what to fix', async () => {
    const { fc } = client({ 'POST /bestie/join': reply(400, { success: false, error: 'Please pick your home area.' }) })
    expect(await fc.member.join(input)).toEqual({ ok: true, data: { outcome: 'invalid', message: 'Please pick your home area.' } })
  })

  it('signedOut: her session is missing or expired', async () => {
    const { fc } = client({ 'POST /bestie/join': reply(401, { success: false, error: 'Unauthorized' }) })
    expect(await fc.member.join(input)).toEqual({ ok: true, data: { outcome: 'signedOut' } })
  })

  it('anything else is an error she can retry', async () => {
    const { fc } = client({ 'POST /bestie/join': () => 'unreachable' })
    const r = await fc.member.join(input)
    expect(r.ok).toBe(false)
  })
})

describe('member.me', () => {
  it('is null before she joins', async () => {
    const { fc } = client({ 'GET /bestie/member': reply(200, { success: true, member: null }) })
    expect(await fc.member.me()).toEqual({ ok: true, data: { outcome: 'notJoined' } })
  })

  it('is her Member after she joins', async () => {
    const { fc } = client({ 'GET /bestie/member': reply(200, { success: true, member }) })
    expect(await fc.member.me()).toEqual({ ok: true, data: { outcome: 'member', member } })
  })

  it('signedOut when there is no session', async () => {
    const { fc } = client({ 'GET /bestie/member': reply(401, { success: false, error: 'Unauthorized' }) })
    expect(await fc.member.me()).toEqual({ ok: true, data: { outcome: 'signedOut' } })
  })
})
