import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getAttribution, sourceLabel } from './analytics/utm';
import { localDay } from './bestie/state';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;

// ── Free 1-day plan + waitlist (one sign-up does both; one free day per email) ──

const PENDING_KEY = 'wb_pending_free_day';

export interface FreeDayPayload {
  email: string;
  consent: boolean;
  /** Optional waitlist extras (asked later, at account set-up). The sign-up itself is email + consent. */
  instagram?: string;
  heard_from?: string;
  inputs: { energy: string; goals: string[]; minutes: number; budget: number; area: string };
  /** `time` carries the duration, e.g. '45 min'. `url` is the follow-through link. */
  plan: { time: string; label: string; title: string; venue: string; cost: string; url: string }[];
}

async function postFreeDay(body: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/bestie/free-day`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok && !!json.success, used: !!json.used, today: !!json.today, error: json.error as string | undefined };
}

/**
 * Sends the plan to the visitor's inbox and records the free day.
 * - `used: true` → this email already had its free day (show membership).
 * - If the server can't be reached, the plan unlocks anyway and the request
 *   is re-sent on the next visit.
 */
export async function submitFreeDay(p: FreeDayPayload): Promise<{ ok: boolean; used?: boolean; today?: boolean; queued?: boolean; error?: string }> {
  const a = getAttribution();
  const body = {
    ...p,
    email: p.email.trim().toLowerCase(),
    utm_source: a.utm_source || '',
    utm_medium: a.utm_medium || '',
    utm_campaign: a.utm_campaign || '',
    utm_content: a.utm_content || '',
    utm_term: a.utm_term || '',
    landing_page: a.landing_page,
    referrer: a.referrer,
    first_touch_source: a.first_touch_source,
    first_touch_medium: a.first_touch_medium,
    first_touch_campaign: a.first_touch_campaign,
    wb_source: sourceLabel(a),
    submitted_at: new Date().toISOString(),
    /** The visitor's own date: the same email on the same day gets its free day back. */
    local_day: localDay(),
    page_url: window.location.href,
  };
  try {
    const r = await postFreeDay(body);
    if (r.ok) return { ok: true };
    if (r.used) return { ok: false, used: true, today: r.today };
    if (r.status === 400) return { ok: false, error: r.error || 'Please check your details.' };
  } catch {
    /* offline or server unreachable: queue below */
  }
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(body));
  } catch {
    /* private mode */
  }
  return { ok: true, queued: true };
}

/** Re-send a queued free day (called once on site load). */
export async function flushPendingFreeDay() {
  let body: Record<string, unknown> | null = null;
  try {
    body = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
  } catch {
    return;
  }
  if (!body) return;
  try {
    const r = await postFreeDay(body);
    if (r.ok || r.used || r.status === 400) localStorage.removeItem(PENDING_KEY);
  } catch {
    /* try again next visit */
  }
}
