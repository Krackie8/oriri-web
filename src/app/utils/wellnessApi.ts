/**
 * Wellness API — frontend wrapper around the /wellness/* and /waitlist/* routes.
 *
 * Every call resolves to a result object instead of throwing, so a paused
 * Edge Function degrades to an empty state rather than breaking Home.
 */

import { projectId, publicAnonKey } from './supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface WellnessEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  location?: string;
  category?: string;
  description?: string;
  link?: string;
  image?: string;
  partner?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WellnessGuide {
  id: string;
  title: string;
  category?: string;
  note?: string;
  image?: string;
  link?: string;
  pinned?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StepsistersMoment {
  id: string;
  title: string;
  type?: 'upcoming' | 'recap';
  date?: string; // YYYY-MM-DD
  startTime?: string;
  location?: string;
  description?: string;
  link?: string; // RSVP / WhatsApp group link
  photos?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export const EVENT_CATEGORIES = ['Movement', 'Mind', 'Food', 'Beauty', 'Workshop', 'Pop-up', 'Community'];
export const GUIDE_CATEGORIES = ['Move', 'Meal', 'Mindset'];
export const GUIDE_AREAS: Record<string, { blurb: string; placeholder: string }> = {
  Move: { blurb: 'Workout studios we love', placeholder: 'e.g. Reformer Pilates at Studio X, JLT' },
  Meal: { blurb: 'Cafés & restaurants worth the trip', placeholder: 'e.g. Brunch at Café Y, Al Quoz' },
  Mindset: { blurb: 'Podcasts & coaches that shift things', placeholder: 'e.g. Coach Z: breathwork sessions' },
};

async function request<T>(
  path: string,
  accessToken: string | undefined,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken || publicAnonKey}`,
        ...(init.headers ?? {}),
      },
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok || json?.success === false) {
      const error = json?.error || `${response.status} ${response.statusText}`;
      console.error(`[WellnessApi] ${init.method ?? 'GET'} ${path} failed:`, error);
      return { ok: false, error };
    }

    return { ok: true, data: json.data as T };
  } catch (error: any) {
    console.error(`[WellnessApi] ${init.method ?? 'GET'} ${path} threw:`, error?.message ?? error);
    return { ok: false, error: error?.message ?? 'Network error' };
  }
}

// ── Events ───────────────────────────────────────────────────────────────────
export const getEvents = () => request<WellnessEvent[]>('/wellness/events', undefined);
export const createEvent = (token: string | undefined, event: Omit<WellnessEvent, 'id'>) =>
  request<WellnessEvent>('/wellness/events', token, { method: 'POST', body: JSON.stringify(event) });
export const updateEvent = (token: string | undefined, id: string, event: Partial<WellnessEvent>) =>
  request<WellnessEvent>(`/wellness/events/${id}`, token, { method: 'PUT', body: JSON.stringify(event) });
export const deleteEvent = (token: string | undefined, id: string) =>
  request<void>(`/wellness/events/${id}`, token, { method: 'DELETE' });

// ── Guides ───────────────────────────────────────────────────────────────────
export const getGuides = () => request<WellnessGuide[]>('/wellness/guides', undefined);
export const createGuide = (token: string | undefined, guide: Omit<WellnessGuide, 'id'>) =>
  request<WellnessGuide>('/wellness/guides', token, { method: 'POST', body: JSON.stringify(guide) });
export const updateGuide = (token: string | undefined, id: string, guide: Partial<WellnessGuide>) =>
  request<WellnessGuide>(`/wellness/guides/${id}`, token, { method: 'PUT', body: JSON.stringify(guide) });
export const deleteGuide = (token: string | undefined, id: string) =>
  request<void>(`/wellness/guides/${id}`, token, { method: 'DELETE' });

// ── Stepsisters moments ──────────────────────────────────────────────────────
export const getMoments = () => request<StepsistersMoment[]>('/wellness/moments', undefined);
export const createMoment = (token: string | undefined, m: Omit<StepsistersMoment, 'id'>) =>
  request<StepsistersMoment>('/wellness/moments', token, { method: 'POST', body: JSON.stringify(m) });
export const updateMoment = (token: string | undefined, id: string, m: Partial<StepsistersMoment>) =>
  request<StepsistersMoment>(`/wellness/moments/${id}`, token, { method: 'PUT', body: JSON.stringify(m) });
export const deleteMoment = (token: string | undefined, id: string) =>
  request<void>(`/wellness/moments/${id}`, token, { method: 'DELETE' });

/** Upload a photo (admin only). Returns a permanent public URL. */
export async function uploadPhoto(token: string | undefined, file: File): Promise<ApiResult<{ url: string }>> {
  try {
    const body = new FormData();
    body.append('file', file);
    const response = await fetch(`${BASE_URL}/wellness/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token || publicAnonKey}` },
      body,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json?.success) return { ok: false, error: json?.error || `${response.status}` };
    return { ok: true, data: json.data };
  } catch (error: any) {
    return { ok: false, error: error?.message ?? 'Upload failed' };
  }
}

// ── Bestie waitlist ──────────────────────────────────────────────────────────
export const joinBestieWaitlist = (token: string | undefined) =>
  request<{ joined: boolean; alreadyJoined: boolean }>('/waitlist/bestie', token, { method: 'POST' });
export const getBestieWaitlistCount = (token: string | undefined) =>
  request<{ count: number }>('/waitlist/bestie', token);

/** Local YYYY-MM-DD for a Date (avoids UTC shifting the day). */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Newest-first guides, pinned on top. */
export function sortGuides(guides: WellnessGuide[]): WellnessGuide[] {
  return [...guides].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
}

/** Chronological events (date, then start time). */
export function sortEvents(events: WellnessEvent[]): WellnessEvent[] {
  return [...events].sort((a, b) =>
    `${a.date} ${a.startTime || ''}`.localeCompare(`${b.date} ${b.startTime || ''}`),
  );
}

// ── Plan my day sign-ups (emailed from account@oriri.me) ───────────────────
export interface PlanSignup {
  email: string;
  feeling: string;
  energy: number | null;
  sharpest: string;
  plan?: { time: string; title: string; detail: string }[];
  consent?: boolean;
  createdAt?: string;
}

export const submitPlanSignup = (data: PlanSignup & { consent: boolean }) =>
  request<{ saved?: boolean; duplicate?: boolean }>('/plan/signup', undefined, { method: 'POST', body: JSON.stringify(data) });

export const getPlanSignups = (token?: string) => request<PlanSignup[]>('/plan/signups', token);

// Wellness Bestie founding pilot applications (admin)
export type PilotApplication = Record<string, string>;
export const getPilotApplications = (token?: string) => request<PilotApplication[]>('/pilot/applications', token);
