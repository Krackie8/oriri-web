/**
 * Bestie (GLOSSARY.md): her Check-in in, her Day plan out. Bestie fits and records the plan in
 * the edge function (ADR-0002); a Member's browser only sends the Check-in and shows the plan.
 * A signed-out visitor never reaches this: her plan is built in the browser (ADR-0003).
 */
import type { Core } from './core'
import type { FunctionError, Result } from './types'

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
  /** Something Bestie has never suggested to her before. */
  newForYou: boolean
}

/** One of up to three things she could swap to: a Catalogue item, not yet a Suggestion. */
export interface SwapOption {
  catalogueItemId: string
  slug: string
  title: string
  pillars: Pillar[]
  minutes: number
  costAed: number
  light: boolean
  outdoor: boolean
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

export type OptionsOutcome = { outcome: 'options'; options: SwapOption[] } | { outcome: 'gone' } | { outcome: 'notJoined' } | { outcome: 'signedOut' }
/** `gone`: the Suggestion is no longer open in today's plan. `notOffered`: the pick is not among her choices any more. */
export type ChangeOutcome =
  | { outcome: 'planned'; plan: DayPlan }
  | { outcome: 'gone' }
  | { outcome: 'notOffered' }
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

    /** Up to three things she could do instead (#71). Looking records nothing. */
    async options(suggestionId: string): Promise<Result<OptionsOutcome>> {
      const r = await core.request<{ options: SwapOption[] }>('GET', `/bestie/suggestions/${encodeURIComponent(suggestionId)}/options`)
      if (r.ok) return { ok: true, data: { outcome: 'options', options: r.data.options } }
      return changeError(r)
    },

    /** She picked one: the old Suggestion is swapped, the ones she passed on are recorded too. */
    async swap(suggestionId: string, catalogueItemId: string): Promise<Result<ChangeOutcome>> {
      const r = await core.request<{ plan: DayPlan }>('POST', `/bestie/suggestions/${encodeURIComponent(suggestionId)}/swap`, { body: { catalogueItemId } })
      if (r.ok) return { ok: true, data: { outcome: 'planned', plan: r.data.plan } }
      if (r.error.status === 400) return { ok: true, data: { outcome: 'notOffered' } }
      return changeError(r)
    },

    async skip(suggestionId: string): Promise<Result<ChangeOutcome>> {
      const r = await core.request<{ plan: DayPlan }>('POST', `/bestie/suggestions/${encodeURIComponent(suggestionId)}/skip`)
      if (r.ok) return { ok: true, data: { outcome: 'planned', plan: r.data.plan } }
      return changeError(r)
    },
  }
}

/** The outcomes a swap, skip or options call shares; anything else stays an error. */
function changeError(r: { ok: false; error: FunctionError }) {
  if (r.error.status === 401) return { ok: true as const, data: { outcome: 'signedOut' as const } }
  if (r.error.status === 404) return { ok: true as const, data: { outcome: 'gone' as const } }
  if (r.error.status === 409) return { ok: true as const, data: { outcome: 'notJoined' as const } }
  return r
}
