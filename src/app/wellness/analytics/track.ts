/**
 * Event helpers. Every event automatically carries `wb_source`
 * (beacons / manychat / whatsapp / direct / instagram_other / other)
 * so any event can be split by traffic source in GA4.
 */
import { useEffect, useRef } from 'react';
import { getConsent, isDebug, trackersReady } from './consent';
import { sourceLabel } from './utm';
import { countLead } from './firstParty';

type Params = Record<string, string | number | boolean | undefined>;

export function track(name: string, params: Params = {}) {
  const payload = { ...params, wb_source: sourceLabel() };
  if (isDebug()) console.info(`[wb-analytics] ${name}`, payload, getConsent() === 'granted' ? '' : '(not sent: no consent)');
  if (getConsent() !== 'granted' || !trackersReady()) return;
  window.gtag?.('event', name, payload);
  window.clarity?.('event', name);
}

export function trackPageView(title: string) {
  if (getConsent() !== 'granted' || !trackersReady()) return;
  window.gtag?.('event', 'page_view', {
    page_location: window.location.href, // keeps utm_* in the URL for attribution
    page_path: window.location.pathname,
    page_title: title,
    wb_source: sourceLabel(),
  });
}

// ── Named events (exact names agreed in the brief) ────────────────────────
/** Where a CTA sits, e.g. 'hero', 'band', 'options', 'input', 'day_used', 'membership', 'header', 'footer'. */
export type CtaLocation = string;

export const ctaClick = (cta_label: string, cta_location: CtaLocation) =>
  track('cta_click', { cta_label, cta_location });

export const pillarCardClick = (pillar: 'move' | 'meal' | 'meet_up' | 'mindset') =>
  track('pillar_card_click', { pillar });

/** A recommendation card under the Move / Meal / Meet up / Mindset boxes. */
export const cardClick = (box: 'move' | 'meal' | 'mindset' | 'meetups', card_title: string) =>
  track('card_click', { box, card_title });

export const podcastPlayClick = (episode_title: string) => track('podcast_play_click', { episode_title });

/**
 * Any sign-up form. Mark `form_submit` as a Key Event in
 * GA4 → Admin → Events (or Key events → New key event → "form_submit").
 */
export const formSubmit = (form_name: string, params: Params = {}) => {
  countLead(form_name); // cookieless first-party lead count for the admin Traffic tab
  track('form_submit', { form_name, ...params });
};

let outboundInstalled = false;
/** One site-wide listener: every click on a link to another domain sends outbound_click. */
export function installOutboundTracking() {
  if (outboundInstalled || typeof document === 'undefined') return;
  outboundInstalled = true;
  document.addEventListener(
    'click',
    (e) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (!/^https?:$/.test(url.protocol) || url.hostname === window.location.hostname) return;
      track('outbound_click', { destination: url.hostname.replace(/^www\./, ''), link_url: url.href.slice(0, 300) });
    },
    { capture: true },
  );
}

export const pilotFormStart = () => track('pilot_form_start');
export const pilotFormStep = (step_number: number) => track('pilot_form_step', { step_number });
export const pilotFormSubmit = (params: Params) => track('pilot_form_submit', params);

export const whatsappClick = (link_type: 'share' | 'contact', link_location: string) =>
  track('whatsapp_click', { link_type, link_location, outbound: true });

export const instagramClick = (link_location: string) =>
  track('instagram_click', { link_location, outbound: true });

/**
 * Fires scroll_depth once each at 25 / 50 / 75 / 100 % of the page.
 * Works for window scrolling and for an inner scroll container (podcast app).
 * Pass a resetKey (e.g. the pathname) to start again on each page.
 */
export function useScrollDepth(enabled = true, resetKey?: string) {
  const fired = useRef(new Set<number>());
  useEffect(() => {
    if (!enabled) return;
    fired.current = new Set();
    let ticking = false;
    let target: Element | null = null;
    const check = () => {
      ticking = false;
      const el = target || document.scrollingElement || document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0) return;
      const pct = (el.scrollTop / max) * 100;
      [25, 50, 75, 100].forEach((t) => {
        if (pct >= t - (t === 100 ? 1 : 0) && !fired.current.has(t)) {
          fired.current.add(t);
          track('scroll_depth', { percent_scrolled: t, page_path: window.location.pathname });
        }
      });
    };
    const onScroll = (e: Event) => {
      const t = e.target;
      const el = t instanceof Element ? t : null;
      // Only the page itself or a large scroll container counts (ignore carousels).
      if (el && (el.scrollHeight - el.clientHeight < 300 || el.clientHeight < window.innerHeight * 0.5)) return;
      target = el;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(check);
      }
    };
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => document.removeEventListener('scroll', onScroll, { capture: true });
  }, [enabled, resetKey]);
}
