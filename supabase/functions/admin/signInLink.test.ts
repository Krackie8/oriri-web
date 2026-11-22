import { describe, it, expect, vi } from 'vitest'
import { createAdminApp } from './app'
import { requestSignInLink, createKvLimiter, redirectToFor, type SignInLinkDeps } from './signInLink'

const ADMIN_ID = 'admin-1'
const MEMBER_ID = 'member-1'
const USERS: Record<string, string> = {
  'ren@example.test': ADMIN_ID,
  'mem@example.test': MEMBER_ID,
}

function memoryLimiter() {
  const counts = new Map<string, number>()
  return {
    async hit(key: string, max: number) {
      const n = (counts.get(key) ?? 0) + 1
      counts.set(key, n)
      return n <= max
    },
  }
}

function deps(over: Partial<SignInLinkDeps> = {}) {
  const clock = { t: 1_000_000 }
  const d = {
    findUserIdByEmail: vi.fn(async (e: string) => USERS[e] ?? null),
    isAdmin: vi.fn(async (id: string) => id === ADMIN_ID),
    makeLink: vi.fn(async () => 'https://link.example.test/x'),
    sendMail: vi.fn(async () => {}),
    limiter: memoryLimiter(),
    redirectTo: 'https://www.oriri.me/admin',
    sleep: vi.fn(async (ms: number) => { clock.t += ms }),
    now: () => clock.t,
    ...over,
  }
  return { d: d as typeof d & SignInLinkDeps, clock }
}

describe('requestSignInLink', () => {
  it('admin email: link made for the clean email, one mail sent', async () => {
    const { d } = deps()
    await requestSignInLink('ren@example.test', '1.1.1.1', d)
    expect(d.makeLink).toHaveBeenCalledWith('ren@example.test', 'https://www.oriri.me/admin')
    expect(d.sendMail).toHaveBeenCalledTimes(1)
    expect((d.sendMail.mock.calls[0] as unknown[])[1]).toBe('Sign in to Oriri Admin')
  })

  it('unknown email: no link, no mail', async () => {
    const { d } = deps()
    await requestSignInLink('nobody@example.test', '1.1.1.1', d)
    expect(d.makeLink).not.toHaveBeenCalled()
    expect(d.sendMail).not.toHaveBeenCalled()
  })

  it('Member (not admin): no link, no mail', async () => {
    const { d } = deps()
    await requestSignInLink('mem@example.test', '1.1.1.1', d)
    expect(d.makeLink).not.toHaveBeenCalled()
    expect(d.sendMail).not.toHaveBeenCalled()
  })

  it('padded, mixed-case email matches', async () => {
    const { d } = deps()
    await requestSignInLink(' Ren@Example.TEST ', '1.1.1.1', d)
    expect(d.makeLink).toHaveBeenCalledWith('ren@example.test', expect.any(String))
    expect(d.sendMail).toHaveBeenCalledTimes(1)
  })

  it.each([['not-an-email'], [''], [undefined], [null], [42], [{ a: 1 }]])(
    'malformed / empty / non-string email (%j): no lookup at all',
    async (bad) => {
      const { d } = deps()
      await requestSignInLink(bad, '1.1.1.1', d)
      expect(d.findUserIdByEmail).not.toHaveBeenCalled()
      expect(d.sendMail).not.toHaveBeenCalled()
    },
  )

  it('4th request for one email in 15 min: no mail', async () => {
    const { d } = deps()
    for (let i = 0; i < 4; i++) await requestSignInLink('ren@example.test', `9.9.9.${i}`, d)
    expect(d.sendMail).toHaveBeenCalledTimes(3)
  })

  it('11th request from one IP in 15 min: no mail', async () => {
    const { d } = deps()
    for (let i = 0; i < 11; i++) await requestSignInLink(`ren${i}@example.test`, '2.2.2.2', {
      ...d,
      findUserIdByEmail: async () => ADMIN_ID,
    })
    expect(d.sendMail).toHaveBeenCalledTimes(10)
  })

  it('makeLink or sendMail throws: still resolves', async () => {
    const a = deps({ makeLink: vi.fn(async () => { throw new Error('boom') }) })
    await expect(requestSignInLink('ren@example.test', 'ip', a.d)).resolves.toBeUndefined()
    const b = deps({ sendMail: vi.fn(async () => { throw new Error('smtp') }) })
    await expect(requestSignInLink('ren@example.test', 'ip', b.d)).resolves.toBeUndefined()
  })
})

describe('redirectToFor', () => {
  it('picks only an exact allow-listed origin, never the raw header', () => {
    expect(redirectToFor('https://new.oriri.me')).toBe('https://new.oriri.me/admin')
    expect(redirectToFor('http://localhost:8443')).toBe('http://localhost:8443/admin')
    expect(redirectToFor('https://evil.example.test')).toBe('https://www.oriri.me/admin')
    expect(redirectToFor('https://www.oriri.me.evil.test')).toBe('https://www.oriri.me/admin')
    expect(redirectToFor(undefined)).toBe('https://www.oriri.me/admin')
  })
})

describe('createKvLimiter', () => {
  it('prunes to the window and stores under admin:signin:<key>', async () => {
    const store = new Map<string, any>()
    let t = 0
    const lim = createKvLimiter(
      { get: async (k) => store.get(k), set: async (k, v) => { store.set(k, v) } },
      () => t,
    )
    expect(await lim.hit('email:a', 2, 1000)).toBe(true)
    expect(await lim.hit('email:a', 2, 1000)).toBe(true)
    expect(await lim.hit('email:a', 2, 1000)).toBe(false)
    expect(store.has('admin:signin:email:a')).toBe(true)
    t = 1500
    expect(await lim.hit('email:a', 2, 1000)).toBe(true)
  })
})

describe('POST /admin/sign-in-link', () => {
  async function call(email: unknown, raw?: string) {
    const { d, clock } = deps()
    const app = createAdminApp({
      isAdmin: async () => false,
      userFromToken: async () => null,
      signInLink: d,
      overview: {},
      me: {},
    })
    const start = clock.t
    const res = await app.request('/admin/sign-in-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example.test' },
      body: raw ?? JSON.stringify({ email }),
    })
    return { status: res.status, body: await res.text(), waited: clock.t - start, d }
  }

  it('unknown, Member and admin get byte-identical answers, each after >= 1200 ms', async () => {
    const results = [
      await call('nobody@example.test'),
      await call('mem@example.test'),
      await call('ren@example.test'),
      await call(undefined, '{not json'),
    ]
    for (const r of results) {
      expect(r.status).toBe(200)
      expect(r.body).toBe('{"success":true,"data":{"sent":true}}')
      expect(r.waited).toBeGreaterThanOrEqual(1200)
    }
    // The link never takes its origin from the request.
    expect(results[2].d.makeLink).toHaveBeenCalledWith('ren@example.test', 'https://www.oriri.me/admin')
  })
})
