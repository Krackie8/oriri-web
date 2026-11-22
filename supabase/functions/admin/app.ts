/**
 * The Admin function's app. Kept free of Deno-only things (Deno.env, Deno.serve) so vitest can
 * import it under Node; index.tsx builds the real deps and serves it.
 *
 * Every route lives under /admin/ because the function is named `admin`.
 */
import { Hono, type Context } from 'hono'
import { cors } from 'hono/cors'
import { meHandler, type MeDeps } from './me.ts'
import { loadOverview, type OverviewDeps } from './overview.ts'
import { requestSignInLink, redirectToFor, ipKey, SIGN_IN_FLOOR_MS, SIGN_IN_WORK_TIMEOUT_MS, type SignInLinkDeps } from './signInLink.ts'

export type { SignInLinkDeps }

export type { MeDeps }

export type { OverviewDeps }

export interface AdminUser {
  id: string
  email: string
}

export interface AdminDeps {
  isAdmin(userId: string): Promise<boolean>
  userFromToken(token: string | undefined): Promise<AdminUser | null>
  signInLink: SignInLinkDeps
  overview: OverviewDeps
  me: MeDeps
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
    } catch {
      console.error('admin/overview: failed')
      return c.json({ success: false, error: 'Could not load the overview' }, 500)
    }
  })
  return app
}
