/**
 * The free 1-day planner. Turns the visitor's inputs into a flexible checklist
 * (no clock times) whose durations add up to the time they have.
 * Every item carries real links so they can follow through: book, cook, watch, listen.
 */
import { links, money } from './config';

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
}

interface Option {
  key: string;
  pillar: Exclude<PlanPillar, 'meetup'>;
  title: string;
  venue: (area: string) => string;
  /** Average price range in local currency; omit for free things. */
  range?: [number, number];
  min: number;
  max: number;
  /** Minimum total time before this option is offered. */
  needs: number;
  energy: Energy[];
  goals: Goal[];
  links: (area: string) => PlanLink[];
  steps?: string[];
}

const near = (area: string) => (area && area !== 'Somewhere else' ? `near ${area}` : 'near you');

/* ── Options ─────────────────────────────────────────────────────────────
 * Edit titles, prices and links here. Links can be any full URL, so you can
 * swap a search for a specific studio's booking page or a specific video.
 */
const OPTIONS: Option[] = [
  // Move · at home
  { key: 'stretch', pillar: 'move', title: 'Gentle stretch & breathwork', venue: () => 'At home · follow-along video', min: 10, max: 30, needs: 0, energy: ['Low'], goals: ['Unwind', 'Recharge'],
    links: () => [{ label: 'Watch the video', url: links.youtube('Yoga With Adriene 20 minute stretch') }] },
  { key: 'matpilates', pillar: 'move', title: 'Mat Pilates flow', venue: () => 'At home · follow-along video', min: 10, max: 30, needs: 0, energy: ['Steady', 'High'], goals: ['Focus', 'Glow'],
    links: () => [{ label: 'Watch the video', url: links.youtube('Move With Nicole 20 minute mat pilates') }] },
  // Move · outdoors
  { key: 'walk', pillar: 'move', title: 'Sunset walk', venue: (a) => `Beach path or park ${near(a)}`, min: 20, max: 60, needs: 45, energy: ['Low', 'Steady'], goals: ['Unwind', 'Recharge', 'Connect'],
    links: (a) => [{ label: 'Find a route', url: links.maps('park walking track', a) }] },
  { key: 'runclub', pillar: 'move', title: 'Community run club', venue: (a) => `Free group run ${near(a)}`, min: 45, max: 60, needs: 60, energy: ['Steady', 'High'], goals: ['Connect', 'Focus'],
    links: (a) => [{ label: 'Find a run club', url: links.web('free run club', a) }] },
  // Move · studios & recovery (book through the map listing)
  { key: 'yoga', pillar: 'move', title: 'Yoga class', venue: (a) => `Yoga studio ${near(a)}`, range: [80, 120], min: 60, max: 75, needs: 90, energy: ['Low', 'Steady'], goals: ['Unwind', 'Glow', 'Recharge'],
    links: (a) => [{ label: 'Find & book a class', url: links.maps('yoga studio', a) }] },
  { key: 'reformer', pillar: 'move', title: 'Reformer Pilates', venue: (a) => `Reformer studio ${near(a)}`, range: [140, 200], min: 50, max: 55, needs: 90, energy: ['Steady', 'High'], goals: ['Focus', 'Glow'],
    links: (a) => [{ label: 'Find & book a class', url: links.maps('reformer pilates studio', a) }] },
  { key: 'strength', pillar: 'move', title: 'Strength class', venue: (a) => `Boutique gym ${near(a)}`, range: [100, 150], min: 45, max: 50, needs: 90, energy: ['High'], goals: ['Focus'],
    links: (a) => [{ label: 'Find & book a class', url: links.maps('boutique gym strength class', a) }] },
  { key: 'sauna', pillar: 'move', title: 'Sauna & cold plunge', venue: (a) => `Recovery studio ${near(a)}`, range: [100, 160], min: 45, max: 60, needs: 90, energy: ['Low', 'Steady'], goals: ['Recharge', 'Unwind', 'Glow'],
    links: (a) => [{ label: 'Find & book a session', url: links.maps('sauna cold plunge recovery', a) }] },

  // Meal
  { key: 'fridge', pillar: 'meal', title: '10-minute veggie omelette', venue: () => 'Recipe · from your fridge', min: 10, max: 15, needs: 0, energy: ['Low', 'Steady', 'High'], goals: ['Recharge', 'Focus'],
    links: () => [{ label: 'Open the recipe', url: links.recipe('quick veggie omelette') }] },
  { key: 'oats', pillar: 'meal', title: 'Protein overnight oats', venue: () => 'Recipe · free to follow', min: 10, max: 15, needs: 0, energy: ['Low', 'Steady', 'High'], goals: ['Focus', 'Recharge'],
    links: () => [{ label: 'Open the recipe', url: links.recipe('protein overnight oats') }] },
  { key: 'glowbowl', pillar: 'meal', title: 'Glow bowl: salmon, greens, avocado', venue: () => 'Recipe · free to follow', min: 15, max: 25, needs: 0, energy: ['Low', 'Steady', 'High'], goals: ['Glow', 'Recharge'],
    links: () => [{ label: 'Open the recipe', url: links.recipe('salmon avocado bowl') }] },
  { key: 'smoothie', pillar: 'meal', title: 'Smoothie & salad bar', venue: (a) => `Healthy café ${near(a)}`, range: [45, 70], min: 30, max: 45, needs: 60, energy: ['Steady', 'High'], goals: ['Glow', 'Focus'],
    links: (a) => [{ label: 'Find a café', url: links.maps('healthy cafe salad smoothie', a) }] },
  { key: 'brunch', pillar: 'meal', title: 'Slow brunch', venue: (a) => `Wellness café ${near(a)}`, range: [70, 120], min: 60, max: 90, needs: 120, energy: ['Low', 'Steady'], goals: ['Connect', 'Unwind'],
    links: (a) => [{ label: 'Find & book a table', url: links.maps('healthy brunch cafe', a) }] },
  { key: 'lunch', pillar: 'meal', title: 'Long, healthy lunch', venue: (a) => `Restaurant ${near(a)}`, range: [120, 200], min: 75, max: 90, needs: 240, energy: ['Low', 'Steady', 'High'], goals: ['Connect', 'Unwind'],
    links: (a) => [{ label: 'Find & book a table', url: links.maps('healthy restaurant', a) }] },

  // Mindset
  { key: 'teafortwo', pillar: 'mindset', title: 'Tea for Two: pick an episode', venue: () => 'Podcast · Renee & Amanda', min: 25, max: 45, needs: 60, energy: ['Low', 'Steady', 'High'], goals: ['Connect', 'Unwind'],
    links: () => [{ label: 'Listen to episodes', url: '/episodes' }] },
  { key: 'podcast', pillar: 'mindset', title: 'The Mel Robbins Podcast', venue: () => 'Podcast · self-development', min: 15, max: 30, needs: 30, energy: ['Steady', 'High'], goals: ['Focus'],
    links: () => [{ label: 'Listen on Spotify', url: links.spotify('The Mel Robbins Podcast') }] },
  { key: 'book', pillar: 'mindset', title: 'Atomic Habits, one chapter', venue: () => 'Book · any format', min: 15, max: 30, needs: 30, energy: ['Steady', 'High'], goals: ['Focus', 'Glow'],
    links: () => [{ label: 'See the book', url: links.book('Atomic Habits James Clear') }] },
  { key: 'sleep', pillar: 'mindset', title: 'Read: how to sleep deeper', venue: () => 'Article · on your phone', min: 5, max: 10, needs: 0, energy: ['Low', 'Steady'], goals: ['Recharge'],
    links: () => [{ label: 'Read the article', url: 'https://www.sleepfoundation.org/sleep-hygiene' }] },
  { key: 'journal', pillar: 'mindset', title: 'Five-minute journal', venue: () => 'Notebook or notes app', min: 5, max: 10, needs: 0, energy: ['Low', 'Steady', 'High'], goals: ['Unwind', 'Glow'],
    links: () => [], steps: ["Three things I'm grateful for", "What would make today feel good?", "One kind thing I'll do for myself"] },
];

const costOf = (o: Option) => (o.range ? Math.round((o.range[0] + o.range[1]) / 2) : 0);
/** Budget checks use the top of the range, so the plan never runs over. */
const maxOf = (o: Option) => o.range?.[1] || 0;
export const rangeLabel = (r?: [number, number]) => (r ? `${money(r[0])}–${r[1]}` : 'Free');

const SHARE: Record<Option['pillar'], number> = { move: 0.45, meal: 0.3, mindset: 0.25 };
const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

function score(o: Option, i: PlanInputs, budgetLeft: number) {
  if (maxOf(o) > budgetLeft || o.needs > i.minutes) return -Infinity;
  let s = 0;
  if (o.energy.includes(i.energy)) s += 3;
  for (const g of i.goals) if (o.goals.includes(g)) s += 2;
  s += o.needs / 120 + (o.range ? 0.5 : 0); // richer experience when time & budget allow
  return s;
}

function best(pool: Option[], i: PlanInputs, budgetLeft: number, maxMin: number) {
  const ok = pool.filter((o) => o.min <= maxMin && score(o, i, budgetLeft) > -Infinity);
  return ok.sort((a, b) => score(b, i, budgetLeft) - score(a, i, budgetLeft))[0];
}

function reasonFor(o: Option, i: PlanInputs): string {
  const goal = i.goals.find((g) => o.goals.includes(g));
  const energyLine = i.energy === 'Low' ? 'Gentle, for low energy' : i.energy === 'High' ? 'Uses your high energy' : 'Steady pace for a steady day';
  if (goal && o.pillar === 'meal') return o.range ? `Good for ${goal.toLowerCase()}, within your budget.` : `Good for ${goal.toLowerCase()}, and free to make.`;
  if (goal) return `${energyLine}, and it helps you ${goal.toLowerCase()}.`;
  return o.range ? `${energyLine}, within your budget.` : `${energyLine}, and it's free.`;
}

export function buildPlan(i: PlanInputs): { items: PlanItem[]; total: number; totalLabel: string; minutes: number } {
  const M = Math.max(30, i.minutes);
  let budgetLeft = Math.max(0, i.budget);
  const chosen: { o: Option; dur: number }[] = [];
  const used = new Set<string>();

  // 1 · One Move, one Meal, one Mindset, sized to their share of the time
  const RESERVE = { move: 10, meal: 10, mindset: 5 }; // shortest option per pillar
  const pillars = ['move', 'meal', 'mindset'] as const;
  pillars.forEach((pillar, idx) => {
    const target = M * SHARE[pillar];
    const spent = chosen.reduce((s, c) => s + c.o.min, 0);
    const reserve = pillars.slice(idx + 1).reduce((s, p) => s + RESERVE[p], 0);
    const room = M - spent - reserve; // longest minimum this item may have
    const pool = OPTIONS.filter((o) => o.pillar === pillar);
    const o = best(pool, i, budgetLeft, Math.min(room, Math.max(target * 1.4, 10))) || best(pool, i, budgetLeft, room);
    if (!o) return;
    used.add(o.key);
    budgetLeft -= maxOf(o);
    chosen.push({ o, dur: Math.min(o.max, Math.max(o.min, round5(target))) });
  });

  // 2 · Trim if the minimums overshoot a short window (keep at least the minimums)
  let left = M - chosen.reduce((s, c) => s + c.dur, 0);
  for (const c of [...chosen].sort((x, y) => y.dur - x.dur)) {
    if (left >= 0) break;
    const cut = Math.min(-left, c.dur - c.o.min);
    c.dur -= cut;
    left += cut;
  }

  // 3 · Stretch items toward their max, then add free extras until the time is used
  for (const c of chosen) {
    if (left <= 0) break;
    const add = Math.min(left, c.o.max - c.dur);
    c.dur += add;
    left -= add;
  }
  while (left >= 10 && chosen.length < 6) {
    // Extras are Move or Mindset only (one meal a day is enough)
    const extra = best(OPTIONS.filter((o) => !used.has(o.key) && o.pillar !== 'meal'), i, budgetLeft, left);
    if (!extra) break;
    used.add(extra.key);
    budgetLeft -= maxOf(extra);
    const dur = Math.min(extra.max, left);
    chosen.push({ o: extra, dur });
    left -= dur;
  }
  // Any small remainder goes to the first Move item, so it adds up exactly
  if (left > 0 && chosen.length) chosen[0].dur += left;

  const order = { move: 0, meal: 1, mindset: 2 };
  const items: PlanItem[] = chosen
    .sort((a, b) => order[a.o.pillar] - order[b.o.pillar])
    .map(({ o, dur }) => ({
      id: o.key,
      pillar: o.pillar,
      label: o.pillar === 'move' ? 'Move' : o.pillar === 'meal' ? 'Meal' : 'Mindset',
      title: o.title,
      venue: o.venue(i.area),
      reason: reasonFor(o, i),
      cost: costOf(o),
      priceLabel: rangeLabel(o.range),
      minutes: dur,
      links: o.links(i.area),
      steps: o.steps,
    }));
  const lo = chosen.reduce((s, c) => s + (c.o.range?.[0] || 0), 0);
  const hi = chosen.reduce((s, c) => s + (c.o.range?.[1] || 0), 0);
  return {
    items,
    total: items.reduce((s, x) => s + x.cost, 0),
    totalLabel: hi ? rangeLabel([lo, hi]) : 'Free',
    minutes: items.reduce((s, x) => s + x.minutes, 0),
  };
}

export const describeTime = (m: number) =>
  TIME_CHIPS.find((c) => c.minutes === m)?.label ?? (m >= 60 ? `${Math.floor(m / 60)} hr${m >= 120 ? 's' : ''}${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
export { money };
