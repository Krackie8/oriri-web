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
