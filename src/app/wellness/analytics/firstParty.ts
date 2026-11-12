/**
 * First-party traffic counts for the admin Traffic tab.
 *
 * Cookieless and anonymous: no IDs, no IP, nothing stored on the device except
 * a per-tab "session counted" flag in sessionStorage. Each call sends one small
 * event (page view, new session with its source, or a directory click).
 */
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const URL_ = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/wellness/track`;
const SESSION_FLAG = 'wb_fp_session';

function send(body: Record<string, string>) {
  // Skip local dev and automated browsers so test runs don't inflate counts.
  if (typeof window === 'undefined' || /^(localhost|127\.)/.test(location.hostname) || navigator.webdriver) return;
  try {
    fetch(URL_, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
      body: JSON.stringify(body),
    }).catch(() => {});
  } catch {
    /* never break the page for analytics */
  }
}

/** Where this visit came from: utm_source first, then the referrer's site. */
function sourceOf(): string {
  const utm = new URLSearchParams(location.search).get('utm_source');
  if (utm) return utm.toLowerCase().slice(0, 40);
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

/** Call on every route change. Counts a new session (with its source) once per tab. */
export function countPageView(path: string) {
  try {
    if (!sessionStorage.getItem(SESSION_FLAG)) {
      sessionStorage.setItem(SESSION_FLAG, '1');
      send({ t: 'session', s: sourceOf(), p: path });
    }
  } catch {
    /* storage blocked: still count the view */
  }
  send({ t: 'view', p: path });
}

/** A tap on a Shop pick's buy button. Shows in Admin › Traffic › Shop. */
export function countShopClick(city: string, id: string) {
  send({ t: 'click', k: `shop:${city}:${id}` });
}

/** A tap on a directory place (Instagram, website or map). */
export function countPlaceClick(place: string) {
  send({ t: 'click', k: place });
}
