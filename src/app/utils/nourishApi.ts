/**
 * Nourish API — frontend wrapper around the /nourish/* backend routes.
 *
 * Every call resolves to a result object instead of throwing, so a paused
 * Edge Function or offline device degrades to local-only state rather than
 * breaking the planner.
 */

import { projectId, publicAnonKey } from './supabase/info';
import type {
  FavoriteMeal,
  GoalKey,
  GroceryCheckState,
  Meal,
  NourishState,
} from '../data/nourishPlans';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface NourishStateResult {
  state: NourishState | null;
  currentWeek: string;
  newWeekAvailable: boolean;
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
      console.error(`[NourishApi] ${init.method ?? 'GET'} ${path} failed:`, error);
      return { ok: false, error };
    }

    return { ok: true, data: transform(json) };
  } catch (error: any) {
    // Network failure / function paused — caller keeps its local state.
    console.error(`[NourishApi] ${init.method ?? 'GET'} ${path} threw:`, error?.message ?? error);
    return { ok: false, error: error?.message ?? 'Network error' };
  }
}

export function getState(accessToken?: string) {
  return request<NourishStateResult>('/nourish/state', accessToken, {}, (json) => ({
    state: json.data ?? null,
    currentWeek: json.currentWeek,
    newWeekAvailable: !!json.newWeekAvailable,
  }));
}

export function saveState(
  accessToken: string | undefined,
  payload: Partial<Pick<NourishState, 'goal' | 'quiz' | 'checklist' | 'isoWeek'>>,
) {
  return request<NourishStateResult>(
    '/nourish/state',
    accessToken,
    { method: 'PUT', body: JSON.stringify(payload) },
    (json) => ({
      state: json.data ?? null,
      currentWeek: json.currentWeek,
      newWeekAvailable: !!json.newWeekAvailable,
    }),
  );
}

export function toggleChecklistItem(accessToken: string | undefined, itemId: string, checked: boolean) {
  return request<GroceryCheckState>(
    '/nourish/checklist',
    accessToken,
    { method: 'PATCH', body: JSON.stringify({ itemId, checked }) },
    (json) => json.checklist ?? {},
  );
}

export function regenerate(accessToken: string | undefined, goal: GoalKey) {
  return request<NourishStateResult>(
    '/nourish/regenerate',
    accessToken,
    { method: 'POST', body: JSON.stringify({ goal }) },
    (json) => ({
      state: json.data ?? null,
      currentWeek: json.currentWeek,
      newWeekAvailable: !!json.newWeekAvailable,
    }),
  );
}

export function getFavorites(accessToken?: string) {
  return request<FavoriteMeal[]>('/nourish/favorites', accessToken, {}, (json) => json.favorites ?? []);
}

export function toggleFavorite(
  accessToken: string | undefined,
  args: { meal: Meal; goal: GoalKey; mealId: string; action: 'add' | 'remove' },
) {
  return request<{ action: string; mealId: string }>(
    '/nourish/favorites',
    accessToken,
    { method: 'POST', body: JSON.stringify(args) },
    (json) => ({ action: json.action, mealId: json.mealId }),
  );
}

export function getGoalEpisodes(accessToken: string | undefined, goal: GoalKey) {
  return request<any[]>(`/nourish/episodes/${goal}`, accessToken, {}, (json) => json.episodes ?? []);
}

/** Guests save their plan at the end: we email it with tomorrow's recipe. */
export function saveByEmail(payload: {
  email: string;
  consent: boolean;
  goal: GoalKey;
  goalLabel: string;
  tomorrow: { name: string; time: string; ingredients: string[]; steps: string[] };
}) {
  return request<{ saved?: boolean; duplicate?: boolean }>('/nourish/save-email', undefined, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function notifyPremium(payload: { email: string; goal: GoalKey; goalLabel: string }) {
  return request<{ saved?: boolean }>('/nourish/save-email', undefined, {
    method: 'POST',
    body: JSON.stringify({ ...payload, consent: true, premiumInterest: true }),
  });
}

export function getLeads(accessToken?: string) {
  return request<{ email: string; goalLabel: string; createdAt: string }[]>('/nourish/leads', accessToken, {}, (json) => json.data);
}
