/**
 * useSocialConfig — loads the admin-managed social config, falling back to the
 * bundled defaults so follow surfaces always render something real.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import * as socialApi from '../utils/socialApi';
import {
  DEFAULT_SOCIAL_CONFIG,
  visibleLinks as selectVisibleLinks,
  visibleProfiles as selectVisibleProfiles,
  type SocialConfig,
} from '../data/socialConfig';

/** Overlay server show URLs (Spotify/Apple) onto profiles that have none. */
function applyShowUrls(config: SocialConfig, showUrls: Record<string, string>): SocialConfig {
  if (!showUrls || Object.keys(showUrls).length === 0) return config;
  return {
    ...config,
    profiles: config.profiles.map((p) =>
      !p.url && showUrls[p.platform] ? { ...p, url: showUrls[p.platform] } : p,
    ),
  };
}

/**
 * Several surfaces (footer, side menu, follow bar, /links) mount this hook at
 * once. Share one request between them rather than fetching the same blob 4×.
 */
let sharedRequest: ReturnType<typeof socialApi.getConfig> | null = null;

function fetchConfigOnce(force: boolean) {
  if (force || !sharedRequest) {
    sharedRequest = socialApi.getConfig();
  }
  return sharedRequest;
}

export function useSocialConfig() {
  const [config, setConfig] = useState<SocialConfig>(DEFAULT_SOCIAL_CONFIG);
  const [loading, setLoading] = useState(true);
  const [isDefault, setIsDefault] = useState(true);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    const res = await fetchConfigOnce(force);

    if (res.ok && res.data) {
      const { config: remote, showUrls } = res.data;
      if (remote) {
        setConfig(applyShowUrls(remote, showUrls));
        setIsDefault(false);
      } else {
        // Nothing saved yet — defaults, but still enriched with the show URLs.
        setConfig(applyShowUrls(DEFAULT_SOCIAL_CONFIG, showUrls));
        setIsDefault(true);
      }
    } else {
      console.warn('[useSocialConfig] Using bundled defaults — config unavailable');
      setConfig(DEFAULT_SOCIAL_CONFIG);
      setIsDefault(true);
    }

    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const links = useMemo(() => selectVisibleLinks(config), [config]);
  const profiles = useMemo(() => selectVisibleProfiles(config), [config]);
  const showcase = useMemo(
    () => [...config.showcase].sort((a, b) => a.order - b.order),
    [config],
  );

  return {
    config,
    setConfig,
    loading,
    isDefault,
    links,
    profiles,
    showcase,
    reload: () => load(true),
  };
}

export default useSocialConfig;
