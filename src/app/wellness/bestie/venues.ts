/**
 * Named places Bestie can suggest, by activity. Edit freely: add, remove or
 * reorder. Each place gets a Google Maps link, so a tap shows it on the map
 * with reviews, directions and booking buttons.
 *
 * - `ren: true`  = from Ren's own directory (shown first when it's nearby).
 * - `chain: true` = several branches, so the map searches near the visitor's area.
 * - `zones` = which part of the city it's in (see ZONE_OF below).
 */
export type Zone = 'west' | 'central' | 'east';

export interface Venue {
  name: string;
  /** Where it is, shown under the title (e.g. "Madinat Jumeirah"). Chains leave it out. */
  where?: string;
  zones: Zone[];
  chain?: boolean;
  ren?: boolean;
  /** Optional direct link (website or booking page). The map link is always added. */
  url?: string;
}

/** Which part of the city each area belongs to. Areas not listed (e.g. "Somewhere else") get chains or a map search. */
export const ZONE_OF: Record<string, Zone> = {
  'Al Barsha': 'west',
  'Al Furjan': 'west',
  'Al Sufouh': 'west',
  'Arabian Ranches': 'west',
  Bluewaters: 'west',
  'DAMAC Hills': 'west',
  'Discovery Gardens': 'west',
  'Dubai Marina': 'west',
  'Dubai South': 'west',
  'Dubai Sports City': 'west',
  'Emirates Hills': 'west',
  'Jumeirah Beach Residence (JBR)': 'west',
  'Jumeirah Lake Towers (JLT)': 'west',
  'Jumeirah Village Circle (JVC)': 'west',
  'Jumeirah Village Triangle (JVT)': 'west',
  'Motor City': 'west',
  'Palm Jumeirah': 'west',
  'The Greens & The Views': 'west',
  'The Springs / Meadows / Lakes': 'west',
  'Town Square': 'west',
  'Al Quoz': 'central',
  'Al Wasl / City Walk': 'central',
  'Business Bay': 'central',
  DIFC: 'central',
  'Downtown Dubai': 'central',
  'Dubai Hills Estate': 'central',
  Jumeirah: 'central',
  Meydan: 'central',
  'Umm Suqeim': 'central',
  'Bur Dubai': 'east',
  Deira: 'east',
  'Dubai Creek Harbour': 'east',
  'Dubai Silicon Oasis': 'east',
  Karama: 'east',
  Mirdif: 'east',
};

const W: Zone[] = ['west'];
const C: Zone[] = ['central'];
const E: Zone[] = ['east'];
const ALL: Zone[] = ['west', 'central', 'east'];

/** Keyed by the activity key in engine.ts. */
export const VENUES: Record<string, Venue[]> = {
  // ── Move · workouts ──
  hotclass: [
    { name: 'DRYP', where: 'Dubai Marina', zones: W, ren: true, url: 'https://www.dryp.ae/' },
    { name: 'Exhale', where: 'JBR', zones: W },
    { name: 'F45 Training', zones: ALL, chain: true },
  ],
  reformer: [
    { name: 'Vybe', where: 'Dubai Marina', zones: W, ren: true },
    { name: 'Bodytree Studio', where: 'Jumeirah', zones: C },
    { name: 'Real Pilates', zones: ALL, chain: true },
  ],
  strength: [
    { name: 'Paus', where: 'Umm Suqeim', zones: C, ren: true, url: 'https://pausclub.com/' },
    { name: 'Exhale', where: 'JBR', zones: W },
    { name: 'F45 Training', zones: ALL, chain: true },
  ],
  yoga: [
    { name: 'Seva Experience', where: 'Jumeirah', zones: C },
    { name: 'Bodytree Studio', where: 'Jumeirah', zones: C },
    { name: 'Zen Yoga', zones: ALL, chain: true },
  ],
  swim: [
    { name: 'Dubai Ladies Club', where: 'Umm Suqeim · women only', zones: C },
    { name: 'Hamdan Sports Complex', where: 'Al Hebiah, near Sports City', zones: W },
  ],
  walk: [
    { name: 'Dubai Marina Walk', where: 'Dubai Marina', zones: W },
    { name: 'Palm West Beach boardwalk', where: 'Palm Jumeirah', zones: W },
    { name: 'Kite Beach', where: 'Umm Suqeim', zones: C },
    { name: 'Safa Park', where: 'Al Wasl', zones: C },
    { name: 'Dubai Water Canal walk', where: 'Business Bay', zones: C },
    { name: 'Zabeel Park', where: 'Karama', zones: E },
    { name: 'Mushrif Park', where: 'Mirdif', zones: E },
  ],

  // ── Move · recovery & treats ──
  sauna: [
    { name: 'Paus', where: 'Umm Suqeim', zones: C, ren: true, url: 'https://pausclub.com/' },
    { name: 'Samadhi Wellness', where: 'Jumeira', zones: C, ren: true },
  ],
  massage: [
    { name: 'Samadhi Wellness', where: 'Jumeira', zones: C, ren: true },
    { name: 'SensAsia Urban Spa', zones: ALL, chain: true },
  ],
  spaday: [
    { name: 'Talise Spa', where: 'Madinat Jumeirah', zones: C },
    { name: 'Saray Spa', where: 'JW Marriott Marquis, Business Bay', zones: C },
    { name: 'Amara Spa', where: 'Park Hyatt, Dubai Creek', zones: E },
    { name: 'SensAsia Urban Spa', zones: ALL, chain: true },
  ],
  manipedi: [
    { name: 'Tips & Toes', zones: ALL, chain: true },
    { name: 'N.Bar', zones: ALL, chain: true },
  ],
  soundbath: [
    { name: 'Samadhi Wellness', where: 'Jumeira', zones: C, ren: true },
    { name: 'Seva Experience', where: 'Jumeirah', zones: C },
    { name: 'Bodytree Studio', where: 'Jumeirah', zones: C },
  ],

  // ── Meal ──
  juice: [
    { name: 'DRVN', where: 'Bluewaters', zones: W, ren: true },
    { name: 'Bounty Beets', where: 'Al Sufouh', zones: W },
    { name: 'Wild & The Moon', where: 'Alserkal Avenue, Al Quoz', zones: C },
    { name: 'Kcal', zones: ALL, chain: true },
  ],
  bowl: [
    { name: 'Bounty Beets', where: 'Al Sufouh', zones: W },
    { name: 'Wild & The Moon', where: 'Alserkal Avenue, Al Quoz', zones: C },
    { name: 'Kcal', zones: ALL, chain: true },
  ],
  brunch: [
    { name: 'DRVN', where: 'Bluewaters', zones: W, ren: true },
    { name: 'Tom & Serg', where: 'Al Quoz', zones: C },
    { name: 'Brunch & Cake', where: 'Jumeirah', zones: C },
    { name: 'Baker & Spice', where: 'Souk Al Bahar, Downtown', zones: C },
    { name: 'Jones the Grocer', zones: ALL, chain: true },
  ],
  lunch: [
    { name: 'Bounty Beets', where: 'Al Sufouh', zones: W },
    { name: 'Comptoir 102', where: 'Jumeirah', zones: C },
    { name: 'Seva Table', where: 'Jumeirah', zones: C },
    { name: 'Jones the Grocer', zones: ALL, chain: true },
  ],

  // ── Mindset ──
  bookshop: [
    { name: 'Book Munch Café', where: 'Al Wasl', zones: C },
    { name: 'Kinokuniya', where: 'The Dubai Mall', zones: C },
    { name: 'Magrudy’s', zones: ALL, chain: true },
  ],
};

/**
 * The best named place for this activity near the visitor: Ren's picks first,
 * then anything in the same part of the city, then a chain (searched near them).
 * Returns undefined when nothing fits, so the plan falls back to a map search.
 */
export function pickVenue(key: string, area: string, seed = 0): Venue | undefined {
  const list = VENUES[key];
  if (!list?.length) return undefined;
  const zone = ZONE_OF[area];
  const rank = (v: Venue) => {
    if (zone && v.zones.includes(zone) && !v.chain) return v.ren ? 3 : 2;
    if (v.chain) return 1;
    return 0;
  };
  const top = Math.max(...list.map(rank));
  if (top === 0) return undefined;
  const best = list.filter((v) => rank(v) === top);
  // Vary between equally good places so the same answers in different areas don't all get one name.
  return best[seed % best.length];
}
