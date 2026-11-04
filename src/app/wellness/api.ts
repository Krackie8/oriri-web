import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getAttribution, sourceLabel } from './analytics/utm';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;

export interface PilotAnswers {
  first_name: string;
  home_area: string;
  age_group: string;
  workouts: string[];
  meal_prefs: string[];
  mindset_prefs: string[];
  email: string;
  /** Optional, without @. Used to connect bestie matches on Instagram. */
  instagram: string;
  heard_from: string;
  consent: boolean;
}

/**
 * Sends one application. Hidden fields (UTMs, landing page, referrer,
 * source label, timestamp) are attached here so every row carries its source.
 * The server stores it (Admin → Sign-ups) and forwards it to the Google Sheet.
 */
export async function submitPilotApplication(answers: PilotAnswers): Promise<{ ok: boolean; error?: string }> {
  const a = getAttribution();
  const payload = {
    ...answers,
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
    page_url: window.location.href,
  };

  try {
    const res = await fetch(`${BASE_URL}/pilot/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) return { ok: false, error: json.error || 'Something went wrong. Please try again.' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'You seem to be offline. Please check your connection and try again.' };
  }
}

// ── Free 1-day plan (one per email) ─────────────────────────────────────────

const PENDING_KEY = 'wb_pending_free_day';

export interface FreeDayPayload {
  email: string;
  consent: boolean;
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
  return { status: res.status, ok: res.ok && !!json.success, used: !!json.used, error: json.error as string | undefined };
}

/**
 * Sends the plan to the visitor's inbox and records the free day.
 * - `used: true` → this email already had its free day (show membership).
 * - If the server can't be reached, the plan unlocks anyway and the request
 *   is re-sent on the next visit.
 */
export async function submitFreeDay(p: FreeDayPayload): Promise<{ ok: boolean; used?: boolean; queued?: boolean; error?: string }> {
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
    wb_source: sourceLabel(a),
    submitted_at: new Date().toISOString(),
    page_url: window.location.href,
  };
  try {
    const r = await postFreeDay(body);
    if (r.ok) return { ok: true };
    if (r.used) return { ok: false, used: true };
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
