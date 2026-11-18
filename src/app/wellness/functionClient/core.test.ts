import { describe, expect, it } from 'vitest'
import { createCore } from './core'
import { createFakeTransport } from './fakeTransport'
import { tokenFromSession } from './token'

const token = async () => 'tok'

describe('core: result mapping', () => {
  it('returns ok with the JSON when the edge function succeeds', async () => {
    const fake = createFakeTransport({ 'GET /guides': () => ({ status: 200, json: { success: true, guides: [1] } }) })
    expect(await createCore(fake, token).request('GET', '/guides')).toEqual({ ok: true, data: { success: true, guides: [1] } })
  })

  it('returns not ok when the server says success: false, even on a 200', async () => {
    const fake = createFakeTransport({ 'POST /x': () => ({ status: 200, json: { success: false, error: 'Nope' } }) })
    expect(await createCore(fake, token).request('POST', '/x', { body: {} })).toEqual({
      ok: false,
      error: { status: 200, message: 'Nope', details: { success: false, error: 'Nope' } },
    })
  })

  it('returns not ok on a non-2xx status, with a fallback message', async () => {
    const fake = createFakeTransport({ 'GET /x': () => ({ status: 503, json: null }) })
    expect(await createCore(fake, token).request('GET', '/x')).toEqual({ ok: false, error: { status: 503, message: 'Request failed (503)', details: null } })
  })

  it('returns not ok when a 2xx reply is not JSON (e.g. an HTML page answered instead)', async () => {
    const fake = createFakeTransport({ 'POST /x': () => ({ status: 200, json: null }) })
    expect(await createCore(fake, token).request('POST', '/x', { body: {} })).toEqual({
      ok: false,
      error: { status: 200, message: 'Request failed (200)', details: null },
    })
  })

  it('returns status 0 instead of throwing when the network fails', async () => {
    const fake = createFakeTransport({ 'GET /x': () => 'unreachable' })
    expect(await createCore(fake, token).request('GET', '/x')).toEqual({ ok: false, error: { status: 0, message: 'Could not reach Oriri. Check your connection.' } })
  })

  it('returns not ok instead of throwing when getting the token fails', async () => {
    const fake = createFakeTransport({ 'GET /x': () => ({ status: 200, json: {} }) })
    const r = await createCore(fake, async () => Promise.reject(new Error('boom'))).request('GET', '/x')
    expect(r.ok).toBe(false)
    expect(fake.calls).toHaveLength(0)
  })

  it('sends the token getToken gives it', async () => {
    const fake = createFakeTransport({ 'GET /x': () => ({ status: 200, json: {} }) })
    await createCore(fake, token).request('GET', '/x')
    expect(fake.calls[0].token).toBe('tok')
  })
})

describe('tokenFromSession: user token vs anon key', () => {
  const auth = (session: { access_token: string } | null) => ({ getSession: async () => ({ data: { session } }) })

  it("sends the user's token when someone is signed in", async () => {
    expect(await tokenFromSession(auth({ access_token: 'user-jwt' }), 'anon-key')()).toBe('user-jwt')
  })

  it('sends the anon key when no one is signed in', async () => {
    expect(await tokenFromSession(auth(null), 'anon-key')()).toBe('anon-key')
  })

  it('falls back to the anon key when reading the session fails', async () => {
    const broken = { getSession: async () => Promise.reject(new Error('storage blocked')) }
    expect(await tokenFromSession(broken, 'anon-key')()).toBe('anon-key')
  })
})
