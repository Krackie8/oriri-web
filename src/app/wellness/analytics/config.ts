/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  WELLNESS BESTIE · ANALYTICS & SITE CONFIG
 *  Everything you need to fill in lives in this one file.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/*
 * Events sent (only after cookie consent): page_view, cta_click, card_click,
 * podcast_play_click, outbound_click, scroll_depth, form_submit (+ the pilot_* events).
 * ▶ In GA4 → Admin → Events, toggle "Mark as key event" on form_submit
 *   (it appears there after the first sign-up is received).
 */
export const SITE_CONFIG = {
  /**
   * ▶ PLACEHOLDER — Google Analytics 4 Measurement ID.
   *   GA4 → Admin → Data streams → Web → "Measurement ID" (looks like G-AB12CD34EF).
   *   Note: the previous site loaded G-78GWK70520 unconditionally from index.html.
   *   That tag has been removed so nothing loads before consent. Paste whichever
   *   ID you want to keep here.
   */
  GA4_MEASUREMENT_ID: 'G-78GWK70520',

  /**
   * ▶ PLACEHOLDER — Microsoft Clarity project ID.
   *   clarity.microsoft.com → your project → Settings → Overview → "Project ID".
   */
  CLARITY_PROJECT_ID: 'CLARITY_PROJECT_ID',

  /**
   * ▶ OPTIONAL PLACEHOLDER — your WhatsApp number in international format,
   *   digits only (e.g. 971501234567). When set, a "Message me on WhatsApp"
   *   link appears in the footer. Leave empty to hide it.
   */
  WHATSAPP_NUMBER: '',

  INSTAGRAM_HANDLE: 'ren_reset',
  SITE_URL: 'https://oriri.me',
  CONTACT_EMAIL: 'account@oriri.me',
};

export const INSTAGRAM_URL = `https://instagram.com/${SITE_CONFIG.INSTAGRAM_HANDLE}`;

/** The share link people send on WhatsApp carries the agreed UTM convention. */
export const WHATSAPP_SHARE_URL = `https://wa.me/?text=${encodeURIComponent(
  `I just joined the Wellness Bestie waitlist, a little wellness hub for women. Come with me: ${SITE_CONFIG.SITE_URL}/?utm_source=whatsapp&utm_medium=referral&utm_campaign=wb_pilot`,
)}`;

export const isConfigured = (id: string) =>
  !!id && !/X{4,}/.test(id) && id !== 'CLARITY_PROJECT_ID';
