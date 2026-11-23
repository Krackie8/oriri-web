import type { Overview } from '../wellness/functionClient/admin'

export function greeting(hourDubai: number, firstName: string | null): string {
  const words = hourDubai < 12 ? 'Good morning' : hourDubai < 17 ? 'Good afternoon' : 'Good evening'
  return firstName ? `${words}, ${firstName}` : words
}

export function trendWord(now: number, before: number): string {
  if (now === before) return 'same as before'
  if (before === 0) return 'new'
  const pct = Math.round(((now - before) / before) * 100)
  return pct >= 0 ? `+${pct}%` : `−${Math.abs(pct)}%`
}

/** 3120 -> "3.1k"; below 1000 stays whole. */
export function short(n: number): string {
  if (n < 1000) return String(n)
  return `${parseFloat((n / 1000).toFixed(1))}k`
}

export function summaryLine(o: Overview): string {
  return `${short(o.members.total)} Members · ${short(o.visits.week)} visits this week`
}

/** The Dubai hour (UTC+4) from the current time, whatever the device's time zone. */
export function dubaiHour(now: Date = new Date()): number {
  return (now.getUTCHours() + 4) % 24
}

/** What the "who am I" call came back with, tagged with the session it was asked for. */
export type MeResult =
  | { kind: 'pending' }
  | { kind: 'ok'; gen: number; isAdmin: boolean }
  | { kind: 'unauthorised'; gen: number }
  | { kind: 'failed'; gen: number }

export type AdminScreen = 'checking' | 'login' | 'home' | 'retry'

/**
 * Which screen to show. `gen` counts session changes (sign-in, sign-out); a result
 * from an older session is stale and never decides anything.
 */
export function decideScreen(hasSession: boolean | null, gen: number, me: MeResult): AdminScreen {
  if (hasSession === null) return 'checking'
  if (!hasSession) return 'login'
  if (me.kind === 'pending' || me.gen !== gen) return 'checking'
  if (me.kind === 'ok') return me.isAdmin ? 'home' : 'login'
  if (me.kind === 'unauthorised') return 'login'
  return 'retry'
}

/** Where Team's "sign in again" link leaves a note, so Team opens after sign-in. */
export const AFTER_SIGN_IN_KEY = 'oriri-admin-after'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DUBAI_MS = 4 * 60 * 60 * 1000

/** A UTC instant shifted so its UTC fields read as Dubai wall-clock (UTC+4, no DST). */
function dubai(d: Date): Date {
  return new Date(d.getTime() + DUBAI_MS)
}
function dubaiDay(d: Date): number {
  const x = dubai(d)
  return Math.floor(x.getTime() / 86_400_000)
}

/** "today", "yesterday" or "14 Nov" ("14 Nov 2025" in another year), by the Dubai date. */
export function dayWord(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  const diff = dubaiDay(now) - dubaiDay(d)
  if (diff === 0) return 'today'
  if (diff === 1) return 'yesterday'
  const x = dubai(d)
  const base = `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`
  return x.getUTCFullYear() === dubai(now).getUTCFullYear() ? base : `${base} ${x.getUTCFullYear()}`
}

/** "09:12" in Dubai time. */
export function timeWord(iso: string): string {
  const x = dubai(new Date(iso))
  return `${String(x.getUTCHours()).padStart(2, '0')}:${String(x.getUTCMinutes()).padStart(2, '0')}`
}

export function lastSeenWord(iso: string | null, now: Date = new Date()): string {
  return iso ? `Last seen ${dayWord(iso, now)}` : 'Never'
}

export function consentWord(v: boolean | null): '✓' | '✗' | 'Not asked' {
  return v === null ? 'Not asked' : v ? '✓' : '✗'
}

export const CONSENT_LABELS = {
  terms: 'Terms',
  location: 'Location',
  wellness_signals: 'Wellness',
  personalisation: 'Personalisation',
  push: 'Push',
  marketing: 'Marketing',
} as const

export function signsInWithWord(providers: string[]): string {
  return providers.map((p) => (p === 'email' ? 'email link' : p === 'google' ? 'Google' : 'another way')).join(' and ')
}

export function teamProblemWord(p: 'reauth' | 'invalid' | 'self' | 'last' | 'other'): string {
  switch (p) {
    case 'reauth':
      return 'For safety, sign in again to change the team.'
    case 'invalid':
      return "That doesn't look like an email address."
    case 'self':
      return "You can't remove yourself."
    case 'last':
      return 'The team needs at least one admin.'
    default:
      return "That didn't work. Try again."
  }
}

/** "1 admin", "3 admins". */
export function countWord(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}
