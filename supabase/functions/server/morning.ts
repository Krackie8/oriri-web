/**
 * Morning with Bestie (DEC-013, #74): the rules that need no storage.
 * - The line: a dated line wins for everyone; otherwise, with her personalisation Consent, the line
 *   in Ren's voice that best fits her today and was not shown to her in the last 14 days; without it,
 *   the day's general line, the same for everyone.
 * - The sky: Dubai's sunset by the NOAA formula, and the hot season (May to October, the engine's
 *   rule). Worded as a season, never as a forecast.
 * - This week's Meet up: from the next 7 Dubai days, pinned first, then a Stepsisters moment, then an event.
 * Pure, so vitest drives it directly.
 */
import type { Energy, Goal, Pillar } from './catalogueSeed.ts'
import type { StreakView } from './streak.ts'

const DAY_MS = 86_400_000
const dayNumber = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / DAY_MS)
const addDays = (date: string, n: number) => new Date((dayNumber(date) + n) * DAY_MS).toISOString().slice(0, 10)
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/* ── The line ───────────────────────────────────────────────────────────── */

export const LINE_MOMENTS = ['any', 'streak', 'rest_day', 'comeback', 'first_week', 'low_energy'] as const
export type LineMoment = (typeof LINE_MOMENTS)[number]

export interface DailyLine {
  id: string
  body: string
  author: 'ren' | 'bestie'
  goal: Goal | null
  pillar: Pillar | null
  energy: Energy | null
  moment: LineMoment
  showOn: string | null
}

export interface LineContext {
  today: string
  /** Her latest personalisation Consent is a yes. */
  personal: boolean
  moment: LineMoment
  goal: Goal | null
  energy: Energy | null
  weakest: Pillar | null
}

const COMEBACK_DAYS = 3
const FIRST_WEEK_DAYS = 7
const STREAK_MOMENT_AT = 3
const FRESH_DAYS = 14

/** Which moment of her journey today is. Comeback > rest day > first week > Streak > low energy > any. */
export function momentOf(i: { today: string; joinedOn: string; lastDoneOn: string | null; streak: StreakView; lastEnergy: Energy | null }): LineMoment {
  const t = dayNumber(i.today)
  const firstWeek = t - dayNumber(i.joinedOn) < FIRST_WEEK_DAYS
  const away = i.lastDoneOn === null ? Infinity : t - dayNumber(i.lastDoneOn)
  if (!firstWeek && away >= COMEBACK_DAYS) return 'comeback'
  if (i.streak.restDayYesterday) return 'rest_day'
  if (firstWeek) return 'first_week'
  if (i.streak.count >= STREAK_MOMENT_AT) return 'streak'
  if (i.lastEnergy === 'low') return 'low_energy'
  return 'any'
}

const untagged = (l: DailyLine) => l.moment === 'any' && !l.goal && !l.pillar && !l.energy
const byId = (a: DailyLine, b: DailyLine) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
const rotate = <T>(xs: T[], today: string) => xs[((dayNumber(today) % xs.length) + xs.length) % xs.length]

function score(l: DailyLine, c: LineContext): number | null {
  if (l.moment !== 'any' && l.moment !== c.moment) return null
  if (l.goal && l.goal !== c.goal) return null
  if (l.pillar && l.pillar !== c.weakest) return null
  if (l.energy && l.energy !== c.energy) return null
  return (l.moment !== 'any' ? 4 : 0) + (l.goal ? 2 : 0) + (l.pillar ? 2 : 0) + (l.energy ? 1 : 0)
}

export function pickLine(lines: DailyLine[], c: LineContext, recent: { lineId: string; shownOn: string }[]): DailyLine | null {
  const dated = lines.filter((l) => l.showOn === c.today).sort(byId)
  if (dated.length) return dated[0]
  const pool = lines.filter((l) => !l.showOn).sort(byId)
  if (!c.personal) {
    const general = pool.filter(untagged)
    return general.length ? rotate(general, c.today) : null
  }
  const lastShown = new Map<string, string>()
  for (const r of recent) if ((lastShown.get(r.lineId) ?? '') < r.shownOn) lastShown.set(r.lineId, r.shownOn)
  const scored = pool.map((l) => ({ l, s: score(l, c) })).filter((x): x is { l: DailyLine; s: number } => x.s !== null)
  if (!scored.length) return null
  const freshCutoff = addDays(c.today, -FRESH_DAYS)
  const fresh = scored.filter((x) => (lastShown.get(x.l.id) ?? '') <= freshCutoff)
  if (fresh.length) {
    const top = Math.max(...fresh.map((x) => x.s))
    return rotate(fresh.filter((x) => x.s === top).map((x) => x.l), c.today)
  }
  // Every line that fits her was shown in the last 14 days: the one shown longest ago.
  return [...scored].sort((a, b) => (lastShown.get(a.l.id)! < lastShown.get(b.l.id)! ? -1 : 1) || b.s - a.s)[0].l
}

/* ── The sky ────────────────────────────────────────────────────────────── */

const DUBAI_LAT = 25.2048
const DUBAI_LON = 55.2708
const DUBAI_UTC_OFFSET_H = 4
/** May to October: the same hot months the plan engine uses. */
export const HOT_MONTHS = [4, 5, 6, 7, 8, 9]

const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

/** Dubai's sunset on a date, as '5:36pm' (NOAA general solar position approximation). */
export function sunsetAt(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  const start = Date.UTC(d.getUTCFullYear(), 0, 1)
  const doy = Math.round((d.getTime() - start) / DAY_MS) + 1
  const leap = new Date(Date.UTC(d.getUTCFullYear(), 1, 29)).getUTCMonth() === 1
  const g = ((2 * Math.PI) / (leap ? 366 : 365)) * (doy - 1 + 0.5) // fractional year at local noon
  const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g))
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
    + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g)
  const lat = rad(DUBAI_LAT)
  const ha = deg(Math.acos(Math.cos(rad(90.833)) / (Math.cos(lat) * Math.cos(decl)) - Math.tan(lat) * Math.tan(decl)))
  const utcMin = 720 - 4 * (DUBAI_LON - ha) - eqTime
  return clock(Math.round(utcMin + DUBAI_UTC_OFFSET_H * 60))
}

const clock = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')}${h < 12 ? 'am' : 'pm'}`
}

export function skyHint(date: string): { sunset: string; hot: boolean; hint: string } {
  const sunset = sunsetAt(date)
  const hot = HOT_MONTHS.includes(Number(date.slice(5, 7)) - 1)
  return { sunset, hot, hint: hot ? `Hot season: outdoors after sunset (${sunset})` : `Good season for outdoors · sunset ${sunset}` }
}

/* ── This week's Meet up ────────────────────────────────────────────────── */

/** A Stepsisters moment or a wellness event as the key-value store holds it: nothing is trusted. */
export interface MeetUpRow {
  id: string
  kind: 'moment' | 'event'
  title: string
  date?: unknown
  startTime?: unknown
  location?: unknown
  link?: unknown
  pinned?: unknown
  type?: unknown
}

export interface MeetUpView {
  title: string
  date: string
  time: string | null
  location: string | null
  url: string | null
}

const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const timeOf = (v: unknown) => {
  const m = typeof v === 'string' ? /^(\d{1,2}):(\d{2})/.exec(v) : null
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null
  return clock(Number(m[1]) * 60 + Number(m[2]))
}

export function thisWeeksMeetUp(rows: MeetUpRow[], today: string): MeetUpView | null {
  const last = addDays(today, 6)
  const ok = rows.filter((r) =>
    typeof r.date === 'string' && ISO_DATE.test(r.date) && r.date >= today && r.date <= last && r.type !== 'recap' && !!text(r.title))
  const rank = (r: MeetUpRow) => (r.pinned === true ? 0 : r.kind === 'moment' ? 1 : 2)
  const best = ok.sort((a, b) => rank(a) - rank(b) || (a.date as string).localeCompare(b.date as string) || a.id.localeCompare(b.id))[0]
  if (!best) return null
  return { title: text(best.title)!, date: best.date as string, time: timeOf(best.startTime), location: text(best.location), url: text(best.link) }
}
