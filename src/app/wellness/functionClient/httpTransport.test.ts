import { describe, expect, it, vi } from 'vitest'
import { createHttpTransport } from './httpTransport'

const FN = 'https://proj.supabase.co/functions/v1/make-server-a278ea32'

type Reply = { status: number; json?: unknown; type?: string } | 'network-error'
/** A stubbed fetch that replies per URL prefix and records every call. */
function stubFetch(replies: { relay?: Reply[]; direct?: Reply[] }) {
  const queues = { relay: [...(replies.relay ?? [])], direct: [...(replies.direct ?? [])] }
  const calls: { url: string; init: RequestInit }[] = []
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    const r = (url.startsWith('/api/fn/') ? queues.relay : queues.direct).shift() ?? { status: 200, json: { success: true } }
    if (r === 'network-error') throw new TypeError('Failed to fetch')
    const type = r.type ?? 'application/json'
    const body = type.includes('json') ? JSON.stringify(r.json ?? {}) : '<html>Not found</html>'
    return new Response(body, { status: r.status, headers: { 'content-type': type } })
  })
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls }
}

const req = { method: 'POST' as const, path: '/bestie/free-day', body: { a: 1 }, token: 'tok' }

describe('HTTP transport: host rule', () => {
  it('calls the edge function directly off oriri.me (e.g. localhost)', async () => {
    const f = stubFetch({})
    const t = createHttpTransport({ fetch: f.fetch, hostname: 'localhost', fnBase: FN })
    const res = await t.send(req)
    expect(f.calls.map((c) => c.url)).toEqual([`${FN}/bestie/free-day`])
    expect(res).toEqual({ status: 200, json: { success: true } })
  })

  it.each(['oriri.me', 'www.oriri.me', 'new.oriri.me'])('goes through the Relay on %s', async (hostname) => {
    const f = stubFetch({})
    await createHttpTransport({ fetch: f.fetch, hostname, fnBase: FN }).send(req)
    expect(f.calls.map((c) => c.url)).toEqual(['/api/fn/bestie/free-day'])
  })

  it('does not treat look-alike hosts as oriri.me', async () => {
    const f = stubFetch({})
    await createHttpTransport({ fetch: f.fetch, hostname: 'notoriri.me', fnBase: FN }).send(req)
    expect(f.calls[0].url).toBe(`${FN}/bestie/free-day`)
  })
})

describe('HTTP transport: custom relay', () => {
  it('uses the custom relay on oriri.me', async () => {
    const f = stubFetch({})
    const t = createHttpTransport({ fetch: f.fetch, hostname: 'www.oriri.me', fnBase: FN, relay: '/api/admin' })
    await t.send({ method: 'GET', path: '/admin/me', token: 'tok' })
    expect(f.calls.map((c) => c.url)).toEqual(['/api/admin/admin/me'])
  })
})

describe('HTTP transport: Relay fallback', () => {
  const onOriri = (f: ReturnType<typeof stubFetch>) => createHttpTransport({ fetch: f.fetch, hostname: 'www.oriri.me', fnBase: FN })

  it('an HTML 404 marks the Relay broken for the rest of the visit', async () => {
    const f = stubFetch({ relay: [{ status: 404, type: 'text/html' }] })
    const t = onOriri(f)
    expect((await t.send(req)).status).toBe(200)
    await t.send(req)
    expect(f.calls.map((c) => c.url)).toEqual(['/api/fn/bestie/free-day', `${FN}/bestie/free-day`, `${FN}/bestie/free-day`])
  })

  it('a JSON 404 from the edge function is a real answer, not a broken Relay', async () => {
    const f = stubFetch({ relay: [{ status: 404, json: { error: 'nope' } }] })
    expect(await onOriri(f).send(req)).toEqual({ status: 404, json: { error: 'nope' } })
    expect(f.calls).toHaveLength(1)
  })

  it('a 500 marks the Relay broken for the rest of the visit', async () => {
    const f = stubFetch({ relay: [{ status: 500 }] })
    const t = onOriri(f)
    await t.send(req)
    await t.send(req)
    expect(f.calls.map((c) => c.url)).toEqual(['/api/fn/bestie/free-day', `${FN}/bestie/free-day`, `${FN}/bestie/free-day`])
  })

  it.each<[string, Reply]>([
    ['a 502', { status: 502 }],
    ['a network error', 'network-error'],
  ])('%s sends only that call direct, and the next call tries the Relay again', async (_, reply) => {
    const f = stubFetch({ relay: [reply] })
    const t = onOriri(f)
    expect((await t.send(req)).status).toBe(200)
    await t.send(req)
    expect(f.calls.map((c) => c.url)).toEqual(['/api/fn/bestie/free-day', `${FN}/bestie/free-day`, '/api/fn/bestie/free-day'])
  })

  it('throws when the direct call fails too, so the client can report it', async () => {
    const f = stubFetch({ relay: ['network-error'], direct: ['network-error'] })
    await expect(onOriri(f).send(req)).rejects.toThrow()
  })
})

describe('HTTP transport: request shape', () => {
  const sent = async (r: Parameters<ReturnType<typeof createHttpTransport>['send']>[0]) => {
    const f = stubFetch({})
    await createHttpTransport({ fetch: f.fetch, hostname: 'localhost', fnBase: FN }).send(r)
    return f.calls[0].init
  }

  it('sends GET without Content-Type, to keep the preflight small', async () => {
    const init = await sent({ method: 'GET', path: '/guides', token: 'anon' })
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
    expect(init.headers).toEqual({ Authorization: 'Bearer anon' })
  })

  it('sends a JSON body with Content-Type and the bearer token', async () => {
    const init = await sent(req)
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer tok' })
    expect(init.body).toBe('{"a":1}')
  })

  it('sends form data as-is, letting the browser set the boundary', async () => {
    const form = new FormData()
    form.append('file', 'x')
    const init = await sent({ method: 'POST', path: '/upload', form, token: 'tok' })
    expect(init.body).toBe(form)
    expect(init.headers).toEqual({ Authorization: 'Bearer tok' })
  })

  it('sends a binary body as-is, with its own Content-Type (a photo)', async () => {
    const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' })
    const init = await sent({ method: 'POST', path: '/bestie/completions/c1/photo', blob, token: 'tok' })
    expect(init.body).toBe(blob)
    expect(init.headers).toEqual({ 'Content-Type': 'image/jpeg', Authorization: 'Bearer tok' })
  })

  it('returns null json when the reply is not JSON', async () => {
    const f = stubFetch({ direct: [{ status: 503, type: 'text/html' }] })
    expect(await createHttpTransport({ fetch: f.fetch, hostname: 'localhost', fnBase: FN }).send(req)).toEqual({ status: 503, json: null })
  })
})
