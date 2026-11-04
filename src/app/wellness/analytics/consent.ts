/**
 * Cookie consent + tracker loading.
 * GA4 and Clarity are NOT loaded until the visitor taps "Accept".
 */
import { SITE_CONFIG, isConfigured } from './config';
import { getUtm, sourceLabel } from './utm';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: ((...args: unknown[]) => void) & { q?: unknown[] };
  }
}

export type Consent = 'granted' | 'denied' | null;
const KEY = 'wb_cookie_consent';
const listeners = new Set<(c: Consent) => void>();
let loaded = false;

export function getConsent(): Consent {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value: 'granted' | 'denied') {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* private mode */
  }
  if (value === 'granted') loadTrackers();
  else if (loaded) {
    // Already loaded this visit: stop GA storage and tell Clarity, then the
    // next page load won't inject either script.
    window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
    window.clarity?.('consent', false);
  }
  listeners.forEach((l) => l(value));
}

export function onConsentChange(fn: (c: Consent) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Add ?debug_mode=1 to any URL once to stream events to GA4 DebugView. */
export function isDebug(): boolean {
  try {
    const p = new URLSearchParams(window.location.search).get('debug_mode');
    if (p === '1') localStorage.setItem('wb_debug', '1');
    if (p === '0') localStorage.removeItem('wb_debug');
    return localStorage.getItem('wb_debug') === '1';
  } catch {
    return false;
  }
}

export function trackersReady() {
  return loaded;
}

export function loadTrackers() {
  if (loaded || getConsent() !== 'granted') return;
  loaded = true;
  const debug = isDebug();

  // ── Google Analytics 4 ──────────────────────────────────────────────────
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  window.gtag('js', new Date());

  const utm = getUtm();
  if (isConfigured(SITE_CONFIG.GA4_MEASUREMENT_ID)) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${SITE_CONFIG.GA4_MEASUREMENT_ID}`;
    document.head.appendChild(s);
    window.gtag('config', SITE_CONFIG.GA4_MEASUREMENT_ID, {
      send_page_view: false, // page_view is sent by the router on every route change
      ...(debug ? { debug_mode: true } : {}),
      // Make sure the session keeps its campaign even if the visitor
      // navigated before accepting cookies.
      ...(utm.utm_source ? { campaign_source: utm.utm_source } : {}),
      ...(utm.utm_medium ? { campaign_medium: utm.utm_medium } : {}),
      ...(utm.utm_campaign ? { campaign_name: utm.utm_campaign } : {}),
    });
    window.gtag('set', 'user_properties', { wb_source: sourceLabel() });
  } else if (debug) {
    console.warn('[wb-analytics] GA4 Measurement ID is still the placeholder G-XXXXXXXXXX.');
  }

  // ── Microsoft Clarity ───────────────────────────────────────────────────
  if (isConfigured(SITE_CONFIG.CLARITY_PROJECT_ID)) {
    const c = function clarity(...args: unknown[]) {
      (c.q = c.q || []).push(args);
    } as NonNullable<Window['clarity']>;
    window.clarity = window.clarity || c;
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.clarity.ms/tag/${SITE_CONFIG.CLARITY_PROJECT_ID}`;
    document.head.appendChild(s);
    window.clarity('consent');
    window.clarity('set', 'wb_source', sourceLabel());
  } else if (debug) {
    console.warn('[wb-analytics] Clarity project ID is still a placeholder.');
  }
}
