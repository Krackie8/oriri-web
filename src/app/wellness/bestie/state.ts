/** Flow state kept on this device: the inputs between screens and which emails used a free day. */
import type { PlanInputs } from './engine';

const INPUTS = 'wb_plan_inputs';
const USED = 'wb_free_day_emails';
const UNLOCKED = 'wb_free_day_unlocked';

export const DEFAULT_INPUTS: PlanInputs = { energy: 'Steady', goals: [], minutes: 60, budget: 100, area: '' };

export function saveInputs(i: PlanInputs) {
  try {
    sessionStorage.setItem(INPUTS, JSON.stringify(i));
    sessionStorage.removeItem(UNLOCKED);
  } catch {
    /* private mode */
  }
}

export function loadInputs(): PlanInputs | null {
  try {
    const raw = sessionStorage.getItem(INPUTS);
    return raw ? { ...DEFAULT_INPUTS, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
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

/** The email that unlocked this session's plan (so a refresh keeps it open). */
export function getUnlocked(): string | null {
  try {
    return sessionStorage.getItem(UNLOCKED);
  } catch {
    return null;
  }
}
export function setUnlocked(email: string) {
  try {
    sessionStorage.setItem(UNLOCKED, email);
  } catch {
    /* private mode */
  }
}
