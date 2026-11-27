/**
 * The Admin function's app. Kept free of Deno-only things (Deno.env, Deno.serve) so vitest can
 * import it under Node; index.tsx builds the real deps and serves it.
 *
 * Every route lives under /admin/ because the function is named `admin`.
 */
import { Hono, type Context } from 'hono'
import { cors } from 'hono/cors'
import { meHandler, type MeDeps } from './me.ts'
import { loadOverview, dubaiDate, type OverviewDeps } from './overview.ts'
import { cleanQuery, isUuid, toDetail, toListItem, type MembersDeps } from './members.ts'
import { requestSignInLink, redirectToFor, ipKey, SIGN_IN_FLOOR_MS, SIGN_IN_WORK_TIMEOUT_MS, type SignInLinkDeps } from './signInLink.ts'
import { getTeam, addToTeam, removeFromTeam, type TeamDeps } from './team.ts'
import { decidePlaceHandler, decideActivityHandler, decideEventHandler, decideContentHandler, undoRunHandler, type CatalogueDeps } from './catalogue.ts'
import { getEvents, createEvent, updateEvent, deleteEvent, getBookings, removeBooking, uploadPhoto, type EventsDeps } from './events.ts'

export type { SignInLinkDeps }

export type { MeDeps }

export type { OverviewDeps }

export type { MembersDeps }

export type { TeamDeps }

export type { EventsDeps }

export type { CatalogueDeps }

export interface AdminUser {
  id: string
  email: string
  signedInAt: number | null
}

export interface AdminDeps {
  isAdmin(userId: string): Promise<boolean>
  userFromToken(token: string | undefined): Promise<AdminUser | null>
  signInLink: SignInLinkDeps
  overview: OverviewDeps
  me: MeDeps
  members: MembersDeps
  team: TeamDeps
  events: EventsDeps
  catalogue: CatalogueDeps
}

const ALLOWED_ORIGINS = [
  'https://oriri.me',
  'https://www.oriri.me',
  'https://new.oriri.me', // staging
]

/** Same allow-list as the Member function `server`. */
function allowedOrigin(origin: string | undefined): string | null {
  if (!origin) return ALLOWED_ORIGINS[0]
  if (ALLOWED_ORIGINS.includes(origin)) return origin
  try {
    const { protocol, hostname } = new URL(origin)
    if (
      protocol === 'https:' &&
      (hostname === 'figma.com' || /\.(figma\.com|figma\.site|figma\.net|figmausercontent\.com)$/.test(hostname))
    ) return origin
  } catch { /* malformed origin */ }
  if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return origin
  return null
}

/** 401 with no signed-in user, 403 for a signed-in non-admin, otherwise the user. */
export async function requireAdmin(
  c: Context,
  deps: Pick<AdminDeps, 'isAdmin' | 'userFromToken'>,
): Promise<{ user: AdminUser } | Response> {
  const header = c.req.header('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() || undefined : undefined
  const user = token ? await deps.userFromToken(token) : null
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  if (!(await deps.isAdmin(user.id))) return c.json({ error: 'Forbidden' }, 403)
  return { user }
}

export function createAdminApp(deps: AdminDeps): Hono {
  const app = new Hono()
  app.use('*', cors({
    origin: (origin) => allowedOrigin(origin),
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }))

  // Always the same 200, after a fixed floor, whatever happened. Reveals nothing about who is an admin.
  app.post('/admin/sign-in-link', async (c) => {
    const now = deps.signInLink.now ?? Date.now
    const start = now()
    const body = await c.req.json().catch(() => null)
    const email = body && typeof body === 'object' ? (body as { email?: unknown }).email : undefined
    const ip = ipKey(c.req.header('x-forwarded-for'), c.req.header('cf-connecting-ip'))
    // The work runs in the background and is bounded, so the answer time never depends on it.
    let timer: ReturnType<typeof setTimeout> | undefined
    const work = requestSignInLink(email, ip, {
      ...deps.signInLink,
      redirectTo: redirectToFor(c.req.header('Origin')),
    })
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, SIGN_IN_WORK_TIMEOUT_MS)
      ;(timer as { unref?: () => void }).unref?.()
    })
    deps.signInLink.background(Promise.race([work, timeout]).finally(() => clearTimeout(timer)))
    await deps.signInLink.sleep(Math.max(0, SIGN_IN_FLOOR_MS - (now() - start)))
    return c.json({ success: true, data: { sent: true } })
  })
  app.get('/admin/me', (c) => meHandler(c, deps))
  app.get('/admin/overview', async (c) => {
    const auth = await requireAdmin(c, deps)
    if (auth instanceof Response) return auth
    try {
      return c.json({ success: true, data: await loadOverview(deps.overview) })
    } catch (err) {
      console.error('admin/overview: failed', (err as { message?: string } | null)?.message)
      return c.json({ success: false, error: 'Could not load the overview' }, 500)
    }
  })
  app.get('/admin/members', async (c) => {
    const auth = await requireAdmin(c, deps)
    if (auth instanceof Response) return auth
    try {
      const [rows, ids, tests] = await Promise.all([
        deps.members.list(cleanQuery(c.req.query('q'))),
        deps.members.adminIds(),
        deps.members.testEmails(),
      ])
      const adminIds = new Set(ids)
      return c.json({ success: true, data: rows.map((r) => toListItem(r, adminIds, tests)) })
    } catch (err) {
      console.error('admin/members: failed', (err as { message?: string } | null)?.message)
      return c.json({ success: false, error: 'Could not load Members' }, 500)
    }
  })
  app.get('/admin/members/:id', async (c) => {
    const auth = await requireAdmin(c, deps)
    if (auth instanceof Response) return auth
    const id = c.req.param('id')
    if (!isUuid(id)) return c.json({ error: 'Not found' }, 404)
    try {
      const [row, ids, tests] = await Promise.all([
        deps.members.detail(id),
        deps.members.adminIds(),
        deps.members.testEmails(),
      ])
      if (!row) return c.json({ error: 'Not found' }, 404)
      const today = dubaiDate((deps.members.now ?? (() => new Date()))())
      return c.json({ success: true, data: toDetail(row, id, new Set(ids), tests, today) })
    } catch (err) {
      console.error('admin/members/:id: failed', (err as { message?: string } | null)?.message)
      return c.json({ success: false, error: 'Could not load Members' }, 500)
    }
  })
  // Team: requireAdmin first on every route; the change routes then need a fresh sign-in (team.ts).
  app.get('/admin/team', async (c) => {
    const auth = await requireAdmin(c, deps)
    if (auth instanceof Response) return auth
    return getTeam(c, deps.team, auth.user)
  })
  app.post('/admin/team', async (c) => {
    const auth = await requireAdmin(c, deps)
    if (auth instanceof Response) return auth
    return addToTeam(c, deps.team, auth.user)
  })
  app.delete('/admin/team/:userId', async (c) => {
    const auth = await requireAdmin(c, deps)
    if (auth instanceof Response) return auth
    return removeFromTeam(c, deps.team, auth.user)
  })
  // Events (#100 piece 3): requireAdmin first on every route; the rules are in events.ts.
  const admin = (handle: (c: Context, user: AdminUser) => Promise<Response> | Response) => async (c: Context) => {
    const auth = await requireAdmin(c, deps)
    if (auth instanceof Response) return auth
    return handle(c, auth.user)
  }
  app.get('/admin/events', admin((c, user) => getEvents(c, deps.events, user)))
  app.post('/admin/events', admin((c, user) => createEvent(c, deps.events, user)))
  app.post('/admin/events/photo', admin((c) => uploadPhoto(c, deps.events)))
  app.put('/admin/events/:kind/:id', admin((c, user) => updateEvent(c, deps.events, user)))
  app.delete('/admin/events/:kind/:id', admin((c, user) => deleteEvent(c, deps.events, user)))
  app.get('/admin/events/:kind/:id/bookings', admin((c) => getBookings(c, deps.events)))
  app.delete('/admin/events/:kind/:id/bookings/:email', admin((c, user) => removeBooking(c, deps.events, user)))
  // Catalogue review: requireAdmin first on every route; the rules and the words are in catalogue.ts.
  app.post('/admin/catalogue/places/:placeId/decision', admin((c, user) => decidePlaceHandler(c, deps.catalogue, user)))
  app.post('/admin/catalogue/places/:placeId/activities/:itemId/decision', admin((c, user) => decideActivityHandler(c, deps.catalogue, user)))
  app.post('/admin/catalogue/events/:itemId/decision', admin((c, user) => decideEventHandler(c, deps.catalogue, user)))
  app.post('/admin/catalogue/content/:contentId/decision', admin((c, user) => decideContentHandler(c, deps.catalogue, user)))
  app.post('/admin/catalogue/runs/:runId/undo', admin((c, user) => undoRunHandler(c, deps.catalogue, user)))
  return app
}
