/**
 * Tap & track: the visitor's progress, kept in their own browser.
 * Each day stores the plan and which items were ticked, so we can show
 * today's progress, a streak and weekly totals. (Members: Bestie learns from this.)
 */
import type { Goal, PlanItem } from './engine';

const KEY = 'wb_tracker_v1';

interface DayLog {
  items: { id: string; pillar: string; title: string; minutes: number }[];
  done: string[];
  goals: Goal[];
}
type Log = Record<string, DayLog>;

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function read(): Log {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}
function write(log: Log) {
  try {
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    /* private mode */
  }
}

/** Record today's plan (keeps ticks for items that are still in the plan). */
export function saveToday(items: PlanItem[], goals: Goal[]): string[] {
  const log = read();
  const k = dayKey();
  const ids = new Set(items.map((i) => i.id));
  const done = (log[k]?.done || []).filter((id) => ids.has(id));
  log[k] = { items: items.map(({ id, pillar, title, minutes }) => ({ id, pillar, title, minutes })), done, goals };
  write(log);
  return done;
}

export function setDone(id: string, on: boolean): string[] {
  const log = read();
  const k = dayKey();
  const day = log[k] || { items: [], done: [], goals: [] };
  day.done = on ? [...new Set([...day.done, id])] : day.done.filter((x) => x !== id);
  log[k] = day;
  write(log);
  return day.done;
}

export interface Stats {
  streak: number;
  weekDone: number;
  weekMoveMinutes: number;
  weekMindMinutes: number;
  daysThisWeek: number;
}

export function stats(): Stats {
  const log = read();
  const has = (k: string) => (log[k]?.done.length || 0) > 0;
  // Streak: consecutive days with at least one tick, ending today (or yesterday)
  let streak = 0;
  const d = new Date();
  if (!has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (has(dayKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  let weekDone = 0;
  let weekMoveMinutes = 0;
  let weekMindMinutes = 0;
  let daysThisWeek = 0;
  for (let i = 0; i < 7; i++) {
    const x = new Date();
    x.setDate(x.getDate() - i);
    const day = log[dayKey(x)];
    if (!day?.done.length) continue;
    daysThisWeek++;
    for (const id of day.done) {
      const it = day.items.find((t) => t.id === id);
      if (!it) continue;
      weekDone++;
      if (it.pillar === 'move') weekMoveMinutes += it.minutes;
      if (it.pillar === 'mindset') weekMindMinutes += it.minutes;
    }
  }
  return { streak, weekDone, weekMoveMinutes, weekMindMinutes, daysThisWeek };
}

/** "Your week with Bestie": what the last 7 days on this device add up to. */
export interface WeekRecap {
  daysActive: number;
  done: number;
  moveMinutes: number;
  mindMinutes: number;
  /** The pick ticked most often. */
  favourite?: string;
  loved: string[];
  notForMe: string[];
  /** Picks planned but never ticked. */
  skipped: string[];
}

export function weekRecap(): WeekRecap {
  const log = read();
  let feel: Record<string, string> = {};
  try {
    feel = JSON.parse(localStorage.getItem('wb_plan_feel_v1') || '{}');
  } catch {
    /* private mode */
  }
  const s = stats();
  const count: Record<string, number> = {};
  const titles: Record<string, string> = {};
  const planned = new Set<string>();
  const ticked = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const x = new Date();
    x.setDate(x.getDate() - i);
    const day = log[dayKey(x)];
    if (!day) continue;
    for (const it of day.items) {
      titles[it.id] = it.title;
      if (it.id !== 'rest') planned.add(it.id);
    }
    for (const id of day.done) {
      count[id] = (count[id] || 0) + 1;
      ticked.add(id);
    }
  }
  const favourite = Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0];
  const byFeel = (f: string) => Object.entries(feel).filter(([id, v]) => v === f && titles[id]).map(([id]) => titles[id]);
  return {
    daysActive: s.daysThisWeek,
    done: s.weekDone,
    moveMinutes: s.weekMoveMinutes,
    mindMinutes: s.weekMindMinutes,
    favourite: favourite ? titles[favourite] : undefined,
    loved: byFeel('loved'),
    notForMe: byFeel('skip'),
    skipped: [...planned].filter((id) => !ticked.has(id)).map((id) => titles[id]).slice(0, 2),
  };
}
