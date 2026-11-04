/**
 * Saved Episodes API — frontend wrapper around the /saved-episodes routes.
 *
 * Backs the real episode library. Every call resolves to a result object rather
 * than throwing, so failures degrade to local state instead of breaking the UI.
 */

import { projectId, publicAnonKey } from './supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;

export interface SavedEpisode {
  episodeId: string;
  episode: any;
  savedAt: string;
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

export function getSaved(accessToken?: string) {
  return request<SavedEpisode[]>('/saved-episodes', accessToken, {}, (json) => json.saved ?? []);
}

export function toggleSaved(
  accessToken: string | undefined,
  args: { episode?: any; episodeId: string; action: 'add' | 'remove' },
) {
  return request<{ action: string; episodeId: string }>(
    '/saved-episodes',
    accessToken,
    { method: 'POST', body: JSON.stringify(args) },
    (json) => ({ action: json.action, episodeId: json.episodeId }),
  );
}
