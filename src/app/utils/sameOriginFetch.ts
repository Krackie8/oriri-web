/**
 * On oriri.me (staging and live), send calls to our Supabase function through
 * /api/fn/ on the same site (public/api/fn.php relays them). iPhone Safari
 * sometimes drops cross-site calls after the CORS check, so keeping them on
 * the same site makes data load on every phone.
 * If the relay is missing or can't reach Supabase, it falls back to the direct call.
 */
import { projectId } from './supabase/info';

const FN_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/`;
const RELAY = '/api/fn/';

let unpatched: typeof fetch | undefined;

/**
 * The browser's own fetch, from before this patch. The Wellness site's Function
 * client uses it, so it does its own Relay routing and never depends on the patch.
 */
export const nativeFetch: typeof fetch = (input, init) => (unpatched ?? window.fetch.bind(window))(input, init);

export function installSameOriginFetch() {
  if (typeof window === 'undefined' || !/(^|\.)oriri\.me$/i.test(window.location.hostname)) return;
  const direct = window.fetch.bind(window);
  unpatched = direct;
  let relayBroken = false;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (relayBroken || !url.startsWith(FN_BASE)) return direct(input as RequestInfo, init);

    const relayed = RELAY + url.slice(FN_BASE.length);
    const relayInput = input instanceof Request ? new Request(relayed, input) : relayed;
    try {
      const res = await direct(relayInput, init);
      const type = res.headers.get('content-type') || '';
      // 404 page = relay not deployed; 502 = relay couldn't reach Supabase.
      if ((res.status === 404 && type.includes('text/html')) || res.status === 502 || res.status === 500) {
        if (res.status !== 502) relayBroken = true;
        return direct(input as RequestInfo, init);
      }
      return res;
    } catch {
      return direct(input as RequestInfo, init);
    }
  };
}
