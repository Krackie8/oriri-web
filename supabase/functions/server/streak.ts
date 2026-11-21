/**
 * The Streak (DEC-013, #74): the run of Dubai days on which she completed at least one Suggestion.
 * - Weeks run Monday to Sunday. The first missed day in a week is her free rest day: the Streak is
 *   kept but does not go up. A second missed day in the same week ends it. A rest day never carries over.
 * - Today, before her first tick, is never a missed day.
 * - Computed from her live Completions every time it is read, never stored. It never touches Levels.
 * Pure, so vitest drives it directly.
 */

const DAY_MS = 86_400_000
const toNum = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / DAY_MS)
const toDate = (n: number) => new Date(n * DAY_MS).toISOString().slice(0, 10)

export interface StreakView {
  count: number
  todayDone: boolean
  /** Her live Streak has used this week's rest day. */
  restUsedThisWeek: boolean
  /** Yesterday was the rest day that kept her Streak. */
  restDayYesterday: boolean
}

/** The Monday of that date's week. */
export const weekStart = (date: string): string => {
  const n = toNum(date)
  const weekday = (new Date(n * DAY_MS).getUTCDay() + 6) % 7 // Monday 0 … Sunday 6
  return toDate(n - weekday)
}

/** `days` are Dubai dates with at least one live Completion, in any order, possibly repeated. */
export function streakOf(days: string[], today: string): StreakView {
  const done = new Set(days)
  const none: StreakView = { count: 0, todayDone: false, restUsedThisWeek: false, restDayYesterday: false }
  if (!done.size) return none
  const earliest = Math.min(...[...done].map(toNum))
  const t = toNum(today)
  const todayDone = done.has(today)
  let count = todayDone ? 1 : 0
  const restUsed = new Set<string>() // weeks whose rest day the walk has used
  let restDayYesterday = false
  for (let d = t - 1; d >= earliest; d--) {
    const date = toDate(d)
    if (done.has(date)) { count++; continue }
    const week = weekStart(date)
    if (restUsed.has(week)) break
    restUsed.add(week)
    if (d === t - 1) restDayYesterday = true
  }
  if (count === 0) return { ...none, todayDone }
  return { count, todayDone, restUsedThisWeek: restUsed.has(weekStart(today)), restDayYesterday }
}
