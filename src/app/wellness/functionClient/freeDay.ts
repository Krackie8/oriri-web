/**
 * Free day: the free Bestie day a visitor claims with her email (GLOSSARY.md).
 * - The email is trimmed and lower-cased, so "Me@X.com" and "me@x.com" are one Free day.
 * - Attribution, her local day and the page go with the claim, so Ren knows which channels work.
 * - If the claim can't be sent, it is queued in localStorage and the plan unlocks anyway.
 *   The queue is re-sent once on the next visit (retryPending, called on site load).
 */
import type { Attribution } from '../analytics/utm'
import type { Core } from './core'
import type { Result } from './types'

export const PENDING_KEY = 'wb_pending_free_day'
const PATH = '/bestie/free-day'

export interface FreeDayClaim {
  email: string
  consent: boolean
  /** Optional waitlist extras (asked later, at account set-up). */
  instagram?: string
  heard_from?: string
  inputs: { energy: string; goals: string[]; minutes: number; budget: number; area: string }
  /** `time` carries the duration, e.g. '45 min'. `url` is the follow-through link. */
  plan: { time: string; label: string; title: string; venue: string; cost: string; url: string }[]
}

export type ClaimOutcome =
  | { outcome: 'claimed' }
  /** `today`: the same email already claimed today, so it is still her Free day. */
  | { outcome: 'alreadyUsed'; today: boolean }
  | { outcome: 'queued' }
  | { outcome: 'invalid'; message: string }

export type RetryOutcome = { outcome: 'sent' | 'dropped' | 'kept' | 'nothing' }

/** Browser things the Free day needs, passed in so tests can control them. */
export interface FreeDayEnv {
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  attribution: () => Attribution
  sourceLabel: (a: Attribution) => string
  /** The visitor's own date (YYYY-MM-DD): the same email on the same day gets its Free day back. */
  localDay: () => string
  pageUrl: () => string
  now: () => Date
}

type Sent = { kind: 'claimed' } | { kind: 'used'; today: boolean } | { kind: 'invalid'; message: string } | { kind: 'failed' }

export function createFreeDay(core: Core, env: FreeDayEnv) {
  let retried = false

  const post = async (body: Record<string, unknown>): Promise<Sent> => {
    const r = await core.request('POST', PATH, { body })
    if (r.ok) return { kind: 'claimed' }
    const details = (r.error.details ?? {}) as { used?: boolean; today?: boolean; error?: string }
    if (details.used) return { kind: 'used', today: !!details.today }
    if (r.error.status === 400) return { kind: 'invalid', message: details.error || 'Please check your details.' }
    return { kind: 'failed' }
  }

  const safely = <T>(fn: () => T): T | undefined => {
    try {
      return fn()
    } catch {
      return undefined
    }
  }

  return {
    async claim(c: FreeDayClaim): Promise<Result<ClaimOutcome>> {
      const a = env.attribution()
      const body = {
        ...c,
        email: c.email.trim().toLowerCase(),
        utm_source: a.utm_source || '',
        utm_medium: a.utm_medium || '',
        utm_campaign: a.utm_campaign || '',
        utm_content: a.utm_content || '',
        utm_term: a.utm_term || '',
        landing_page: a.landing_page,
        referrer: a.referrer,
        first_touch_source: a.first_touch_source,
        first_touch_medium: a.first_touch_medium,
        first_touch_campaign: a.first_touch_campaign,
        wb_source: env.sourceLabel(a),
        submitted_at: env.now().toISOString(),
        local_day: env.localDay(),
        page_url: env.pageUrl(),
      }
      const s = await post(body)
      if (s.kind === 'claimed') return { ok: true, data: { outcome: 'claimed' } }
      if (s.kind === 'used') return { ok: true, data: { outcome: 'alreadyUsed', today: s.today } }
      if (s.kind === 'invalid') return { ok: true, data: { outcome: 'invalid', message: s.message } }
      safely(() => env.storage.setItem(PENDING_KEY, JSON.stringify(body))) // private mode: nothing to keep
      return { ok: true, data: { outcome: 'queued' } }
    },

    /** Re-send a queued claim. Runs once per visit; later calls do nothing. */
    async retryPending(): Promise<Result<RetryOutcome>> {
      if (retried) return { ok: true, data: { outcome: 'nothing' } }
      retried = true
      const raw = safely(() => env.storage.getItem(PENDING_KEY))
      if (!raw) return { ok: true, data: { outcome: 'nothing' } }
      const body = safely(() => JSON.parse(raw) as Record<string, unknown>)
      if (!body || typeof body !== 'object') {
        safely(() => env.storage.removeItem(PENDING_KEY))
        return { ok: true, data: { outcome: 'nothing' } }
      }
      const s = await post(body)
      if (s.kind === 'failed') return { ok: true, data: { outcome: 'kept' } }
      safely(() => env.storage.removeItem(PENDING_KEY))
      return { ok: true, data: { outcome: s.kind === 'claimed' ? 'sent' : 'dropped' } }
    },
  }
}
