/**
 * The Team page: who is an admin, and adding or removing one. Pure and Deno-free so vitest can
 * import it under Node; index.tsx builds the real deps.
 *
 * Guards, all here on the server, after requireAdmin:
 * - A change needs a sign-in under 10 minutes old (isFresh). It is checked before anything else runs.
 * - You can't remove yourself, and the last admin is never removed (TEAM_REMOVE_SQL decides that
 *   under a lock).
 * - Every change is recorded in bestie.team_changes by the same statement that makes it.
 * - Every admin is told by email after the change. A mail failure is logged (never with an address)
 *   and never undoes or fails the change.
 */
import type { Context } from 'hono'
import type { AdminUser } from './app.ts'
import { isFresh } from './fresh.ts'
import { firstNameOf } from './me.ts'
import { isUuid, nameOf } from './members.ts'
import { esc, EMAIL_RE, SIGN_IN_ORIGINS } from './signInLink.ts'

export interface TeamMember { userId: string; name: string | null; email: string; since: string; lastSignIn: string | null; isYou: boolean }
export interface TeamChange { who: string; action: 'add' | 'remove'; whom: string; at: string }

export interface TeamDeps {
  /** Runs TEAM_LIST_SQL (read-only): the live admins. */
  list(): Promise<Record<string, unknown>[]>
  /** Runs TEAM_CHANGES_SQL (read-only): the last 20 changes, newest first. */
  changes(): Promise<Record<string, unknown>[]>
  /** lower(email), read-only, as in signInLink. */
  findUserIdByEmail(email: string): Promise<string | null>
  /** auth.admin.createUser({ email, email_confirm: true }); returns the new id. Throws on error. */
  createAccount(email: string): Promise<string>
  /** Runs TEAM_GRANT_SQL as service_role. */
  grant(actorId: string, targetId: string, targetEmail: string): Promise<void>
  /** Runs TEAM_REMOVE_SQL as service_role. */
  remove(actorId: string, targetId: string, targetEmail: string): Promise<'removed' | 'last' | 'notAdmin'>
  sendMail(to: string, subject: string, text: string, html: string): Promise<void>
  /** Clock in ms; defaults to Date.now. */
  now?: () => number
}

/** Subjects can't carry a line break into the mail headers. */
const oneLine = (s: string) => s.replace(/[\r\n\t]+/g, ' ')

export const TEAM_MAIL = {
  addedSubject: "You've been added to Oriri Admin",
  noticeSubject: (who: string, verb: 'added' | 'removed', whom: string) => oneLine(`${who} ${verb} ${whom} on Oriri Admin`),
}

const ADMIN_URL = `${SIGN_IN_ORIGINS[0]}/admin`
const WELCOME_TEXT = 'You can now sign in at oriri.me/admin with this email.'
const WELCOME_HTML = `<p>You can now sign in at <a href="${esc(ADMIN_URL)}">oriri.me/admin</a> with this email.</p>`
const NOTICE_LINE = "If you didn't expect this, tell the team."

type Row = Record<string, unknown>

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const iso = (v: unknown): string | null => {
  if (v === null || v === undefined || v === '') return null
  const d = v instanceof Date ? v : new Date(v as string)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** The first name when there is one, otherwise the email. */
const labelOf = (r: Row | undefined, fallback: string): string =>
  (r && (firstNameOf(typeof r.display_name === 'string' ? r.display_name : null) ?? (str(r.email) || null))) || fallback

const idOf = (r: Row) => str(r.user_id).toLowerCase()

export function toMember(r: Row, youId: string): TeamMember {
  return {
    userId: str(r.user_id),
    name: nameOf(r.display_name),
    email: str(r.email),
    since: iso(r.since) ?? '',
    lastSignIn: iso(r.last_sign_in_at),
    isYou: idOf(r) === youId.toLowerCase(),
  }
}

export function toChange(r: Row): TeamChange {
  const who = firstNameOf(typeof r.actor_name === 'string' ? r.actor_name : null) ?? (str(r.actor_email) || 'Someone')
  return {
    who,
    action: r.action === 'remove' ? 'remove' : 'add',
    whom: str(r.target_email),
    at: iso(r.created_at) ?? '',
  }
}

/** Never an address or an id: only a fixed label and the error's code, if it has one. */
function logFailure(label: string, err: unknown) {
  const code = (err as { code?: unknown } | null)?.code
  console.error(`admin/team: ${label}`, typeof code === 'string' && /^[A-Za-z0-9_]{1,40}$/.test(code) ? code : '')
}

async function sendOne(deps: TeamDeps, to: string, subject: string, text: string, html: string) {
  if (!to) return
  try {
    await deps.sendMail(to, subject, text, html)
  } catch (err) {
    logFailure('a mail failed', err)
  }
}

async function sendNotices(deps: TeamDeps, admins: Row[], who: string, verb: 'added' | 'removed', whom: string) {
  const subject = TEAM_MAIL.noticeSubject(who, verb, whom)
  const text = `${subject}.\n\n${NOTICE_LINE}`
  const html = `<p>${esc(oneLine(who))} ${verb} ${esc(oneLine(whom))} on Oriri Admin.</p><p>${esc(NOTICE_LINE)}</p>`
  for (const r of admins) await sendOne(deps, str(r.email), subject, text, html)
}

const reauth = (c: Context) => c.json({ success: false, error: 'reauth' }, 403)
const changeFailed = (c: Context) => c.json({ success: false, error: 'Could not change the team' }, 500)
const fresh = (deps: TeamDeps, user: AdminUser) => isFresh(user.signedInAt, (deps.now ?? Date.now)())

/** GET /admin/team. */
export async function getTeam(c: Context, deps: TeamDeps, user: AdminUser): Promise<Response> {
  try {
    const [rows, changes] = await Promise.all([deps.list(), deps.changes()])
    return c.json({
      success: true,
      data: { members: rows.map((r) => toMember(r, user.id)), changes: changes.map(toChange) },
    })
  } catch (err) {
    logFailure('load failed', err)
    return c.json({ success: false, error: 'Could not load the team' }, 500)
  }
}

/** POST /admin/team { email }. */
export async function addToTeam(c: Context, deps: TeamDeps, user: AdminUser): Promise<Response> {
  if (!fresh(deps, user)) return reauth(c)

  const body = await c.req.json().catch(() => null)
  const raw = body && typeof body === 'object' ? (body as { email?: unknown }).email : undefined
  const email = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (!email || email.length > 200 || !EMAIL_RE.test(email)) return c.json({ error: 'invalid' }, 400)

  let targetId: string
  try {
    const found = await deps.findUserIdByEmail(email)
    if (found && (await deps.list()).some((r) => idOf(r) === found.toLowerCase())) {
      return c.json({ success: true, data: { result: 'already' } })
    }
    targetId = found ?? (await deps.createAccount(email))
    await deps.grant(user.id, targetId, email)
  } catch (err) {
    logFailure('add failed', err)
    return changeFailed(c)
  }

  // The change is made and recorded. From here nothing changes the answer.
  await sendOne(deps, email, TEAM_MAIL.addedSubject, WELCOME_TEXT, WELCOME_HTML)
  try {
    const after = await deps.list()
    const who = labelOf(after.find((r) => idOf(r) === user.id.toLowerCase()), user.email || 'An admin')
    const whom = labelOf(after.find((r) => idOf(r) === targetId.toLowerCase()), email)
    await sendNotices(deps, after, who, 'added', whom)
  } catch (err) {
    logFailure('notices failed', err)
  }
  return c.json({ success: true, data: { result: 'added' } })
}

/** DELETE /admin/team/:userId. */
export async function removeFromTeam(c: Context, deps: TeamDeps, user: AdminUser): Promise<Response> {
  if (!fresh(deps, user)) return reauth(c)

  const raw = c.req.param('userId') ?? ''
  const targetId = raw.toLowerCase()
  if (targetId === user.id.toLowerCase()) return c.json({ error: 'self' }, 400)
  if (!isUuid(raw)) return c.json({ error: 'Not found' }, 404)

  // Read before the removal, so the removed admin is told too.
  let before: Row[]
  let result: string
  try {
    before = await deps.list()
    const target = before.find((r) => idOf(r) === targetId)
    if (!target) return c.json({ error: 'Not found' }, 404)
    result = await deps.remove(user.id, targetId, str(target.email))
  } catch (err) {
    logFailure('remove failed', err)
    return changeFailed(c)
  }
  if (result === 'last') return c.json({ error: 'last' }, 409)
  if (result === 'notAdmin') return c.json({ error: 'Not found' }, 404)
  if (result !== 'removed') {
    logFailure('remove gave no result', null)
    return changeFailed(c)
  }

  const who = labelOf(before.find((r) => idOf(r) === user.id.toLowerCase()), user.email || 'An admin')
  const whom = labelOf(before.find((r) => idOf(r) === targetId), 'an admin')
  await sendNotices(deps, before, who, 'removed', whom)
  return c.json({ success: true, data: { result: 'removed' } })
}
