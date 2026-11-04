/**
 * Listening API — frontend wrapper around the /listen/progress backend routes.
 *
 * Powers "Continue Listening". Every call resolves to a result object instead of
 * throwing, so a paused Edge Function or offline device never breaks playback.
 */

import { projectId, publicAnonKey } from './supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;

export interface ProgressItem {
  episodeId: string;
  position: number;
  duration: number;
  title: string | null;
  image: string | null;
  updatedAt: string;
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

export function saveProgress(
  accessToken: string | undefined,
  payload: { episodeId: string; position: number; duration: number; title?: string | null; image?: string | null },
) {
  return request('/listen/progress', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getProgress(accessToken?: string) {
  return request<ProgressItem[]>('/listen/progress', accessToken, {}, (json) => json.items ?? []);
}

export function getProgressFor(accessToken: string | undefined, episodeId: string) {
  return request<ProgressItem | null>(
    `/listen/progress/${encodeURIComponent(episodeId)}`,
    accessToken,
    {},
    (json) => json.item ?? null,
  );
}

export function removeProgress(accessToken: string | undefined, episodeId: string) {
  return request(`/listen/progress/${encodeURIComponent(episodeId)}`, accessToken, {
    method: 'DELETE',
  });
}
