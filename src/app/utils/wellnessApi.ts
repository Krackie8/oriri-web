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
  /** Directory fields */
  /** 'Dubai' (default when empty) or 'Kuala Lumpur' */
  city?: string;
  area?: string;
  price?: string;
  instagram?: string;
  maps?: string;
  hidden?: boolean;
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
export const GUIDE_CATEGORIES = ['Move', 'Meal', 'Mindset', 'Meetup'];
export const GUIDE_CITIES = ['Dubai', 'Kuala Lumpur'];
export const GUIDE_AREAS: Record<string, { blurb: string; placeholder: string }> = {
  Move: { blurb: 'Studios & classes', placeholder: 'e.g. Paus' },
  Meal: { blurb: 'Cafés & restaurants', placeholder: 'e.g. Café Y' },
  Mindset: { blurb: 'Podcast or book', placeholder: 'e.g. Atomic Habits (book)' },
  Meetup: { blurb: 'Activities & organisers', placeholder: 'e.g. Sunrise run club by X' },
};
export const PRICE_LEVELS = ['Free', 'AED', 'AED AED', 'AED AED AED'];

async function request<T>(
  path: string,
  accessToken: string | undefined,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      // Only send Content-Type when there is a body. On a GET it adds a second
      // header to the CORS preflight, and iPhone Safari dropped those GETs.
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
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
export const getGuides = () => request<WellnessGuide[]>('/wellness/guides', undefined, { cache: 'no-store' });
/** Copy of the directory saved on oriri.me itself at deploy time. Used when the live list can't be reached. */
export async function getGuidesSnapshot(): Promise<WellnessGuide[] | null> {
  try {
    const res = await fetch('/data/guides.json', { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return Array.isArray(json?.data) ? (json.data as WellnessGuide[]) : null;
  } catch {
    return null;
  }
}
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

/** Free trial leads from /plan/day (email asked before the plan shows). */
export type FreeDayLead = Record<string, string>;
export const getFreeDayLeads = (token?: string) => request<FreeDayLead[]>('/bestie/free-days', token);

// Wellness Bestie founding pilot applications (admin)
export type PilotApplication = Record<string, string>;
export const getPilotApplications = (token?: string) => request<PilotApplication[]>('/pilot/applications', token);

// ── Site traffic (admin) ────────────────────────────────────────────────────
export interface DayStats {
  date: string;
  views: number;
  sessions: number;
  clicks: number;
  /** Completed sign-up forms (newer server only). */
  leads?: number;
  pages: Record<string, number>;
  sources: Record<string, number>;
  places: Record<string, number>;
  devices?: Record<string, number>;
  /** Leads by form name, e.g. free_day, pilot_application. */
  forms?: Record<string, number>;
  /** Leads by where the visit came from. */
  leadSources?: Record<string, number>;
}
export type StatsSite = 'prod' | 'staging' | 'all';
export const getStats = (token: string | undefined, days = 30, site: StatsSite = 'prod') =>
  request<DayStats[]>(`/wellness/stats?days=${days}&site=${site}`, token);
