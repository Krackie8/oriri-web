/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  WELLNESS BESTIE · LOCAL SETTINGS
 *  Change city by editing this one file: currency, areas and budget chips.
 *  (Copy across the site never names the city, so it can scale.)
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { DUBAI_AREAS } from '../content';

export const LOCALE = {
  currency: 'AED',
  /** Areas shown in the "Area" dropdown. */
  areas: DUBAI_AREAS,
  /** Quick budget chips on the input screen (in `currency`). 0 = Free. */
  budgetChips: [0, 100, 250, 500],
  /** Added to map and web searches behind the scenes (never shown in copy). */
  searchRegion: 'Dubai',
};

const q = (parts: (string | undefined)[]) => encodeURIComponent(parts.filter(Boolean).join(' '));
const areaFor = (area?: string) => (area && area !== 'Somewhere else' ? area : undefined);

/** Follow-through links used by plan items and homepage picks. */
export const links = {
  /** Google Maps search: shows nearby places with reviews, directions and booking buttons. */
  maps: (what: string, area?: string) => `https://www.google.com/maps/search/?api=1&query=${q([what, areaFor(area), LOCALE.searchRegion])}`,
  web: (what: string, area?: string) => `https://www.google.com/search?q=${q([what, areaFor(area), LOCALE.searchRegion])}`,
  youtube: (what: string) => `https://www.youtube.com/results?search_query=${q([what])}`,
  recipe: (what: string) => `https://www.bbcgoodfood.com/search?q=${q([what])}`,
  spotify: (what: string) => `https://open.spotify.com/search/${q([what])}/podcasts`,
  book: (what: string) => `https://www.goodreads.com/search?q=${q([what])}`,
};

export const money = (n: number) => (n <= 0 ? 'Free' : `${LOCALE.currency} ${Math.round(n)}`);
