import { describe, it, expect, vi, afterEach } from 'vitest'
import { createAdminApp, type AdminDeps } from './app'
import { TEAM_MAIL, TEAM_MAIL_TIMEOUT_MS, toChange, type TeamDeps } from './team'

const NOW = Date.parse('2026-11-23T10:00:00Z')
const FRESH = NOW - 60_000
const STALE = NOW - 11 * 60_000

const ME = '00000000-0000-0000-0000-00000000a001'
const REN = '00000000-0000-0000-0000-00000000a002'
const NEW = '00000000-0000-0000-0000-00000000a003'

type AdminRow = { user_id: string; email: string; display_name: string | null; since: Date; last_sign_in_at: Date | null }
const row = (user_id: string, email: string, display_name: string | null): AdminRow =>
  ({ user_id, email, display_name, since: new Date('2026-11-22T08:00:00Z'), last_sign_in_at: null })

function build(opts: { over?: Partial<TeamDeps>; signedInAt?: number | null; admin?: boolean; user?: boolean } = {}) {
  const admins: AdminRow[] = [row(ME, 'khairul@example.test', 'Khairul Ahmed'), row(REN, 'ren@example.test', 'Ren')]
  const accounts = new Map<string, string>([
    ['khairul@example.test', ME],
    ['ren@example.test', REN],
    ['new@example.test', NEW],
  ])
  const pending: Promise<unknown>[] = []
  const settle = async () => { await Promise.allSettled(pending) }
  const team: TeamDeps = {
    list: vi.fn(async () => admins.map((a) => ({ ...a }))),
    changes: vi.fn(async () => []),
    findUserIdByEmail: vi.fn(async (email: string) => accounts.get(email) ?? null),
    createAccount: vi.fn(async () => '00000000-0000-0000-0000-00000000a0ff'),
    grant: vi.fn(async (_actor: string, target: string, email: string) => {
      if (!admins.some((a) => a.user_id === target)) admins.push(row(target, email, email))
      return 'granted' as const
    }),
    remove: vi.fn(async (_actor: string, target: string) => {
      const i = admins.findIndex((a) => a.user_id === target)
      if (i < 0) return 'notAdmin' as const
      if (admins.length < 2) return 'last' as const
      admins.splice(i, 1)
      return 'removed' as const
    }),
    sendMail: vi.fn(async () => {}),
    background: vi.fn((p: Promise<unknown>) => { pending.push(p) }),
    now: () => NOW,
    ...opts.over,
  }
  const signedInAt = opts.signedInAt === undefined ? FRESH : opts.signedInAt
  const deps = {
    isAdmin: async () => opts.admin ?? true,
    userFromToken: async () => (opts.user === false ? null : { id: ME, email: 'khairul@example.test', signedInAt }),
    team,
  } as unknown as AdminDeps
  const app = createAdminApp(deps)
  const call = (method: string, path: string, body?: unknown, auth = true) =>
    app.request(path, {
      method,
      headers: { ...(auth ? { Authorization: 'Bearer t' } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    })
  return { team, admins, call, settle }
}

const sentTo = (team: TeamDeps) => (team.sendMail as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0] as string)
const subjects = (team: TeamDeps) => (team.sendMail as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[1] as string)

afterEach(() => vi.restoreAllMocks())

describe('the guards', () => {
  it.each([
    ['GET', '/admin/team', undefined],
    ['POST', '/admin/team', { email: 'new@example.test' }],
    ['DELETE', `/admin/team/${REN}`, undefined],
  ])('%s %s with no token is 401', async (method, path, body) => {
    const { call, team } = build({ user: false })
    expect((await call(method, path, body, false)).status).toBe(401)
    expect(team.list).not.toHaveBeenCalled()
    expect(team.grant).not.toHaveBeenCalled()
    expect(team.remove).not.toHaveBeenCalled()
  })
  it.each([
    ['GET', '/admin/team', undefined],
    ['POST', '/admin/team', { email: 'new@example.test' }],
    ['DELETE', `/admin/team/${REN}`, undefined],
  ])('%s %s for a non-admin is 403 and nothing runs', async (method, path, body) => {
    const { call, team } = build({ admin: false })
    const res = await call(method, path, body)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Forbidden' })
    expect(team.list).not.toHaveBeenCalled()
    expect(team.findUserIdByEmail).not.toHaveBeenCalled()
    expect(team.grant).not.toHaveBeenCalled()
    expect(team.remove).not.toHaveBeenCalled()
    expect(team.sendMail).not.toHaveBeenCalled()
  })
  it.each([
    ['a stale sign-in', STALE],
    ['no sign-in time', null],
  ])('adding with %s is 403 reauth, and nothing else runs', async (_n, signedInAt) => {
    const { call, team } = build({ signedInAt })
    const res = await call('POST', '/admin/team', { email: 'not an email' })
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ success: false, error: 'reauth' })
    expect(team.findUserIdByEmail).not.toHaveBeenCalled()
    expect(team.createAccount).not.toHaveBeenCalled()
    expect(team.grant).not.toHaveBeenCalled()
    expect(team.sendMail).not.toHaveBeenCalled()
  })
  it('removing with a stale sign-in is 403 reauth, even for yourself, and nothing runs', async () => {
    const { call, team } = build({ signedInAt: STALE })
    for (const id of [REN, ME, 'not-a-uuid']) {
      const res = await call('DELETE', `/admin/team/${id}`)
      expect(res.status).toBe(403)
      expect(await res.json()).toEqual({ success: false, error: 'reauth' })
    }
    expect(team.list).not.toHaveBeenCalled()
    expect(team.remove).not.toHaveBeenCalled()
    expect(team.sendMail).not.toHaveBeenCalled()
  })
  it('reading the team does not need a fresh sign-in', async () => {
    const { call } = build({ signedInAt: STALE })
    expect((await call('GET', '/admin/team')).status).toBe(200)
  })
})

describe('POST /admin/team', () => {
  it.each([
    ['not an email'],
    [''],
    [42],
    [`${'a'.repeat(190)}@example.test`],
  ])('a bad email (%j) is 400 invalid', async (email) => {
    const { call, team } = build()
    const res = await call('POST', '/admin/team', { email })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid' })
    expect(team.findUserIdByEmail).not.toHaveBeenCalled()
    expect(team.grant).not.toHaveBeenCalled()
  })
  it('a body that is not JSON is 400 invalid', async () => {
    const { call } = build()
    const res = await call('POST', '/admin/team', 'nope')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid' })
  })
  it('looks the email up trimmed and lower-cased, and an existing account is not created again', async () => {
    const { call, team } = build()
    const res = await call('POST', '/admin/team', { email: '  New@Example.TEST ' })
    expect(res.status).toBe(200)
    expect(team.findUserIdByEmail).toHaveBeenCalledWith('new@example.test')
    expect(team.createAccount).not.toHaveBeenCalled()
    expect(team.grant).toHaveBeenCalledWith(ME, NEW, 'new@example.test')
  })
  it('an unknown email creates the account once, then grants it', async () => {
    const { call, team } = build()
    const res = await call('POST', '/admin/team', { email: 'stranger@example.test' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, data: { result: 'added' } })
    expect(team.createAccount).toHaveBeenCalledTimes(1)
    expect(team.createAccount).toHaveBeenCalledWith('stranger@example.test')
    expect(team.grant).toHaveBeenCalledTimes(1)
    expect(team.grant).toHaveBeenCalledWith(ME, '00000000-0000-0000-0000-00000000a0ff', 'stranger@example.test')
  })
  it('an existing live admin is already, with no grant and no mail', async () => {
    const { call, team } = build()
    const res = await call('POST', '/admin/team', { email: 'REN@example.test' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, data: { result: 'already' } })
    expect(team.grant).not.toHaveBeenCalled()
    expect(team.createAccount).not.toHaveBeenCalled()
    expect(team.sendMail).not.toHaveBeenCalled()
  })
  it('the new admin gets a welcome, then every admin (her too) gets a notice', async () => {
    const { call, team, admins, settle } = build()
    const before = admins.length
    await call('POST', '/admin/team', { email: 'new@example.test' })
    await settle()
    const calls = (team.sendMail as ReturnType<typeof vi.fn>).mock.calls
    expect(calls).toHaveLength(1 + before + 1)
    expect(calls[0][0]).toBe('new@example.test')
    expect(calls[0][1]).toBe(TEAM_MAIL.addedSubject)
    expect(calls[0][1]).toBe("You've been added to Oriri Admin")
    expect(calls[0][2]).toContain('You can now sign in at oriri.me/admin with this email.')
    const notices = calls.slice(1)
    expect(notices.map((c) => c[0]).sort()).toEqual(['khairul@example.test', 'new@example.test', 'ren@example.test'])
    // Who is the first name; the new account's display name is her email, so whom is the email.
    for (const c of notices) {
      expect(c[1]).toBe('Khairul added new@example.test to Oriri Admin')
      expect(c[2]).toBe("Khairul added new@example.test to Oriri Admin.\n\nIf you didn't expect this, tell the team.")
      expect(c[3]).toContain('<p>Khairul added new@example.test to Oriri Admin.</p>')
    }
  })
  it('answers 200 while a mail is still pending, and hands the mail work to background', async () => {
    vi.useFakeTimers()
    try {
      const { call, team, settle } = build({ over: { sendMail: vi.fn(() => new Promise<void>(() => {})) } })
      const res = await call('POST', '/admin/team', { email: 'new@example.test' })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ success: true, data: { result: 'added' } })
      expect(team.background).toHaveBeenCalledTimes(1)
      // The work is bounded: it is let go after the timeout even though no mail ever finishes.
      const done = settle()
      await vi.advanceTimersByTimeAsync(TEAM_MAIL_TIMEOUT_MS)
      await done
    } finally {
      vi.useRealTimers()
    }
  })
  it('removing answers 200 while a mail is still pending', async () => {
    const { call, team } = build({ over: { sendMail: vi.fn(() => new Promise<void>(() => {})) } })
    const res = await call('DELETE', `/admin/team/${REN}`)
    expect(res.status).toBe(200)
    expect(team.background).toHaveBeenCalledTimes(1)
  })
  it('escapes names in the html', async () => {
    const { call, team, admins, settle } = build()
    admins[0].display_name = '<b>Kh&ru'
    await call('POST', '/admin/team', { email: 'new@example.test' })
    await settle()
    const notice = (team.sendMail as ReturnType<typeof vi.fn>).mock.calls[1]
    expect(notice[3]).toContain('&#60;b&#62;Kh&#38;ru')
    expect(notice[3]).not.toContain('<b>')
  })
  it('a failing mail still answers 200 added, logs no address, and the other mails still go', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { call, team, settle } = build({ over: { sendMail: vi.fn(async () => { throw new Error('smtp said no to new@example.test') }) } })
    const res = await call('POST', '/admin/team', { email: 'new@example.test' })
    await settle()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, data: { result: 'added' } })
    expect(team.sendMail).toHaveBeenCalledTimes(4)
    expect(spy).toHaveBeenCalled()
    expect(JSON.stringify(spy.mock.calls)).not.toMatch(/@|00000000-/)
  })
  it('a failing notice list after the grant still answers 200 added, and notices go to the list from before plus her', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let n = 0
    const { call, team, settle } = build()
    const original = team.list as ReturnType<typeof vi.fn>
    const impl = original.getMockImplementation()!
    original.mockImplementation(async () => { n++; if (n > 1) throw new Error('db down'); return impl() })
    const res = await call('POST', '/admin/team', { email: 'new@example.test' })
    await settle()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, data: { result: 'added' } })
    expect(sentTo(team)).toEqual(['new@example.test', 'khairul@example.test', 'ren@example.test', 'new@example.test'])
    expect(subjects(team).slice(1)).toEqual(Array(3).fill('Khairul added new@example.test to Oriri Admin'))
    expect(JSON.stringify(spy.mock.calls)).not.toMatch(/@|00000000-/)
  })
  it('notices go once per address', async () => {
    const { call, team, admins, settle } = build()
    admins.push(row('00000000-0000-0000-0000-00000000a004', 'REN@example.test', null))
    await call('POST', '/admin/team', { email: 'new@example.test' })
    await settle()
    expect(sentTo(team).slice(1).map((e) => e.toLowerCase()).sort()).toEqual(['khairul@example.test', 'new@example.test', 'ren@example.test'])
  })
  it('a grant answering notActor is 403 Forbidden, and no mail is sent', async () => {
    const { call, team } = build({ over: { grant: vi.fn(async () => 'notActor' as const) } })
    const res = await call('POST', '/admin/team', { email: 'new@example.test' })
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ success: false, error: 'Forbidden' })
    expect(team.sendMail).not.toHaveBeenCalled()
  })
  it('a createAccount that fails because a concurrent add just made the account uses that account', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const find = vi.fn(async () => null as string | null)
    find.mockResolvedValueOnce(null).mockResolvedValueOnce('00000000-0000-0000-0000-00000000a0aa')
    const { call, team } = build({
      over: { findUserIdByEmail: find, createAccount: vi.fn(async () => { throw new Error('already registered') }) },
    })
    const res = await call('POST', '/admin/team', { email: 'stranger@example.test' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, data: { result: 'added' } })
    expect(find).toHaveBeenCalledTimes(2)
    expect(team.grant).toHaveBeenCalledWith(ME, '00000000-0000-0000-0000-00000000a0aa', 'stranger@example.test')
  })
  it('a failing grant is 500, sends nothing and logs no address', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { call, team } = build({ over: { grant: vi.fn(async () => { throw new Error('boom new@example.test') }) } })
    const res = await call('POST', '/admin/team', { email: 'new@example.test' })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ success: false, error: 'Could not change the team' })
    expect(team.sendMail).not.toHaveBeenCalled()
    expect(JSON.stringify(spy.mock.calls)).not.toMatch(/@|00000000-/)
  })
  it('a failing createAccount is 500 and grants nothing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { call, team } = build({ over: { createAccount: vi.fn(async () => { throw new Error('createUser failed') }) } })
    const res = await call('POST', '/admin/team', { email: 'stranger@example.test' })
    expect(res.status).toBe(500)
    expect(team.findUserIdByEmail).toHaveBeenCalledTimes(2)
    expect(team.grant).not.toHaveBeenCalled()
    expect(team.sendMail).not.toHaveBeenCalled()
  })
})

describe('DELETE /admin/team/:userId', () => {
  it('removing yourself is 400 self, and remove is not called', async () => {
    const { call, team } = build()
    for (const id of [ME, ME.toUpperCase()]) {
      const res = await call('DELETE', `/admin/team/${id}`)
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'self' })
    }
    expect(team.remove).not.toHaveBeenCalled()
  })
  it('a non-uuid is 404 and nothing runs', async () => {
    const { call, team } = build()
    expect((await call('DELETE', '/admin/team/not-a-uuid')).status).toBe(404)
    expect(team.list).not.toHaveBeenCalled()
    expect(team.remove).not.toHaveBeenCalled()
  })
  it('someone who is not an admin is 404', async () => {
    const { call, team } = build()
    const res = await call('DELETE', `/admin/team/${NEW}`)
    expect(res.status).toBe(404)
    expect(team.sendMail).not.toHaveBeenCalled()
  })
  it('remove answering notAdmin is 404 and sends nothing', async () => {
    const { call, team } = build({ over: { remove: vi.fn(async () => 'notAdmin' as const) } })
    const res = await call('DELETE', `/admin/team/${REN}`)
    expect(res.status).toBe(404)
    expect(team.sendMail).not.toHaveBeenCalled()
  })
  it('remove answering last is 409 and sends nothing', async () => {
    const { call, team } = build({ over: { remove: vi.fn(async () => 'last' as const) } })
    const res = await call('DELETE', `/admin/team/${REN}`)
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'last' })
    expect(team.sendMail).not.toHaveBeenCalled()
  })
  it('removes, passing the actor, the lower-cased id and her email, and tells every admin including her', async () => {
    const { call, team, settle } = build()
    const res = await call('DELETE', `/admin/team/${REN.toUpperCase()}`)
    await settle()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, data: { result: 'removed' } })
    expect(team.remove).toHaveBeenCalledWith(ME, REN, 'ren@example.test')
    expect(sentTo(team).sort()).toEqual(['khairul@example.test', 'ren@example.test'])
    expect(new Set(subjects(team))).toEqual(new Set(['Khairul removed Ren from Oriri Admin']))
    const html = (team.sendMail as ReturnType<typeof vi.fn>).mock.calls[0][3] as string
    expect(html).toContain('<p>Khairul removed Ren from Oriri Admin.</p>')
  })
  it('remove answering notActor is 403 Forbidden, and no mail is sent', async () => {
    const { call, team } = build({ over: { remove: vi.fn(async () => 'notActor' as const) } })
    const res = await call('DELETE', `/admin/team/${REN}`)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ success: false, error: 'Forbidden' })
    expect(team.sendMail).not.toHaveBeenCalled()
  })
  it('a failing mail still answers 200 removed', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { call, settle } = build({ over: { sendMail: vi.fn(async () => { throw new Error('smtp ren@example.test') }) } })
    const res = await call('DELETE', `/admin/team/${REN}`)
    await settle()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, data: { result: 'removed' } })
    expect(JSON.stringify(spy.mock.calls)).not.toMatch(/@|00000000-/)
  })
  it('a failing remove is 500 and sends nothing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { call, team } = build({ over: { remove: vi.fn(async () => { throw new Error('boom') }) } })
    const res = await call('DELETE', `/admin/team/${REN}`)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ success: false, error: 'Could not change the team' })
    expect(team.sendMail).not.toHaveBeenCalled()
  })
})

describe('GET /admin/team', () => {
  it('lists the team, marks your own row, and maps the changes', async () => {
    const { call } = build({
      over: {
        changes: vi.fn(async () => [
          { actor_id: ME, actor_email: 'khairul@example.test', actor_name: 'Khairul Ahmed', target_email: 'ren@example.test', action: 'add', created_at: new Date('2026-11-23T09:00:00Z') },
        ]),
      },
    })
    const res = await call('GET', '/admin/team')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      success: true,
      data: {
        members: [
          { userId: ME, name: 'Khairul Ahmed', email: 'khairul@example.test', since: '2026-11-22T08:00:00.000Z', lastSignIn: null, isYou: true },
          { userId: REN, name: 'Ren', email: 'ren@example.test', since: '2026-11-22T08:00:00.000Z', lastSignIn: null, isYou: false },
        ],
        changes: [{ who: 'Khairul', action: 'add', whom: 'ren@example.test', at: '2026-11-23T09:00:00.000Z' }],
      },
    })
  })
  it('a failure is 500 with a fixed message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { call } = build({ over: { changes: vi.fn(async () => { throw new Error('boom') }) } })
    const res = await call('GET', '/admin/team')
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ success: false, error: 'Could not load the team' })
  })
})

describe('toChange', () => {
  it('falls back to the actor email, and to a plain word for a deleted actor', () => {
    const base = { actor_id: ME, target_email: 't@example.test', action: 'remove', created_at: '2026-11-23T09:00:00Z' }
    expect(toChange({ ...base, actor_email: 'a@example.test', actor_name: 'a@example.test' }).who).toBe('a@example.test')
    expect(toChange({ ...base, actor_email: null, actor_name: null })).toEqual({
      who: 'Someone', action: 'remove', whom: 't@example.test', at: '2026-11-23T09:00:00.000Z',
    })
  })
})
