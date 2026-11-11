/**
 * The free 1-day planner. Turns the visitor's inputs into a flexible checklist
 * (no clock times) whose durations add up to the time they have.
 * Every item carries real links so they can follow through: book, cook, watch, listen.
 */
import { links, money } from './config';
import { pickVenue } from './venues';

export type Energy = 'Low' | 'Steady' | 'High';
export type Goal = 'Recharge' | 'Focus' | 'Glow' | 'Connect' | 'Unwind';
export const ENERGIES: Energy[] = ['Low', 'Steady', 'High'];
export const GOALS: Goal[] = ['Recharge', 'Focus', 'Glow', 'Connect', 'Unwind'];
export const TIME_CHIPS: { label: string; minutes: number }[] = [
  { label: '30 min', minutes: 30 },
  { label: '1 hr', minutes: 60 },
  { label: '2 hrs', minutes: 120 },
  { label: 'Half day', minutes: 240 },
];

export interface PlanInputs {
  energy: Energy;
  goals: Goal[];
  minutes: number;
  budget: number;
  area: string;
}

export type PlanPillar = 'move' | 'meal' | 'mindset' | 'meetup';

export interface PlanLink {
  label: string;
  /** Full URL, or a path on this site such as '/episodes'. */
  url: string;
}

export interface PlanItem {
  id: string;
  pillar: PlanPillar;
  label: string; // Move / Meal / Mindset
  title: string;
  venue: string;
  reason: string;
  /** Typical cost used for budget checks (middle of the range). 0 = free. */
  cost: number;
  /** Shown to the visitor: "Free" or an average range like "AED 50–80". */
  priceLabel: string;
  minutes: number;
  links: PlanLink[];
  /** Optional in-app guidance (e.g. journal prompts). */
  steps?: string[];
  /** Best time of day, e.g. "Go after 6pm, when it cools down". */
  timing?: string;
}

/**
 * What each activity is for:
 * - workout / gentle / recovery: Move. Recovery (sauna, massage, spa, sound bath) counts as Move.
 * - treat: a feel-good extra (nails, a bookshop browse). Shown as "Treat".
 * - meal / snack: Meal. One proper meal; a snack only on long days.
 * - mindset, meetup, rest.
 */
type Kind = 'workout' | 'gentle' | 'recovery' | 'treat' | 'meal' | 'snack' | 'mindset' | 'meetup';

interface Option {
  key: string;
  kind: Kind;
  title: string;
  /** Where it happens when there's no named place (or it's at home). */
  place: (area: string) => string;
  /** Average price range in local currency; omit for free things. */
  range?: [number, number];
  min: number;
  max: number;
  /** Minimum total time before this option is offered. */
  needs: number;
  /** How well it suits each energy level (missing = not offered at that energy). */
  fit: Partial<Record<Energy, number>>;
  goals: Goal[];
  /** Map search used when there's no named place nearby. */
  search?: string;
  /** Extra links (videos, podcasts). */
  links?: () => PlanLink[];
  steps?: string[];
  /** Only offered when the visitor picked this goal. */
  requires?: Goal;
  /** Outdoors: timed around the heat and sunset. */
  outdoor?: boolean;
}

const near = (area: string) => (area && area !== 'Somewhere else' ? `near ${area}` : 'near you');
const home = (what: string) => () => what;

/* ── Options ─────────────────────────────────────────────────────────────
 * Edit titles, prices and links here. Named places for each activity live in venues.ts.
 */
const OPTIONS: Option[] = [
  // Move · workouts
  { key: 'matpilates', kind: 'workout', title: 'Mat Pilates flow', place: home('At home · follow-along video'), min: 15, max: 30, needs: 0, fit: { Steady: 3, High: 2 }, goals: ['Focus', 'Glow'],
    links: () => [{ label: 'Watch the video', url: links.youtube('Move With Nicole 20 minute mat pilates') }] },
  { key: 'runclub', kind: 'workout', title: 'Community run club', place: (a) => `Free group run ${near(a)}`, min: 45, max: 60, needs: 60, fit: { High: 4, Steady: 2 }, goals: ['Connect', 'Focus'],
    links: () => [], search: 'free run club', outdoor: true },
  { key: 'hotclass', kind: 'workout', title: 'Hot workout class', place: (a) => `Heated studio ${near(a)}`, range: [90, 140], min: 45, max: 60, needs: 60, fit: { High: 5 }, goals: ['Glow', 'Focus'], search: 'hot yoga hot pilates studio' },
  { key: 'reformer', kind: 'workout', title: 'Reformer Pilates', place: (a) => `Reformer studio ${near(a)}`, range: [140, 200], min: 50, max: 55, needs: 60, fit: { Steady: 4, High: 3 }, goals: ['Glow', 'Focus'], search: 'reformer pilates studio' },
  { key: 'strength', kind: 'workout', title: 'Strength class', place: (a) => `Boutique gym ${near(a)}`, range: [100, 150], min: 45, max: 50, needs: 60, fit: { High: 5, Steady: 1 }, goals: ['Focus', 'Glow'], search: 'boutique gym strength class' },
  { key: 'swim', kind: 'workout', title: 'Easy lap swim', place: (a) => `Pool ${near(a)}`, range: [30, 60], min: 30, max: 45, needs: 30, fit: { Steady: 4, High: 2, Low: 1 }, goals: ['Recharge', 'Focus', 'Unwind'], search: 'public swimming pool day pass' },
  // Move · gentle
  { key: 'stretch', kind: 'gentle', title: 'Gentle stretch & breathwork', place: home('At home · follow-along video'), min: 10, max: 30, needs: 0, fit: { Low: 4, Steady: 1 }, goals: ['Unwind', 'Recharge'],
    links: () => [{ label: 'Watch the video', url: links.youtube('Yoga With Adriene 20 minute stretch') }] },
  { key: 'walk', kind: 'gentle', title: 'Sunset walk', place: (a) => `Beach path or park ${near(a)}`, min: 20, max: 45, needs: 45, fit: { Low: 4, Steady: 3, High: 1 }, goals: ['Unwind', 'Recharge', 'Connect'], search: 'park walking track', outdoor: true },
  { key: 'yoga', kind: 'gentle', title: 'Yoga class', place: (a) => `Yoga studio ${near(a)}`, range: [80, 120], min: 60, max: 75, needs: 90, fit: { Low: 2, Steady: 4 }, goals: ['Unwind', 'Glow', 'Recharge', 'Connect'], search: 'yoga studio' },
  // Move · recovery
  { key: 'sauna', kind: 'recovery', title: 'Sauna & cold plunge', place: (a) => `Recovery studio ${near(a)}`, range: [100, 160], min: 45, max: 60, needs: 90, fit: { Low: 4, Steady: 3, High: 4 }, goals: ['Recharge', 'Unwind', 'Glow'], search: 'sauna cold plunge recovery' },
  { key: 'soundbath', kind: 'recovery', title: 'Sound bath', place: (a) => `Wellness studio ${near(a)}`, range: [100, 180], min: 60, max: 75, needs: 90, fit: { Low: 5, Steady: 3, High: 1 }, goals: ['Unwind', 'Recharge'], search: 'sound bath meditation' },
  { key: 'massage', kind: 'recovery', title: '60-minute massage', place: (a) => `Spa ${near(a)}`, range: [250, 400], min: 60, max: 75, needs: 120, fit: { Low: 5, Steady: 4, High: 4 }, goals: ['Recharge', 'Unwind', 'Glow'], search: 'massage spa' },
  { key: 'spaday', kind: 'recovery', title: 'Spa afternoon: hammam & massage', place: (a) => `Hotel spa ${near(a)}`, range: [450, 700], min: 150, max: 180, needs: 300, fit: { Low: 5, Steady: 4, High: 3 }, goals: ['Recharge', 'Unwind', 'Glow'], search: 'hotel spa hammam' },
  // Treats
  { key: 'manipedi', kind: 'treat', title: 'Mani-pedi', place: (a) => `Nail spa ${near(a)}`, range: [150, 250], min: 60, max: 75, needs: 180, fit: { Low: 4, Steady: 3, High: 3 }, goals: ['Glow', 'Unwind', 'Connect'], search: 'nail spa' },
  { key: 'bookshop', kind: 'treat', title: 'Browse a bookshop, bring one home', place: (a) => `Bookshop ${near(a)}`, range: [40, 70], min: 30, max: 45, needs: 120, fit: { Low: 3, Steady: 3, High: 2 }, goals: ['Focus', 'Unwind', 'Glow'], search: 'bookshop' },
  { key: 'friendwalk', kind: 'treat', title: 'Walk-and-talk with a friend', place: (a) => `Beach path or park ${near(a)}`, min: 30, max: 45, needs: 120, fit: { Low: 2, Steady: 3, High: 3 }, goals: ['Connect'], requires: 'Connect', search: 'beach walk park', outdoor: true },

  // Meal
  { key: 'fridge', kind: 'meal', title: '10-minute veggie omelette', place: home('Recipe · from your fridge'), min: 10, max: 15, needs: 0, fit: { Low: 3, Steady: 3, High: 3 }, goals: ['Recharge', 'Focus'],
    links: () => [{ label: 'Watch on YouTube', url: links.recipe('quick veggie omelette') }] },
  { key: 'oats', kind: 'meal', title: 'Protein overnight oats', place: home('Recipe · free to follow'), min: 10, max: 15, needs: 0, fit: { Low: 2, Steady: 3, High: 3 }, goals: ['Focus', 'Recharge'],
    links: () => [{ label: 'Watch on YouTube', url: links.recipe('protein overnight oats') }] },
  { key: 'glowbowl', kind: 'meal', title: 'Glow bowl: salmon, greens, avocado', place: home('Recipe · free to follow'), min: 15, max: 25, needs: 0, fit: { Low: 3, Steady: 3, High: 3 }, goals: ['Glow', 'Recharge'],
    links: () => [{ label: 'Watch on YouTube', url: links.recipe('salmon avocado bowl') }] },
  { key: 'bowl', kind: 'meal', title: 'Healthy grain or poke bowl', place: (a) => `Healthy café ${near(a)}`, range: [45, 75], min: 30, max: 40, needs: 60, fit: { Low: 3, Steady: 3, High: 3 }, goals: ['Glow', 'Focus', 'Recharge'], search: 'healthy poke bowl cafe' },
  { key: 'brunch', kind: 'meal', title: 'Slow brunch', place: (a) => `Café ${near(a)}`, range: [80, 140], min: 60, max: 90, needs: 120, fit: { Low: 3, Steady: 3, High: 2 }, goals: ['Connect', 'Unwind', 'Recharge'], search: 'healthy brunch cafe' },
  { key: 'lunch', kind: 'meal', title: 'Long, healthy lunch', place: (a) => `Restaurant ${near(a)}`, range: [120, 220], min: 75, max: 90, needs: 240, fit: { Low: 3, Steady: 3, High: 3 }, goals: ['Connect', 'Unwind', 'Glow'], search: 'healthy restaurant' },
  // Snack (long days only)
  { key: 'smoothiehome', kind: 'snack', title: 'Iced matcha or berry smoothie', place: home('Recipe · 5 minutes at home'), min: 10, max: 15, needs: 0, fit: { Low: 3, Steady: 3, High: 3 }, goals: ['Glow', 'Recharge', 'Focus'],
    links: () => [{ label: 'Watch on YouTube', url: links.recipe('iced matcha latte berry smoothie') }] },
  { key: 'juice', kind: 'snack', title: 'Fresh juice or iced matcha', place: (a) => `Café ${near(a)}`, range: [25, 40], min: 15, max: 30, needs: 0, fit: { Low: 3, Steady: 3, High: 3 }, goals: ['Glow', 'Focus', 'Recharge', 'Connect'], search: 'fresh juice matcha cafe' },

  // Mindset
  { key: 'teafortwo', kind: 'mindset', title: 'Tea for Two: pick an episode', place: home('Podcast · Renee & Amanda'), min: 25, max: 45, needs: 60, fit: { Low: 3, Steady: 3, High: 3 }, goals: ['Connect', 'Unwind'],
    links: () => [
      { label: 'Watch on YouTube', url: 'https://www.youtube.com/@Renreset' },
      { label: 'Listen on Spotify', url: 'https://open.spotify.com/show/2dtKfW2MpiAAEbfM18m64r' },
    ] },
  { key: 'podcast', kind: 'mindset', title: 'The Mel Robbins Podcast', place: home('Podcast · self-development'), min: 15, max: 30, needs: 30, fit: { Steady: 3, High: 4 }, goals: ['Focus'],
    links: () => [
      { label: 'Watch on YouTube', url: links.youtube('The Mel Robbins Podcast') },
      { label: 'Listen on Spotify', url: links.spotify('The Mel Robbins Podcast') },
    ] },
  { key: 'book', kind: 'mindset', title: 'Atomic Habits, one chapter', place: home('Book · free summary'), min: 15, max: 30, needs: 30, fit: { Steady: 3, High: 3 }, goals: ['Focus', 'Glow'],
    links: () => [
      { label: 'Watch on YouTube', url: links.youtube('Atomic Habits James Clear summary') },
      { label: 'Listen on Spotify', url: links.spotify('Atomic Habits James Clear') },
    ] },
  { key: 'sleep', kind: 'mindset', title: 'Read: how to sleep deeper', place: home('Article · on your phone'), min: 5, max: 10, needs: 0, fit: { Low: 4, Steady: 2 }, goals: ['Recharge', 'Unwind'],
    links: () => [{ label: 'Read the article', url: 'https://www.sleepfoundation.org/sleep-hygiene' }] },
  { key: 'journal', kind: 'mindset', title: 'Five-minute journal', place: home('Notebook or notes app'), min: 5, max: 15, needs: 0, fit: { Low: 3, Steady: 3, High: 2 }, goals: ['Unwind', 'Glow', 'Focus'],
    links: () => [], steps: ["Three things I'm grateful for", 'What would make today feel good?', "One kind thing I'll do for myself"] },

  // Meetup (Connect only)
  { key: 'stepsisters', kind: 'meetup', title: 'Stepsisters community meetup', place: home('Stepsisters · free community events'), min: 60, max: 90, needs: 180, fit: { Low: 2, Steady: 4, High: 4 }, goals: ['Connect'],
    links: () => [{ label: 'See upcoming events', url: '/community' }] },
];

const costOf = (o: Option) => (o.range ? Math.round((o.range[0] + o.range[1]) / 2) : 0);
/** Budget checks use the top of the range, so the plan never runs over. */
const maxOf = (o: Option) => o.range?.[1] || 0;
export const rangeLabel = (r?: [number, number]) => (r ? `${money(r[0])}–${r[1]}` : 'Free');

/* ── Shape of the day ────────────────────────────────────────────────────
 * Slots grow with time. Energy decides what the main Move is; a long day or a
 * big budget adds recovery and treats, never extra workouts.
 */
type Slot = 'move' | 'recover' | 'meal' | 'snack' | 'mindset' | 'treat' | 'meetup' | 'gentle';

const SLOT_KINDS: Record<Slot, (e: Energy) => Kind[]> = {
  // Low energy: gentle movement (recovery gets its own slot from 2 hrs, or stands in on short days)
  move: (e) => (e === 'Low' ? ['gentle', 'recovery'] : e === 'Steady' ? ['workout', 'gentle'] : ['workout']),
  recover: () => ['recovery'],
  meal: () => ['meal'],
  snack: () => ['snack'],
  mindset: () => ['mindset'],
  treat: () => ['treat'],
  meetup: () => ['meetup'],
  gentle: () => ['gentle'],
};

function slotsFor(i: PlanInputs, M: number): Slot[] {
  const s: Slot[] = ['move', 'meal', 'mindset'];
  if (M >= 120) s.splice(1, 0, 'recover');
  if (M >= 240) s.push('snack', i.goals.includes('Connect') ? 'meetup' : 'treat');
  if (M >= 360) s.push(i.goals.includes('Connect') ? 'treat' : 'gentle');
  return s;
}

/* ── Dubai-aware timing ──────────────────────────────────────────────────
 * Approximate sunset by month, and the hot months when outdoor plans move to the evening.
 */
const SUNSET = ['6:00pm', '6:20pm', '6:30pm', '6:40pm', '6:55pm', '7:10pm', '7:10pm', '6:55pm', '6:30pm', '6:00pm', '5:35pm', '5:35pm'];
const HOT_MONTHS = [4, 5, 6, 7, 8, 9]; // May to October (0 = January)
let NOW = new Date();
const isHot = () => HOT_MONTHS.includes(NOW.getMonth());

function timingFor(o: Option): string | undefined {
  const sunset = SUNSET[NOW.getMonth()];
  if (o.outdoor) return isHot() ? `Go after ${sunset} sunset, when it cools down. Too hot before.` : `Lovely any time today. Sunset is around ${sunset}.`;
  if (o.key === 'swim' && isHot()) return 'An indoor or shaded pool keeps this cool at midday.';
  if ((o.kind === 'recovery' || o.kind === 'workout') && o.range && isHot()) return 'Indoors and air-conditioned, so any time works.';
  return undefined;
}

function score(o: Option, i: PlanInputs, cap: number) {
  const fit = o.fit[i.energy] || 0;
  let s = fit * 3;
  if (o.outdoor && isHot()) s -= 4; // in summer, prefer indoor picks
  for (const g of i.goals) if (o.goals.includes(g)) s += 3;
  s += o.needs / 120; // richer experience when time allows
  // They told us their budget: use it. A paid pick that fits beats a free one,
  // and picks closer to this slot's share rank higher (the cap is never crossed).
  if (o.range && i.budget > 0) s += 1 + 2 * Math.min(1, maxOf(o) / Math.max(cap, 1));
  return s;
}

const hash = (t: string) => [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** "Why this for you", written back in the visitor's own words. */
function reasonFor(o: Option, i: PlanInputs, ren: boolean): string {
  const goal = i.goals.find((g) => o.goals.includes(g));
  const e = i.energy.toLowerCase();
  const energyLine: Partial<Record<Kind, string>> = {
    workout: i.energy === 'High' ? 'You said high energy, so this one makes you work.' : 'You said steady energy, so it’s a moderate pace, not a sweat-fest.',
    gentle: i.energy === 'Low' ? 'You said low energy, so no HIIT today. Gentle still counts.' : `You said ${e} energy, so this keeps you moving without draining you.`,
    recovery: i.energy === 'Low' ? 'You said low energy, so your body gets to recover. Recovery counts as Move.' : 'Recovery counts as Move, and it balances out the workout.',
    treat: 'Your day has room for something just for you.',
    meetup: 'You picked Connect, so here’s where to meet women who get it.',
    meal: i.minutes >= 120 ? 'You have time to sit down and enjoy it.' : 'Quick, so it fits your time.',
    snack: 'A pick-me-up between plans.',
    mindset: i.energy === 'Low' ? 'Easy on a tired brain.' : 'Something for your mind, too.',
  };
  const goalLine = goal
    ? ({ Recharge: 'It helps you recharge.', Focus: 'It helps you focus.', Glow: 'Good for that glow.', Connect: 'Easy to do with a friend.', Unwind: 'It helps you unwind.' } as Record<Goal, string>)[goal]
    : '';
  const money_ = o.range ? (i.budget > 0 ? `${rangeLabel(o.range)}, inside your ${money(i.budget)}.` : '') : i.budget === 0 ? 'Free, as you asked.' : 'Free.';
  return [energyLine[o.kind], goalLine, money_, ren ? 'One of Ren’s picks.' : ''].filter(Boolean).join(' ');
}

function toItem(o: Option, dur: number, i: PlanInputs): PlanItem {
  const v = pickVenue(o.key, i.area, hash(i.area + o.key));
  const label = o.kind === 'recovery' ? 'Recover' : o.kind === 'treat' ? 'Treat' : o.kind === 'meetup' ? 'Meetup' : o.kind === 'meal' || o.kind === 'snack' ? 'Meal' : o.kind === 'mindset' ? 'Mindset' : 'Move';
  const pillar: PlanPillar = o.kind === 'meal' || o.kind === 'snack' ? 'meal' : o.kind === 'mindset' || o.kind === 'treat' ? 'mindset' : o.kind === 'meetup' ? 'meetup' : 'move';
  const extra = o.links?.() || [];
  let venue = o.place(i.area);
  let itemLinks = extra;
  if (v) {
    venue = v.chain ? `${v.name} · branch ${near(i.area)}` : `${v.name} · ${v.where}`;
    const map = v.chain ? links.maps(v.name, i.area) : links.maps(`${v.name} ${v.where?.split(' · ')[0] || ''}`);
    itemLinks = [{ label: 'Open in Maps', url: map }, ...extra]; // Maps only, no business websites (Ren's rule)
  } else if (o.search) {
    itemLinks = [{ label: o.range ? 'Find & book nearby' : 'Find one nearby', url: links.maps(o.search, i.area) }, ...extra];
  }
  return {
    id: o.key,
    pillar,
    label,
    title: o.title,
    venue,
    reason: reasonFor(o, i, !!v?.ren),
    cost: costOf(o),
    priceLabel: rangeLabel(o.range),
    minutes: dur,
    links: itemLinks,
    steps: o.steps,
    timing: timingFor(o),
  };
}

const REST = (min: number): PlanItem => ({
  id: 'rest',
  pillar: 'mindset',
  label: 'Rest',
  title: 'Unplanned time: rest, nap or wander',
  venue: 'Wherever feels good',
  reason: 'Space in the day is part of the plan. No screens if you can.',
  cost: 0,
  priceLabel: 'Free',
  minutes: min,
  links: [],
});

export interface Plan {
  items: PlanItem[];
  total: number;
  totalLabel: string;
  minutes: number;
}

export function buildPlan(i: PlanInputs, now = new Date()): Plan {
  NOW = now;
  const M = Math.max(30, i.minutes);
  const budget = Math.max(0, i.budget);
  const slots = slotsFor(i, M);
  const chosen: { o: Option; dur: number }[] = [];
  const used = new Set<string>();
  let spent = 0;

  slots.forEach((slot, idx) => {
    const kinds = slot === 'move' && i.energy === 'Low' && slots.includes('recover') ? (['gentle'] as Kind[]) : SLOT_KINDS[slot](i.energy);
    const later = slots.slice(idx + 1);
    // Keep room for the shortest pick of every slot still to come
    const reserve = later.reduce((s, x) => s + Math.min(...OPTIONS.filter((o) => SLOT_KINDS[x](i.energy).includes(o.kind)).map((o) => o.min), 60), 0);
    const room = M - chosen.reduce((s, c) => s + c.o.min, 0) - reserve;
    // Slots go in order (Move, Recover, Meal...), each using what's left of the budget
    const cap = budget - spent;
    const pool = OPTIONS.filter((o) => kinds.includes(o.kind) && !used.has(o.key) && (o.fit[i.energy] || 0) > 0 && (!o.requires || i.goals.includes(o.requires)) && o.needs <= M && o.min <= room && maxOf(o) <= cap);
    const o = pool.sort((a, b) => score(b, i, cap) - score(a, i, cap))[0];
    if (!o) return;
    used.add(o.key);
    spent += maxOf(o);
    chosen.push({ o, dur: o.min });
  });

  // Stretch items toward their max (Move first, then the rest evenly); what's left becomes rest time
  let left = M - chosen.reduce((s, c) => s + c.dur, 0);
  for (const c of chosen.filter((x) => x.o.kind === 'workout' || x.o.kind === 'gentle')) {
    const add = Math.min(left, c.o.max - c.dur);
    c.dur += add;
    left -= add;
  }
  while (left > 0) {
    const open = chosen.filter((c) => c.dur < c.o.max);
    if (!open.length) break;
    const step = Math.max(5, Math.floor(left / open.length / 5) * 5);
    for (const c of open) {
      const add = Math.min(step, c.o.max - c.dur, left);
      c.dur += add;
      left -= add;
      if (left <= 0) break;
    }
  }

  // A few spare minutes go to the meal (lingering is fine); more becomes rest time
  if (left > 0 && left < 10 && chosen.length) {
    (chosen.find((c) => c.o.kind === 'meal') || chosen[0]).dur += left;
    left = 0;
  }

  const order: Record<Kind, number> = { workout: 0, gentle: 1, recovery: 2, meal: 3, snack: 4, meetup: 5, treat: 6, mindset: 7 };
  const items = chosen.sort((a, b) => order[a.o.kind] - order[b.o.kind]).map(({ o, dur }) => toItem(o, dur, i));
  if (left > 0) items.push(REST(left));
  const lo = chosen.reduce((s, c) => s + (c.o.range?.[0] || 0), 0);
  const hi = chosen.reduce((s, c) => s + (c.o.range?.[1] || 0), 0);
  return {
    items,
    total: items.reduce((s, x) => s + x.cost, 0),
    totalLabel: hi ? rangeLabel([lo, hi]) : 'Free',
    minutes: items.reduce((s, x) => s + x.minutes, 0),
  };
}

function summarise(items: PlanItem[]): Plan {
  const ranges = items.map((x) => OPTIONS.find((o) => o.key === x.id)?.range).filter(Boolean) as [number, number][];
  const lo = ranges.reduce((s, r) => s + r[0], 0);
  const hi = ranges.reduce((s, r) => s + r[1], 0);
  return { items, total: items.reduce((s, x) => s + x.cost, 0), totalLabel: hi ? rangeLabel([lo, hi]) : 'Free', minutes: items.reduce((s, x) => s + x.minutes, 0) };
}

const SWAP_KINDS: Record<Kind, Kind[]> = {
  workout: ['workout', 'gentle'],
  gentle: ['gentle', 'workout', 'recovery'],
  recovery: ['recovery', 'gentle'],
  treat: ['treat'],
  meal: ['meal'],
  snack: ['snack'],
  mindset: ['mindset'],
  meetup: ['meetup'],
};

/**
 * "Not feeling it?": replace one pick with the next best option of the same kind that
 * still fits the time and budget. Time it frees up goes to rest. `skipped` keeps
 * earlier swaps out so the visitor sees something new each tap. Returns null when
 * there's nothing else that fits.
 */
export function swapItem(i: PlanInputs, plan: Plan, id: string, skipped: string[] = [], now = new Date()): Plan | null {
  NOW = now;
  const cur = OPTIONS.find((o) => o.key === id);
  const idx = plan.items.findIndex((x) => x.id === id);
  if (!cur || idx < 0) return null;
  const item = plan.items[idx];
  const rest = plan.items.find((x) => x.id === 'rest');
  const room = item.minutes + (rest?.minutes || 0);
  const spentElse = plan.items.reduce((s, x) => s + (x.id === id ? 0 : OPTIONS.find((o) => o.key === x.id)?.range?.[1] || 0), 0);
  const cap = Math.max(0, i.budget) - spentElse;
  const used = new Set(plan.items.map((x) => x.id));
  const pool = OPTIONS.filter(
    (o) =>
      SWAP_KINDS[cur.kind].includes(o.kind) &&
      !used.has(o.key) &&
      !skipped.includes(o.key) &&
      (o.fit[i.energy] || 0) > 0 &&
      (!o.requires || i.goals.includes(o.requires)) &&
      o.needs <= i.minutes &&
      o.min <= room &&
      maxOf(o) <= cap,
  ).sort((a, b) => (b.kind === cur.kind ? 1 : 0) - (a.kind === cur.kind ? 1 : 0) || score(b, i, cap) - score(a, i, cap));
  const next = pool[0];
  if (!next) return null;
  const dur = Math.min(next.max, Math.max(next.min, item.minutes));
  const items = plan.items.filter((x) => x.id !== 'rest');
  items[items.findIndex((x) => x.id === id)] = toItem(next, dur, i);
  const free = item.minutes + (rest?.minutes || 0) - dur;
  if (free > 0) items.push(REST(free));
  return summarise(items);
}

export const describeTime = (m: number) =>
  TIME_CHIPS.find((c) => c.minutes === m)?.label ?? (m >= 60 ? `${Math.floor(m / 60)} hr${m >= 120 ? 's' : ''}${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
export { money };
