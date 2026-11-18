/**
 * Member (GLOSSARY.md): Join and "who am I". Joining writes bestie.members and
 * bestie.consents only in the edge function; the browser just sends her answers.
 */
import type { Core } from './core'
import type { Result } from './types'

export type ConsentPurpose = 'terms' | 'location' | 'wellness_signals' | 'personalisation' | 'push' | 'marketing'

export interface JoinInput {
  adult: boolean
  homeArea: string
  /** Optional, shown as "self-added". */
  instagram?: string
  consents: Partial<Record<ConsentPurpose, boolean>>
}

export interface Member {
  city: string
  homeArea: string
  instagram: string | null
}

export type JoinOutcome =
  | { outcome: 'joined'; member: Member }
  | { outcome: 'alreadyJoined'; member: Member }
  | { outcome: 'invalid'; message: string }
  | { outcome: 'signedOut' }

export type MeOutcome = { outcome: 'member'; member: Member } | { outcome: 'notJoined' } | { outcome: 'signedOut' }

export function createMember(core: Core) {
  return {
    async join(input: JoinInput): Promise<Result<JoinOutcome>> {
      const r = await core.request<{ outcome: 'joined' | 'alreadyJoined'; member: Member }>('POST', '/bestie/join', { body: input })
      if (r.ok) return { ok: true, data: { outcome: r.data.outcome, member: r.data.member } }
      if (r.error.status === 401) return { ok: true, data: { outcome: 'signedOut' } }
      if (r.error.status === 400) return { ok: true, data: { outcome: 'invalid', message: r.error.message } }
      return r
    },

    async me(): Promise<Result<MeOutcome>> {
      const r = await core.request<{ member: Member | null }>('GET', '/bestie/member')
      if (r.ok) return { ok: true, data: r.data.member ? { outcome: 'member', member: r.data.member } : { outcome: 'notJoined' } }
      if (r.error.status === 401) return { ok: true, data: { outcome: 'signedOut' } }
      return r
    },
  }
}
