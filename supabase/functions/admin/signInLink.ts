/**
 * Team-only sign-in link. It must never reveal who is an admin: every outcome (unknown email,
 * Member, rate-limited, malformed, mail failure) looks the same to the caller.
 */

export interface SignInLinkDeps {
  findUserIdByEmail(email: string): Promise<string | null>
  isAdmin(id: string): Promise<boolean>
  makeLink(email: string, redirectTo: string): Promise<string>
  sendMail(to: string, subject: string, text: string, html: string): Promise<void>
  limiter: { hit(key: string, max: number, windowMs: number): Promise<boolean> }
  redirectTo: string
  sleep(ms: number): Promise<void>
  /** Clock in ms; defaults to Date.now. Injected so tests run on a fake clock. */
  now?: () => number
}

export const SIGN_IN_FLOOR_MS = 1200
const WINDOW_MS = 15 * 60 * 1000
const MAX_PER_EMAIL = 3
const MAX_PER_IP = 10
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const SIGN_IN_ORIGINS = ['https://www.oriri.me', 'https://new.oriri.me', 'http://localhost:8443']

/** Exact match against the list only; the raw header is never echoed. */
export function redirectToFor(originHeader: string | undefined): string {
  const origin = SIGN_IN_ORIGINS.find((o) => o === originHeader) ?? SIGN_IN_ORIGINS[0]
  return `${origin}/admin`
}

const esc = (v: string) => v.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`)

export async function requestSignInLink(email: unknown, ip: string, deps: SignInLinkDeps): Promise<void> {
  try {
    if (typeof email !== 'string') return
    const clean = email.trim().toLowerCase()
    if (clean.length > 200 || !EMAIL_RE.test(clean)) return

    if (!(await deps.limiter.hit(`email:${clean}`, MAX_PER_EMAIL, WINDOW_MS))) return
    if (!(await deps.limiter.hit(`ip:${ip}`, MAX_PER_IP, WINDOW_MS))) return

    const id = await deps.findUserIdByEmail(clean)
    if (!id) return
    if (!(await deps.isAdmin(id))) return

    const link = await deps.makeLink(clean, deps.redirectTo)
    const text =
      `Here's your link to sign in to Oriri Admin. It works once and expires soon.\n\n${link}\n\n` +
      `Didn't ask for this? You can ignore this email.`
    const html =
      `<p>Here's your link to sign in to Oriri Admin. It works once and expires soon.</p>` +
      `<p><a href="${esc(link)}">Sign in to Oriri Admin</a></p>` +
      `<p>Didn't ask for this? You can ignore this email.</p>`
    await deps.sendMail(clean, 'Sign in to Oriri Admin', text, html)
  } catch {
    // Swallowed on purpose: the caller must not learn anything from a failure.
  }
}

/** KV-backed sliding-window limiter: `admin:signin:<key>` = { hits: number[] }. */
export function createKvLimiter(
  kv: { get(key: string): Promise<any>; set(key: string, value: any): Promise<void> },
  now: () => number = Date.now,
) {
  return {
    async hit(key: string, max: number, windowMs: number): Promise<boolean> {
      const k = `admin:signin:${key}`
      const t = now()
      const prev = await kv.get(k)
      const hits: number[] = (Array.isArray(prev?.hits) ? prev.hits : []).filter(
        (h: unknown): h is number => typeof h === 'number' && t - h < windowMs,
      )
      if (hits.length >= max) return false
      hits.push(t)
      await kv.set(k, { hits })
      return true
    },
  }
}
