/**
 * Who is looking at the planner, and where a returning Member goes (#72 follow-up).
 * Checking in again replaces what she hasn't done yet and restarts each Suggestion's time gate,
 * so a Member who already has a Day plan today is taken back to it. She checks in again only
 * when she chooses to, from her day ("Check in again").
 */
import type { ServerDayPlan } from '../functionClient';
/** A Member sees her Day plan from Bestie on the server (ADR-0003); anyone else is a visitor. */
export type Viewer = { kind: 'checking' } | { kind: 'visitor' } | { kind: 'member'; plan: ServerDayPlan | null };

/** The link from her day to the Check-in, when she wants a new plan. */
export const CHECK_IN_AGAIN = '/plan/inputs?again=1';

export const wantsAgain = (search: string) => new URLSearchParams(search).get('again') === '1';

type Seen = { kind: 'checking' } | { kind: 'visitor' } | { kind: 'member'; hasPlanToday: boolean };

/** Where the Check-in screen should send her: her day, the Check-in itself, or wait to find out. */
export function checkInGate(viewer: Seen, again: boolean): 'day' | 'inputs' | 'wait' {
  if (again) return 'inputs'
  if (viewer.kind === 'checking') return 'wait'
  return viewer.kind === 'member' && viewer.hasPlanToday ? 'day' : 'inputs'
}

/** The Viewer as the gate sees it. */
export const seen = (v: Viewer): Seen => (v.kind === 'member' ? { kind: 'member', hasPlanToday: !!v.plan } : v);
