/**
 * Journey API — frontend wrapper around the /journey routes.
 *
 * Powers the unified "Oriri Journey" listen streak + badges. Additive and
 * server-authoritative; never touches the Nourish streak. Calls resolve to a
 * result object rather than throwing.
 */

import { projectId, publicAnonKey } from './supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;

export interface JourneyBadge {
  id: string;
  earnedAt: string;
}

export interface JourneyState {
  version: number;
  listenStreak: number;
  lastListenDate: string;
  totalListens: number;
  badges: JourneyBadge[];
  createdAt: string;
  updatedAt: string;
}

export interface JourneyResult {
  state: JourneyState | null;
  nourishStreak: number;
}

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function request<T>(
  path: string,
  accessToken: string | undefined,
  init: RequestInit = {},
  transform: (json: any) => T = (json) => json as T,
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
      return { ok: false, error };
    }

    return { ok: true, data: transform(json) };
  } catch (error: any) {
    return { ok: false, error: error?.message ?? 'Network error' };
  }
}

export function getJourney(accessToken?: string) {
  return request<JourneyResult>('/journey', accessToken, {}, (json) => ({
    state: json.data ?? null,
    nourishStreak: json.nourishStreak ?? 0,
  }));
}

export function recordListen(accessToken?: string) {
  return request<JourneyResult>('/journey/listen', accessToken, { method: 'POST', body: '{}' }, (json) => ({
    state: json.data ?? null,
    nourishStreak: json.nourishStreak ?? 0,
  }));
}
