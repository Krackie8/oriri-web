/**
 * Analytics for the podcast app pages (/podcast, /episodes, /community …).
 * Same rules as the marketing site: nothing loads until the visitor accepts
 * in the cookie banner. Renders only the small consent banner; no other UI.
 */
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CookieBanner } from '../components/Chrome';
import { getConsent, loadTrackers, onConsentChange } from './consent';
import { installOutboundTracking, trackPageView, useScrollDepth } from './track';
import { captureAttribution } from './utm';

export default function AppAnalytics() {
  const location = useLocation();
  const [consent, setConsentState] = useState(getConsent());

  useEffect(() => {
    captureAttribution();
    installOutboundTracking();
    loadTrackers(); // no-op unless already accepted
    return onConsentChange((c) => {
      setConsentState(c);
      if (c === 'granted') trackPageView(document.title);
    });
  }, []);

  useEffect(() => {
    trackPageView(document.title);
  }, [location.pathname]);

  useScrollDepth(true, location.pathname);

  if (consent !== null) return null;
  return (
    <div className="wb-root relative z-[90]">
      <CookieBanner forceOpen={false} onClose={() => undefined} />
    </div>
  );
}
