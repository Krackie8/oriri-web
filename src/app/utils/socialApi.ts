/**
 * Social API — frontend wrapper around the /social/* backend routes.
 *
 * Same contract as nourishApi: every call resolves to a result object instead of
 * throwing, so an unreachable Edge Function degrades to DEFAULT_SOCIAL_CONFIG
 * rather than blanking the follow surfaces.
 */

import { projectId, publicAnonKey } from './supabase/info';
import type { SocialConfig } from '../data/socialConfig';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface SocialStats {
  totals: Record<string, { clicks: number; lastClickAt: string | null; lastSource?: string | null }>;
  daily: Array<{ date: string; clicks: Record<string, number> }>;
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
      console.error(`[SocialApi] ${init.method ?? 'GET'} ${path} failed:`, error);
      return { ok: false, error };
    }

    return { ok: true, data: transform(json) };
  } catch (error: any) {
    console.error(`[SocialApi] ${init.method ?? 'GET'} ${path} threw:`, error?.message ?? error);
    return { ok: false, error: error?.message ?? 'Network error' };
  }
}

export interface SocialConfigResult {
  config: SocialConfig | null;
  showUrls: Record<string, string>;
}

export function getConfig(accessToken?: string) {
  return request<SocialConfigResult>('/social/config', accessToken, {}, (json) => ({
    config: json.data ?? null,
    showUrls: json.showUrls ?? {},
  }));
}

export function saveConfig(accessToken: string | undefined, config: SocialConfig) {
  return request<SocialConfig>(
    '/social/config',
    accessToken,
    { method: 'PUT', body: JSON.stringify(config) },
    (json) => json.data,
  );
}

/** Fire-and-forget click attribution. Failures are silent by design. */
export function trackClick(linkId: string, source: string) {
  return request<void>('/social/click', undefined, {
    method: 'POST',
    body: JSON.stringify({ linkId, source }),
  });
}

export function getStats(accessToken?: string) {
  return request<SocialStats>('/social/stats', accessToken, {}, (json) => json.data);
}
