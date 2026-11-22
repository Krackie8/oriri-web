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
