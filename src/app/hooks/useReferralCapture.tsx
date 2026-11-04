/**
 * useReferralCapture — records that a visitor arrived from a shared `?ref=` link.
 *
 * Attribution only: no rewards, no cookies beyond a session flag that stops the
 * same arrival being counted twice on re-renders or client-side navigations.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import * as socialApi from '../utils/socialApi';

const SEEN_KEY = 'oriri_referral_recorded';

export function useReferralCapture() {
  const location = useLocation();

  useEffect(() => {
    const ref = new URLSearchParams(location.search).get('ref');
    if (!ref) return;

    try {
      if (sessionStorage.getItem(SEEN_KEY) === ref) return;
      sessionStorage.setItem(SEEN_KEY, ref);
    } catch {
      // Private mode / storage disabled — recording twice is better than not at all.
    }

    void socialApi.trackClick('referral', ref);
  }, [location.search]);
}

export default useReferralCapture;
