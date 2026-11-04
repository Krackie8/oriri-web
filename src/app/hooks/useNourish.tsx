/**
 * useNourish — owns all Nourish planner state for the logged-in user.
 *
 * Updates are applied optimistically to local state and then synced to the
 * backend. If a sync fails the local value is kept, so the planner stays usable
 * (just non-persistent) when the Edge Function is unreachable.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './useAuth';
import * as nourishApi from '../utils/nourishApi';
import {
  PLANS,
  adaptPlan,
  countGroceryItems,
  isoWeekOf,
  mealId as toMealId,
  type AdaptedPlan,
  type FavoriteMeal,
  type GoalKey,
  type Meal,
  type NourishQuiz,
  type NourishState,
} from '../data/nourishPlans';

function buildLocalState(goal: GoalKey, previous?: NourishState | null): NourishState {
  const now = new Date().toISOString();
  return {
    version: 1,
    goal,
    isoWeek: isoWeekOf(),
    quiz: previous?.quiz ?? null,
    checklist: {},
    streakCount: previous?.streakCount ?? 1,
    lastEngagedWeek: isoWeekOf(),
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
}

// Guests try Nourish without an account; their plan lives on this device only.
const GUEST_KEY = 'oriri:nourish:guest';
const readGuest = (): { state: NourishState | null; favorites: FavoriteMeal[] } => {
  try {
    const raw = JSON.parse(localStorage.getItem(GUEST_KEY) || 'null');
    return { state: raw?.state ?? null, favorites: raw?.favorites ?? [] };
  } catch {
    return { state: null, favorites: [] };
  }
};

export function useNourish() {
  const { session, isLoggedIn } = useAuth();
  const accessToken = session?.access_token;

  const [state, setState] = useState<NourishState | null>(null);
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([]);
  const [newWeekAvailable, setNewWeekAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Guards against a resolved request overwriting newer local state.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) {
      const guest = readGuest();
      setState(guest.state);
      setFavorites(guest.favorites);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const [stateRes, favRes] = await Promise.all([
        nourishApi.getState(accessToken),
        nourishApi.getFavorites(accessToken),
      ]);

      if (cancelled || !mountedRef.current) return;

      const guest = readGuest();
      if (stateRes.ok && stateRes.data && !stateRes.data.state?.goal && guest.state?.goal) {
        // First sign-in after trying Nourish as a guest: carry the plan over.
        const res = await nourishApi.saveState(accessToken, { goal: guest.state.goal, isoWeek: isoWeekOf(), quiz: guest.state.quiz });
        if (cancelled || !mountedRef.current) return;
        setState(res.ok && res.data?.state ? res.data.state : guest.state);
        localStorage.removeItem(GUEST_KEY);
      } else if (stateRes.ok && stateRes.data) {
        setState(stateRes.data.state);
        setNewWeekAvailable(stateRes.data.newWeekAvailable);
        console.log('[useNourish] Loaded state:', stateRes.data.state?.goal ?? 'none');
      } else {
        console.warn('[useNourish] Could not load state — starting fresh (local only)');
      }

      if (favRes.ok && favRes.data) setFavorites(favRes.data);

      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [isLoggedIn, accessToken]);

  useEffect(() => {
    if (isLoggedIn || loading) return;
    try { localStorage.setItem(GUEST_KEY, JSON.stringify({ state, favorites })); } catch { /* storage full or blocked */ }
  }, [isLoggedIn, loading, state, favorites]);

  // ── Derived values ────────────────────────────────────────────────────────
  const plan: AdaptedPlan | null = useMemo(
    () => (state?.goal ? adaptPlan(PLANS[state.goal], state.quiz) : null),
    [state?.goal, state?.quiz],
  );

  const groceryProgress = useMemo(() => {
    if (!plan) return { checked: 0, total: 0, percent: 0 };
    const total = countGroceryItems(plan.grocery);
    const checked = Object.values(state?.checklist ?? {}).filter(Boolean).length;
    return { checked, total, percent: total ? Math.round((checked / total) * 100) : 0 };
  }, [plan, state?.checklist]);

  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.mealId)), [favorites]);

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Pick a goal and persist it as the active plan. */
  const setGoalAndGenerate = useCallback(async (goal: GoalKey) => {
    setSyncing(true);
    setState((prev) => buildLocalState(goal, prev));
    setNewWeekAvailable(false);

    const res = isLoggedIn ? await nourishApi.saveState(accessToken, { goal, isoWeek: isoWeekOf() }) : ({ ok: false } as nourishApi.ApiResult<any>);
    if (res.ok && res.data?.state && mountedRef.current) setState(res.data.state);
    if (mountedRef.current) setSyncing(false);
  }, [accessToken, isLoggedIn]);

  /** Save intake-quiz answers. */
  const saveQuiz = useCallback(async (quiz: NourishQuiz) => {
    setSyncing(true);
    setState((prev) => (prev ? { ...prev, quiz } : prev));

    const res = isLoggedIn ? await nourishApi.saveState(accessToken, { quiz }) : ({ ok: false } as nourishApi.ApiResult<any>);
    if (res.ok && res.data?.state && mountedRef.current) setState(res.data.state);
    if (mountedRef.current) setSyncing(false);
  }, [accessToken, isLoggedIn]);

  /** Tick / untick a grocery item. */
  const toggleGroceryItem = useCallback(async (itemId: string) => {
    let nextChecked = false;

    setState((prev) => {
      if (!prev) return prev;
      const checklist = { ...prev.checklist };
      if (checklist[itemId]) delete checklist[itemId];
      else checklist[itemId] = true;
      nextChecked = !!checklist[itemId];
      return { ...prev, checklist };
    });

    // Fire-and-forget: the optimistic flip above already updated the UI.
    if (isLoggedIn) await nourishApi.toggleChecklistItem(accessToken, itemId, nextChecked);
  }, [accessToken, isLoggedIn]);

  /** Start a fresh week: clears ticks, bumps the streak. */
  const regenerateWeek = useCallback(async (goal?: GoalKey) => {
    const target = goal ?? state?.goal;
    if (!target) return;

    setSyncing(true);
    setState((prev) => (prev ? { ...prev, isoWeek: isoWeekOf(), checklist: {} } : prev));
    setNewWeekAvailable(false);

    const res = isLoggedIn ? await nourishApi.regenerate(accessToken, target) : ({ ok: false } as nourishApi.ApiResult<any>);
    if (res.ok && res.data?.state && mountedRef.current) setState(res.data.state);
    if (mountedRef.current) setSyncing(false);
  }, [accessToken, isLoggedIn, state?.goal]);

  /** Save / unsave an individual meal. */
  const toggleFavorite = useCallback(async (meal: Meal, goal: GoalKey) => {
    const id = toMealId(meal.name);
    const isFav = favoriteIds.has(id);

    setFavorites((prev) =>
      isFav
        ? prev.filter((f) => f.mealId !== id)
        : [...prev, { mealId: id, goal, meal, savedAt: new Date().toISOString() }],
    );

    if (!isLoggedIn) return;
    const res = await nourishApi.toggleFavorite(accessToken, {
      meal, goal, mealId: id, action: isFav ? 'remove' : 'add',
    });

    // Roll back the optimistic change if the server rejected it.
    if (!res.ok && mountedRef.current) {
      setFavorites((prev) =>
        isFav
          ? [...prev, { mealId: id, goal, meal, savedAt: new Date().toISOString() }]
          : prev.filter((f) => f.mealId !== id),
      );
    }
  }, [accessToken, isLoggedIn, favoriteIds]);

  /** Clear the active goal to return to selection (kept local until regenerated). */
  const changeGoal = useCallback(() => {
    setState((prev) => (prev ? { ...prev, goal: null as any } : prev));
  }, []);

  return {
    state,
    plan,
    loading,
    syncing,
    favorites,
    favoriteIds,
    newWeekAvailable,
    groceryProgress,
    setGoalAndGenerate,
    saveQuiz,
    toggleGroceryItem,
    regenerateWeek,
    toggleFavorite,
    changeGoal,
  };
}

export default useNourish;
