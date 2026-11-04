/**
 * useSavedEpisodes — owns the logged-in user's saved episode library.
 *
 * Toggles are optimistic and roll back if the server rejects them, so the
 * bookmark button stays responsive even when the Edge Function is unreachable.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './useAuth';
import * as savedApi from '../utils/savedEpisodesApi';
import type { SavedEpisode } from '../utils/savedEpisodesApi';

export function useSavedEpisodes() {
  const { session, isLoggedIn } = useAuth();
  const accessToken = session?.access_token;

  const [saved, setSaved] = useState<SavedEpisode[]>([]);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setSaved([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    savedApi.getSaved(accessToken).then((res) => {
      if (cancelled || !mountedRef.current) return;
      if (res.ok && res.data) setSaved(res.data);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [isLoggedIn, accessToken]);

  const savedIds = useMemo(() => new Set(saved.map((s) => s.episodeId)), [saved]);

  /** Save / unsave an episode. Optimistic with rollback on failure. */
  const toggleSaved = useCallback(async (episode: any) => {
    const id = String(episode?.id ?? '');
    if (!id) return;
    const isSaved = savedIds.has(id);

    setSaved((prev) =>
      isSaved
        ? prev.filter((s) => s.episodeId !== id)
        : [{ episodeId: id, episode, savedAt: new Date().toISOString() }, ...prev],
    );

    const res = await savedApi.toggleSaved(accessToken, {
      episode, episodeId: id, action: isSaved ? 'remove' : 'add',
    });

    if (!res.ok && mountedRef.current) {
      // Roll back.
      setSaved((prev) =>
        isSaved
          ? [{ episodeId: id, episode, savedAt: new Date().toISOString() }, ...prev]
          : prev.filter((s) => s.episodeId !== id),
      );
    }
  }, [accessToken, savedIds]);

  return { saved, savedIds, loading, isLoggedIn, toggleSaved };
}

export default useSavedEpisodes;
