/**
 * Bestie (GLOSSARY.md): her Check-in in, her Day plan out. Bestie fits and records the plan in
 * the edge function (ADR-0002); a Member's browser only sends the Check-in and shows the plan.
 * A signed-out visitor never reaches this: her plan is built in the browser (ADR-0003).
 */
import type { Core } from './core'
import type { Result } from './types'

export type Energy = 'low' | 'steady' | 'high'
export type Goal = 'recharge' | 'focus' | 'glow' | 'connect' | 'unwind'
export type Pillar = 'move' | 'meal' | 'mindset' | 'meet_up'

export interface CheckInInput {
  energy: Energy
  minutes: number
  budgetAed: number
  goal: Goal | null
  /** One of the Check-in's areas; her Home area when left out. */
  area?: string
}

export interface Suggestion {
  id: string
  /** The engine option it comes from: the browser looks up its place and links by this. */
  slug: string
  title: string
  pillars: Pillar[]
  minutes: number
  costAed: number
  light: boolean
  outdoor: boolean
  energyFit: Energy[]
  why: string
}

export interface DayPlan {
  id: string
  date: string
  engineVersion: string
  checkIn: { energy: Energy; minutes: number; budgetAed: number; goal: Goal | null; area: string }
  suggestions: Suggestion[]
}

export type CheckInOutcome =
  | { outcome: 'planned'; plan: DayPlan }
  | { outcome: 'invalid'; message: string }
  | { outcome: 'notJoined' }
  | { outcome: 'signedOut' }

export type TodayOutcome = { outcome: 'planned'; plan: DayPlan } | { outcome: 'none' } | { outcome: 'signedOut' }

export function createBestie(core: Core) {
  return {
    async checkIn(input: CheckInInput): Promise<Result<CheckInOutcome>> {
      const r = await core.request<{ plan: DayPlan }>('POST', '/bestie/check-in', { body: input })
      if (r.ok) return { ok: true, data: { outcome: 'planned', plan: r.data.plan } }
      if (r.error.status === 401) return { ok: true, data: { outcome: 'signedOut' } }
      if (r.error.status === 409) return { ok: true, data: { outcome: 'notJoined' } }
      if (r.error.status === 400) return { ok: true, data: { outcome: 'invalid', message: r.error.message } }
      return r
    },

    async today(): Promise<Result<TodayOutcome>> {
      const r = await core.request<{ plan: DayPlan | null }>('GET', '/bestie/plan/today')
      if (r.ok) return { ok: true, data: r.data.plan ? { outcome: 'planned', plan: r.data.plan } : { outcome: 'none' } }
      if (r.error.status === 401) return { ok: true, data: { outcome: 'signedOut' } }
      return r
    },
  }
}
