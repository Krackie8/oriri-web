/**
 * First-party traffic counts for the admin Traffic tab.
 *
 * Cookieless and anonymous: no IDs, no IP, nothing stored on the device except
 * a per-tab "session counted" flag (and the visit's source) in sessionStorage.
 * Each call sends one small event: a page view, a new session with its source,
 * a directory click, or a sign-up ("lead") credited to the visit's source.
 *
 * Every event says which site it came from (prod www.oriri.me or staging
 * new.oriri.me) so testing on staging never inflates the live numbers.
 */
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const URL_ = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/wellness/track`;
const SESSION_FLAG = 'wb_fp_session';
const SOURCE_KEY = 'wb_fp_source';
/** Set on this device when an admin opens the dashboard, so Ren's own visits are not counted. */
export const SKIP_KEY = 'wb_fp_skip';

export function siteOf(host = typeof location !== 'undefined' ? location.hostname : ''): 'prod' | 'staging' | 'other' {
  const h = host.replace(/^www\./, '');
  if (h === 'oriri.me') return 'prod';
  if (h === 'new.oriri.me') return 'staging';
  return 'other';
}

function deviceOf(): 'mobile' | 'desktop' {
  try {
    if (/Mobi|Android|iPhone|iPod/i.test(navigator.userAgent)) return 'mobile';
    if (/iPad/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent))) return 'mobile';
  } catch {
    /* ignore */
  }
  return 'desktop';
}

function skipped(): boolean {
  try {
    return localStorage.getItem(SKIP_KEY) === '1';
  } catch {
    return false;
  }
}

function send(body: Record<string, string>) {
  // Skip local dev, automated browsers and the admin's own device so counts stay real.
  if (typeof window === 'undefined' || /^(localhost|127\.)/.test(location.hostname) || navigator.webdriver || skipped()) return;
  try {
    fetch(URL_, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
      body: JSON.stringify({ ...body, h: siteOf() }),
    }).catch(() => {});
  } catch {
    /* never break the page for analytics */
  }
}

/** Short names people type in utm_source, folded into one label. */
const SOURCE_ALIASES: Record<string, string> = {
  ig: 'instagram',
  insta: 'instagram',
  fb: 'facebook',
  wa: 'whatsapp',
  tt: 'tiktok',
  yt: 'youtube',
  twitter: 'x',
};

export function normaliseSource(s: string): string {
  const v = s.trim().toLowerCase();
  return SOURCE_ALIASES[v] || v;
}

/** Where this visit came from: utm_source first, then the referrer's site. */
function sourceOf(): string {
  const utm = new URLSearchParams(location.search).get('utm_source');
  if (utm) return normaliseSource(utm).slice(0, 40);
  let host = '';
  try {
    host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : '';
  } catch {
    host = '';
  }
  if (!host || host === location.hostname) return 'direct';
  if (/instagram|^l\.instagram/.test(host)) return 'instagram';
  if (/(^|\.)google\./.test(host)) return 'google';
  if (/facebook|fb\.com/.test(host)) return 'facebook';
  if (/tiktok/.test(host)) return 'tiktok';
  if (/whatsapp|wa\.me/.test(host)) return 'whatsapp';
  if (/linktr|beacons|lnk\.bio/.test(host)) return 'link-in-bio';
  if (/t\.co$|twitter|x\.com/.test(host)) return 'x';
  if (/youtube/.test(host)) return 'youtube';
  if (/bing|duckduckgo|yahoo|ecosia/.test(host)) return 'search';
  return host.slice(0, 40);
}

/** Call on every route change. Counts a new session (with its source and device) once per tab. */
export function countPageView(path: string) {
  try {
    if (!sessionStorage.getItem(SESSION_FLAG)) {
      const s = sourceOf();
      sessionStorage.setItem(SESSION_FLAG, '1');
      sessionStorage.setItem(SOURCE_KEY, s);
      send({ t: 'session', s, p: path, d: deviceOf() });
    }
  } catch {
    /* storage blocked: still count the view */
  }
  send({ t: 'view', p: path });
}

/** A tap on a directory place (Instagram, website or map). */
export function countPlaceClick(place: string) {
  send({ t: 'click', k: place });
}

/** A completed sign-up form (free day, waitlist, account…), credited to where this visit came from. */
export function countLead(form: string) {
  let s = 'direct';
  try {
    s = sessionStorage.getItem(SOURCE_KEY) || sourceOf();
  } catch {
    /* ignore */
  }
  send({ t: 'lead', k: form, s, p: typeof location !== 'undefined' ? location.pathname : '' });
}

/** Stop counting this device (called when an admin opens the dashboard). */
export function skipThisDevice() {
  try {
    localStorage.setItem(SKIP_KEY, '1');
  } catch {
    /* ignore */
  }
}
