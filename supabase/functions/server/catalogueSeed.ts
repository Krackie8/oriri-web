/**
 * The Catalogue's first rows: the plan engine's built-in options (src/app/wellness/bestie/engine.ts,
 * keyed by the same slug) plus a free light Meet up. This file is the single source for the seed
 * migration; a test checks the migration's SQL is exactly `catalogueSeedSql()`.
 * Cost is the top of each option's price range, so a plan never runs over her budget.
 * Duration is the option's shortest time.
 */
export type Pillar = 'move' | 'meal' | 'mindset' | 'meet_up'
export type Energy = 'low' | 'steady' | 'high'
export type Goal = 'recharge' | 'focus' | 'glow' | 'connect' | 'unwind'

export interface SeedItem {
  slug: string
  title: string
  pillars: Pillar[]
  kind: string
  costAed: number
  durationMin: number
  energyFit: Energy[]
  goals: Goal[]
  outdoor: boolean
  light: boolean
  fallback: boolean
  /** Done at a place (a studio, spa or restaurant) rather than anywhere. Never true for a light version. */
  needsPlace: boolean
  intensity: 1 | 2 | 3
  timeNote: string | null
  endsOn: string | null
}

const ALL: Energy[] = ['low', 'steady', 'high']
const item = (
  slug: string, title: string, pillars: Pillar[], kind: string, costAed: number, durationMin: number,
  energyFit: Energy[], goals: Goal[], extra: Partial<Pick<SeedItem, 'outdoor' | 'light' | 'fallback' | 'timeNote' | 'endsOn'>> = {},
): SeedItem => ({ slug, title, pillars, kind, costAed, durationMin, energyFit, goals, outdoor: false, light: false, fallback: false,
  needsPlace: false, intensity: 1, timeNote: null, endsOn: null, ...extra })
const light = { light: true, fallback: true }

const RAW_SEED: SeedItem[] = [
  // Move
  item('matpilates', 'Mat Pilates flow', ['move'], 'workout', 0, 15, ['steady', 'high'], ['focus', 'glow']),
  item('runclub', 'Community run club', ['move', 'meet_up'], 'workout', 0, 45, ['steady', 'high'], ['connect', 'focus'], { outdoor: true }),
  item('hotclass', 'Hot workout class', ['move'], 'workout', 140, 45, ['high'], ['glow', 'focus']),
  item('reformer', 'Reformer Pilates', ['move'], 'workout', 200, 50, ['steady', 'high'], ['glow', 'focus']),
  item('strength', 'Strength class', ['move'], 'workout', 150, 45, ['steady', 'high'], ['focus', 'glow']),
  item('swim', 'Easy lap swim', ['move'], 'workout', 60, 30, ALL, ['recharge', 'focus', 'unwind']),
  item('stretch', 'Gentle stretch & breathwork', ['move'], 'gentle', 0, 10, ALL, ['unwind', 'recharge'], light),
  item('walk', 'Sunset walk', ['move'], 'gentle', 0, 20, ALL, ['unwind', 'recharge', 'connect'], { outdoor: true }),
  item('yoga', 'Yoga class', ['move'], 'gentle', 120, 60, ['low', 'steady'], ['unwind', 'glow', 'recharge', 'connect']),
  item('sauna', 'Sauna & cold plunge', ['move'], 'recovery', 160, 45, ALL, ['recharge', 'unwind', 'glow']),
  item('soundbath', 'Sound bath', ['move'], 'recovery', 180, 60, ALL, ['unwind', 'recharge']),
  item('massage', '60-minute massage', ['move'], 'recovery', 400, 60, ALL, ['recharge', 'unwind', 'glow']),
  item('spaday', 'Spa afternoon: hammam & massage', ['move'], 'recovery', 700, 150, ALL, ['recharge', 'unwind', 'glow']),
  item('friendwalk', 'Walk-and-talk with a friend', ['move', 'meet_up'], 'gentle', 0, 30, ALL, ['connect'], { outdoor: true }),
  // Meal
  item('fridge', '10-minute veggie omelette', ['meal'], 'meal', 0, 10, ALL, ['recharge', 'focus']),
  item('oats', 'Protein overnight oats', ['meal'], 'meal', 0, 10, ALL, ['focus', 'recharge']),
  item('glowbowl', 'Glow bowl: salmon, greens, avocado', ['meal'], 'meal', 0, 15, ALL, ['glow', 'recharge']),
  item('bowl', 'Healthy grain or poke bowl', ['meal'], 'meal', 75, 30, ALL, ['glow', 'focus', 'recharge']),
  item('brunch', 'Slow brunch', ['meal'], 'meal', 140, 60, ALL, ['connect', 'unwind', 'recharge']),
  item('lunch', 'Long, healthy lunch', ['meal'], 'meal', 220, 75, ALL, ['connect', 'unwind', 'glow']),
  item('smoothiehome', 'Iced matcha or berry smoothie', ['meal'], 'snack', 0, 10, ALL, ['glow', 'recharge', 'focus'], light),
  item('juice', 'Fresh juice or iced matcha', ['meal'], 'snack', 40, 15, ALL, ['glow', 'focus', 'recharge', 'connect']),
  // Mindset
  item('teafortwo', 'Tea for Two: pick an episode', ['mindset'], 'mindset', 0, 25, ALL, ['connect', 'unwind']),
  item('podcast', 'The Mel Robbins Podcast', ['mindset'], 'mindset', 0, 15, ['steady', 'high'], ['focus']),
  item('book', 'Atomic Habits, one chapter', ['mindset'], 'mindset', 0, 15, ['steady', 'high'], ['focus', 'glow']),
  item('sleep', 'Read: how to sleep deeper', ['mindset'], 'mindset', 0, 5, ['low', 'steady'], ['recharge', 'unwind']),
  item('journal', 'Five-minute journal', ['mindset'], 'mindset', 0, 5, ALL, ['unwind', 'glow', 'focus'], light),
  // Meet up
  item('stepsisters', 'Stepsisters community meetup', ['meet_up'], 'meetup', 0, 60, ALL, ['connect']),
  item('reachout', "Message a Stepsister you haven't seen", ['meet_up'], 'reach_out', 0, 5, ALL, ['connect'], light),
]

const NEEDS_PLACE = new Set('hotclass reformer strength swim yoga sauna soundbath massage spaday bowl brunch lunch juice'.split(' '))
const INTENSITY: Record<string, 2 | 3> = { hotclass: 3, strength: 3, runclub: 3, matpilates: 2, reformer: 2, swim: 2 }

/** The seed with its activity fields: which items need a place, and how hard each one is. */
export const CATALOGUE_SEED: SeedItem[] = RAW_SEED.map((i) => ({
  ...i, needsPlace: NEEDS_PLACE.has(i.slug), intensity: INTENSITY[i.slug] ?? 1,
}))

const q = (s: string) => `'${s.replace(/'/g, "''")}'`
const arr = (xs: string[], type: string) => `${q(`{${xs.join(',')}}`)}::bestie.${type}[]`

/** The insert the seed migration runs, generated from CATALOGUE_SEED. */
export function catalogueSeedSql(): string {
  const rows = CATALOGUE_SEED.map((i) =>
    `  (${[q(i.slug), q(i.title), arr(i.pillars, 'pillar'), q(i.kind), i.costAed, i.durationMin, arr(i.energyFit, 'energy'),
      arr(i.goals, 'goal'), i.outdoor, i.light, i.fallback].join(', ')})`)
  return `insert into bestie.catalogue_items
  (slug, title, pillars, kind, cost_aed, duration_min, energy_fit, goals, is_outdoor, is_light, is_fallback)
values
${rows.join(',\n')};
`
}

/** The shape migration's updates: each seed item's activity fields, in seed order, then a drift guard. */
export function catalogueShapeSql(): string {
  const updates = CATALOGUE_SEED.map((i) =>
    `update bestie.catalogue_items set needs_place = ${i.needsPlace}, intensity = ${i.intensity} where slug = ${q(i.slug)};
`).join('')
  const slugs = `array[${CATALOGUE_SEED.map((i) => q(i.slug)).join(', ')}]`
  const needing = CATALOGUE_SEED.filter((i) => i.needsPlace).length
  return `${updates}
-- Abort (and roll the whole migration back) if the table has drifted from the seed.
do $$
begin
  if (select count(*) from bestie.catalogue_items where slug = any(${slugs})) <> ${CATALOGUE_SEED.length} then
    raise exception 'catalogue shape: expected ${CATALOGUE_SEED.length} seed items, found a different number';
  end if;
  if (select count(*) from bestie.catalogue_items where needs_place) <> ${needing} then
    raise exception 'catalogue shape: expected ${needing} items needing a place, found a different number';
  end if;
end $$;
`
}
