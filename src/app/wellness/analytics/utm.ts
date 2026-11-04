/**
 * Traffic-source capture.
 *
 * - On every arrival, UTM params in the URL are stored (localStorage, 30 days)
 *   so they survive page changes, reloads and a return visit before applying.
 * - The landing page + referrer are stored per browser session.
 * - Internal links run through withUtm() so the params also stay visible in
 *   the address bar until the form is submitted.
 *
 * Storing these is first-party and only leaves the device inside a pilot
 * application, which the applicant consents to.
 */

export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
type UtmKey = (typeof UTM_KEYS)[number];
export type Utm = Partial<Record<UtmKey, string>>;

export interface Attribution extends Utm {
  landing_page: string;
  referrer: string;
  first_touch_source: string;
  first_touch_medium: string;
  first_touch_campaign: string;
}

const LAST_TOUCH = 'wb_utm_last';
const FIRST_TOUCH = 'wb_utm_first';
const SESSION = 'wb_session_landing';
const TTL = 30 * 24 * 60 * 60 * 1000;

const safe = <T,>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

const readUtmFromUrl = (search: string): Utm => {
  const params = new URLSearchParams(search);
  const out: Utm = {};
  UTM_KEYS.forEach((k) => {
    const v = params.get(k);
    if (v) out[k] = v.trim().toLowerCase().slice(0, 100);
  });
  return out;
};

const readStored = (store: Storage, key: string): (Utm & { at?: number }) | null =>
  safe(() => {
    const raw = store.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, null);

/** Call once on site load (before anything else reads attribution). */
export function captureAttribution() {
  const fromUrl = readUtmFromUrl(window.location.search);
  const hasUtm = Object.keys(fromUrl).length > 0;

  safe(() => {
    if (hasUtm) {
      localStorage.setItem(LAST_TOUCH, JSON.stringify({ ...fromUrl, at: Date.now() }));
      if (!localStorage.getItem(FIRST_TOUCH)) {
        localStorage.setItem(FIRST_TOUCH, JSON.stringify({ ...fromUrl, at: Date.now() }));
      }
    }
    if (!sessionStorage.getItem(SESSION)) {
      sessionStorage.setItem(
        SESSION,
        JSON.stringify({
          landing_page: window.location.pathname + window.location.search,
          referrer: document.referrer || '',
        }),
      );
    }
  }, undefined);
}

/** Current UTMs: from the URL if present, otherwise the stored last touch (≤30 days). */
export function getUtm(): Utm {
  const fromUrl = readUtmFromUrl(window.location.search);
  if (Object.keys(fromUrl).length) return fromUrl;
  const stored = readStored(localStorage, LAST_TOUCH);
  if (!stored || (stored.at && Date.now() - stored.at > TTL)) return {};
  const { at: _at, ...utm } = stored;
  return utm;
}

export function getAttribution(): Attribution {
  const utm = getUtm();
  const session = safe(() => JSON.parse(sessionStorage.getItem(SESSION) || 'null'), null) as
    | { landing_page: string; referrer: string }
    | null;
  const first = readStored(localStorage, FIRST_TOUCH) || {};
  return {
    ...utm,
    landing_page: session?.landing_page || window.location.pathname,
    referrer: session?.referrer || '',
    first_touch_source: first.utm_source || '',
    first_touch_medium: first.utm_medium || '',
    first_touch_campaign: first.utm_campaign || '',
  };
}

/**
 * One clean label per visit for funnel breakdowns:
 * beacons · manychat · whatsapp · direct · instagram_other · other
 */
export function sourceLabel(a: Utm & { referrer?: string } = getAttribution()): string {
  const src = a.utm_source || '';
  const med = a.utm_medium || '';
  if (med === 'beacons') return 'beacons';
  if (med === 'manychat') return 'manychat';
  if (src === 'whatsapp') return 'whatsapp';
  if (!src && !a.referrer) return 'direct';
  if (src === 'instagram' || /instagram\.com|l\.instagram/.test(a.referrer || '')) return 'instagram_other';
  return 'other';
}

/** Append the current UTMs to an internal path so they stay in the URL. */
export function withUtm(path: string): string {
  const utm = getUtm();
  const entries = Object.entries(utm).filter(([, v]) => !!v) as [string, string][];
  if (!entries.length) return path;
  const [base, hash = ''] = path.split('#');
  const url = new URL(base, window.location.origin);
  entries.forEach(([k, v]) => url.searchParams.set(k, v));
  return url.pathname + url.search + (hash ? `#${hash}` : '');
}
