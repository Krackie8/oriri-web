/**
 * useJourney — owns the logged-in user's unified "Oriri Journey" state.
 *
 * Server-authoritative: it only reads (`getJourney`) and exposes a `refresh`.
 * The listen streak is advanced by the audio player via journeyApi.recordListen,
 * so this hook stays a pure read surface for Profile/Home. Additive — never
 * touches the Nourish streak.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import * as journeyApi from '../utils/journeyApi';
import type { JourneyState } from '../utils/journeyApi';

export function useJourney() {
  const { session, isLoggedIn } = useAuth();
  const accessToken = session?.access_token;

  const [state, setState] = useState<JourneyState | null>(null);
  const [nourishStreak, setNourishStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setState(null);
      setNourishStreak(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await journeyApi.getJourney(accessToken);
    if (!mountedRef.current) return;
    if (res.ok && res.data) {
      setState(res.data.state);
      setNourishStreak(res.data.nourishStreak);
    }
    setLoading(false);
  }, [isLoggedIn, accessToken]);

  useEffect(() => { void refresh(); }, [refresh]);

  return {
    state,
    nourishStreak,
    listenStreak: state?.listenStreak ?? 0,
    totalListens: state?.totalListens ?? 0,
    badges: state?.badges ?? [],
    loading,
    isLoggedIn,
    refresh,
  };
}

export default useJourney;
