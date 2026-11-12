/**
 * Flow state kept on this device: the inputs between screens, which emails used a free day,
 * and today's unlocked free day (kept in localStorage so closing the tab or the Instagram
 * browser doesn't lose it; it lasts until midnight, local time).
 */
import type { PlanInputs } from './engine';

const INPUTS = 'wb_plan_inputs';
const USED = 'wb_free_day_emails';
const UNLOCKED = 'wb_free_day_unlocked';

export const DEFAULT_INPUTS: PlanInputs = { energy: 'Steady', goals: [], minutes: 60, budget: 100, area: '' };

/** Today's date on this device, YYYY-MM-DD. A free day lasts until local midnight. */
export function localDay(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

type Unlock = { email: string; day: string; inputs?: PlanInputs };

function readUnlock(): Unlock | null {
  try {
    const u = JSON.parse(localStorage.getItem(UNLOCKED) || 'null') as Unlock | null;
    if (u && u.email && u.day === localDay()) return u;
  } catch {
    /* private mode or old value */
  }
  return null;
}

function writeUnlock(u: Unlock) {
  try {
    localStorage.setItem(UNLOCKED, JSON.stringify(u));
  } catch {
    /* private mode: the plan still shows for this visit */
  }
}

export function saveInputs(i: PlanInputs) {
  try {
    sessionStorage.setItem(INPUTS, JSON.stringify(i));
  } catch {
    /* private mode */
  }
  // Editing answers on your free day re-plans the same day; it doesn't lock it again.
  const u = readUnlock();
  if (u) writeUnlock({ ...u, inputs: i });
}

export function loadInputs(): PlanInputs | null {
  try {
    const raw = sessionStorage.getItem(INPUTS);
    if (raw) return { ...DEFAULT_INPUTS, ...JSON.parse(raw) };
  } catch {
    /* fall through */
  }
  // New tab or coming back later today: pick up the answers from today's free day
  const u = readUnlock();
  return u?.inputs ? { ...DEFAULT_INPUTS, ...u.inputs } : null;
}

export const normEmail = (e: string) => e.trim().toLowerCase();

export function usedEmails(): string[] {
  try {
    return JSON.parse(localStorage.getItem(USED) || '[]');
  } catch {
    return [];
  }
}

export function markEmailUsed(email: string) {
  try {
    const list = new Set(usedEmails());
    list.add(normEmail(email));
    localStorage.setItem(USED, JSON.stringify([...list]));
  } catch {
    /* private mode */
  }
}

/** The email that unlocked today's free day on this device, if any. */
export function getUnlocked(): string | null {
  const u = readUnlock();
  if (u) return u.email;
  try {
    // Older visits kept the unlock for the tab only
    return sessionStorage.getItem(UNLOCKED);
  } catch {
    return null;
  }
}
export function setUnlocked(email: string, inputs?: PlanInputs | null) {
  writeUnlock({ email: normEmail(email), day: localDay(), inputs: inputs || undefined });
}

/**
 * One sign-up does both: getting the free day puts you on the waitlist.
 * True once this device has signed up with any email.
 */
export const onWaitlist = () => usedEmails().length > 0;

/** Where every "Join the waitlist" button goes: the free day planner, whose sign-up is the waitlist. */
export const JOIN_PATH = '/plan/inputs';
