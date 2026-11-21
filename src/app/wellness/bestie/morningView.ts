/**
 * Morning with Bestie and the evening Wrap-up (#74, DEC-013): what the screens say, as pure functions.
 */
import type { StreakView } from '../functionClient/bestie';

const DUBAI_OFFSET_MS = 4 * 3600_000; // UTC+4, no daylight saving
const WRAP_UP_FROM_HOUR = 18;

const dubaiClock = (d: Date) => new Date(d.getTime() + DUBAI_OFFSET_MS);

/** Her Streak in one line. When it has ended, it looks forward, never back. */
export function streakLine(s: StreakView): string {
  if (s.count === 0) return "New Streak starts with today's first tick";
  return `${s.count}-day Streak · ${s.restUsedThisWeek ? 'rest day used, Streak kept' : 'rest day available'}`;
}

/** The Day screen turns into the Wrap-up from 18:00 until midnight, Dubai time. */
export const isWrapUpTime = (now: Date) => dubaiClock(now).getUTCHours() >= WRAP_UP_FROM_HOUR;

/** Today's plan for the Wrap-up: what is still open first, then what is done, and how far she got. */
export function wrapUpView<T>(items: T[], isDone: (t: T) => boolean): { open: T[]; done: T[]; summary: string } {
  const open = items.filter((t) => !isDone(t));
  const done = items.filter(isDone);
  return { open, done, summary: `${done.length} of ${items.length} done` };
}
