export interface GroceryItem {
  name: string;
  benefit: string;
}

export interface GroceryCategories {
  proteins: GroceryItem[];
  vegetables: GroceryItem[];
  pantry: GroceryItem[];
  snacks: GroceryItem[];
}

export interface Meal {
  name: string;
  emoji: string;
  time: string;
  type: string;
  ingredients: string[];
  steps: string[];
}

export interface Plan {
  headline: string;
  subtitle: string;
  grocery: GroceryCategories;
  meals: Meal[];
}

export type GoalKey = 'gut_health' | 'glowing_skin' | 'hormone_balance' | 'energy_boost' | 'weight_balance';

export interface GoalMeta {
  label: string;
  emoji: string;
  color: string;
  desc: string;
}

export const GOAL_META: Record<GoalKey, GoalMeta> = {
  gut_health:      { label: 'Gut Health',      emoji: '', color: '#6F4A32', desc: 'Reduce bloating, support your microbiome, feel lighter' },
  glowing_skin:    { label: 'Glowing Skin',    emoji: '', color: '#A0714F', desc: 'Nourish from within for clear, radiant skin all week' },
  hormone_balance: { label: 'Hormone Balance', emoji: '', color: '#7E4F45', desc: 'Stabilise mood, energy, and your cycle with food' },
  energy_boost:    { label: 'Energy Boost',    emoji: '', color: '#B3844F', desc: 'Ditch the 3pm crash and feel steady all day' },
  weight_balance:  { label: 'Weight Balance',  emoji: '', color: '#5A3D2B', desc: 'Eat satisfyingly while supporting a healthy metabolism' },
};

export const GROCERY_CATEGORY_LABELS: Record<keyof GroceryCategories, string> = {
  proteins:   'Proteins',
  vegetables: 'Vegetables & Greens',
  pantry:     'Pantry & Grains',
  snacks:     'Snacks & Extras',
};

// ── Personalization + persistence types ─────────────────────────────────────

export type DietPreference = 'omnivore' | 'vegetarian' | 'vegan' | 'pescatarian';

export interface NourishQuiz {
  diet: DietPreference;
  /** lowercase ingredient keywords to avoid, e.g. ['dairy', 'nuts'] */
  exclusions: string[];
  servings: number;
  maxCookMinutes: number;
}

/** key = groceryItemId(category, name) → checked */
export interface GroceryCheckState {
  [itemId: string]: boolean;
}

export interface NourishState {
  version: 1;
  goal: GoalKey;
  /** ISO week this plan was generated for, e.g. "2026-W29" */
  isoWeek: string;
  quiz: NourishQuiz | null;
  checklist: GroceryCheckState;
  streakCount: number;
  lastEngagedWeek: string;
  createdAt: string;
  updatedAt: string;
}

export interface FavoriteMeal {
  mealId: string;
  goal: GoalKey;
  /** denormalized snapshot so the Saved view needs no plan lookup */
  meal: Meal;
  savedAt: string;
}

export const DIET_LABELS: Record<DietPreference, string> = {
  omnivore:    'Everything',
  vegetarian:  'Vegetarian',
  vegan:       'Vegan',
  pescatarian: 'Pescatarian',
};

/** Common allergens/exclusions offered in the intake quiz. */
export const EXCLUSION_OPTIONS = ['dairy', 'gluten', 'nuts', 'eggs', 'soy', 'shellfish'] as const;

export const COOK_TIME_OPTIONS = [10, 20, 30] as const;

// ── Stable ids ──────────────────────────────────────────────────────────────

export function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function groceryItemId(category: keyof GroceryCategories, name: string): string {
  return `${category}:${slug(name)}`;
}

export function mealId(name: string): string {
  return slug(name);
}

// ── ISO-8601 week helper (Thursday rule) ────────────────────────────────────

/**
 * Returns the ISO week string for a date, e.g. "2026-W29".
 * Uses the ISO year (not the calendar year) so W52/W53 → W01 boundaries are correct.
 */
export function isoWeekOf(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Shift to the Thursday of the current ISO week — its calendar year is the ISO year.
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

/** True when `candidate` is exactly the ISO week before `current`. */
export function isPreviousIsoWeek(candidate: string, current: string): boolean {
  if (!candidate || !current) return false;
  const prev = isoWeekOf(new Date(Date.now() - 7 * 86400000));
  return candidate === prev && current !== candidate;
}

// ── Quiz-driven adaptation (display-only — PLANS are never mutated) ─────────

/**
 * Keyword sets used to infer whether an item suits a diet. Deliberately small
 * and conservative: we would rather show an item than wrongly hide it.
 */
const FISH_KEYWORDS = ['salmon', 'tuna', 'sardine', 'mackerel', 'cod', 'prawn', 'shrimp', 'anchov'];
const MEAT_KEYWORDS = ['chicken', 'beef', 'lamb', 'pork', 'turkey', 'bacon', 'mince'];
const ANIMAL_PRODUCT_KEYWORDS = ['egg', 'yoghurt', 'yogurt', 'kefir', 'cheese', 'milk', 'butter', 'honey', 'ghee'];

/** Keywords per exclusion, so "dairy" also catches yoghurt/cheese/milk. */
const EXCLUSION_KEYWORDS: Record<string, string[]> = {
  dairy:     ['dairy', 'yoghurt', 'yogurt', 'kefir', 'cheese', 'milk', 'butter', 'ghee', 'cream'],
  gluten:    ['gluten', 'wheat', 'bread', 'pasta', 'couscous', 'barley', 'rye'],
  nuts:      ['nut', 'almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut'],
  eggs:      ['egg'],
  soy:       ['soy', 'tofu', 'tempeh', 'edamame', 'miso'],
  shellfish: ['prawn', 'shrimp', 'crab', 'lobster', 'mussel', 'scallop'],
};

function keywordsFor(exclusion: string): string[] {
  return EXCLUSION_KEYWORDS[exclusion.toLowerCase()] ?? [exclusion.toLowerCase()];
}

function matchesAny(haystack: string, keywords: string[]): boolean {
  const text = haystack.toLowerCase();
  return keywords.some((k) => text.includes(k));
}

function disallowedForDiet(diet: DietPreference): string[] {
  switch (diet) {
    case 'vegan':       return [...MEAT_KEYWORDS, ...FISH_KEYWORDS, ...ANIMAL_PRODUCT_KEYWORDS];
    case 'vegetarian':  return [...MEAT_KEYWORDS, ...FISH_KEYWORDS];
    case 'pescatarian': return MEAT_KEYWORDS;
    default:            return [];
  }
}

/** Parse the leading integer out of a meal time like "15 min". */
export function mealMinutes(time: string): number {
  const m = time.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

export interface AdaptedPlan extends Plan {
  /** true when the quiz actually removed something */
  adapted: boolean;
  /** sections that would have emptied and were therefore left intact */
  keptIntact: string[];
}

/**
 * Applies quiz preferences to a plan at render time.
 *
 * Filtering is display-only and never empties a section: if every item in a
 * category (or every meal) would be removed we keep the originals and record
 * the section in `keptIntact` so the UI can explain why.
 */
export function adaptPlan(plan: Plan, quiz: NourishQuiz | null): AdaptedPlan {
  if (!quiz) return { ...plan, adapted: false, keptIntact: [] };

  const banned = [
    ...quiz.exclusions.flatMap(keywordsFor),
    ...disallowedForDiet(quiz.diet),
  ];

  const keptIntact: string[] = [];
  let adapted = false;

  const grocery = {} as GroceryCategories;
  (Object.keys(plan.grocery) as (keyof GroceryCategories)[]).forEach((cat) => {
    const kept = banned.length
      ? plan.grocery[cat].filter((item) => !matchesAny(item.name, banned))
      : plan.grocery[cat];

    if (kept.length === 0) {
      grocery[cat] = plan.grocery[cat];
      keptIntact.push(GROCERY_CATEGORY_LABELS[cat]);
    } else {
      if (kept.length !== plan.grocery[cat].length) adapted = true;
      grocery[cat] = kept;
    }
  });

  const meals = plan.meals.filter((meal) => {
    const text = `${meal.name} ${meal.ingredients.join(' ')}`;
    if (banned.length && matchesAny(text, banned)) return false;
    if (quiz.maxCookMinutes > 0 && mealMinutes(meal.time) > quiz.maxCookMinutes) return false;
    return true;
  });

  let finalMeals = meals;
  if (meals.length === 0) {
    finalMeals = plan.meals;
    keptIntact.push('Meals');
  } else if (meals.length !== plan.meals.length) {
    adapted = true;
  }

  const servingsNote = quiz.servings > 1 ? ` · for ${quiz.servings}` : '';

  return {
    ...plan,
    subtitle: `${plan.subtitle}${servingsNote}`,
    grocery,
    meals: finalMeals,
    adapted,
    keptIntact,
  };
}

/** Total number of grocery items across all categories. */
export function countGroceryItems(grocery: GroceryCategories): number {
  return (Object.keys(grocery) as (keyof GroceryCategories)[])
    .reduce((sum, cat) => sum + grocery[cat].length, 0);
}

// ── Goal → episode matching keywords ────────────────────────────────────────

export const GOAL_EPISODE_KEYWORDS: Record<GoalKey, string[]> = {
  gut_health:      ['gut', 'bloat', 'microbiome', 'digest', 'stomach'],
  glowing_skin:    ['skin', 'glow', 'beauty', 'acne', 'collagen'],
  hormone_balance: ['hormone', 'cycle', 'period', 'pms', 'fertility', 'menopause'],
  energy_boost:    ['energy', 'fatigue', 'tired', 'sleep', 'burnout'],
  weight_balance:  ['weight', 'metabolism', 'fitness', 'body', 'exercise'],
};

export const PLANS: Record<GoalKey, Plan> = {
  gut_health: {
    headline: 'Nourish your gut, feel lighter all week',
    subtitle: '12 ingredients · 4 meals · under 20 min each',
    grocery: {
      proteins: [
        { name: 'Greek Yoghurt (full-fat, plain)', benefit: 'Live cultures rebuild gut flora and ease bloating' },
        { name: 'Tempeh', benefit: 'Fermented soy feeds beneficial bacteria naturally' },
        { name: 'Eggs', benefit: 'Gentle complete protein, easy on the digestive system' },
      ],
      vegetables: [
        { name: 'Spinach', benefit: 'Magnesium supports smooth digestion and gut motility' },
        { name: 'Courgette', benefit: 'Soft fibre that soothes without irritating the gut' },
        { name: 'Fresh Ginger', benefit: 'Calms nausea and reduces gut inflammation fast' },
        { name: 'Garlic', benefit: 'Prebiotic that feeds the good bacteria in your gut' },
      ],
      pantry: [
        { name: 'Rolled Oats', benefit: 'Beta-glucan fibre feeds microbiome and regulates digestion' },
        { name: 'Brown Rice', benefit: 'Gentle whole grain, easy to digest and very filling' },
        { name: 'Apple Cider Vinegar', benefit: 'Supports healthy stomach acid and gut pH balance' },
      ],
      snacks: [
        { name: 'Kefir (plain)', benefit: 'One of the most potent probiotic foods available' },
        { name: 'Flaxseeds', benefit: 'Soluble fibre keeps things moving without irritation' },
      ],
    },
    meals: [
      {
        name: 'Probiotic Oat Bowl', emoji: '🍣', time: '10 min', type: 'Breakfast',
        ingredients: ['Rolled oats', 'Greek yoghurt', 'Flaxseeds', 'Fresh ginger'],
        steps: [
          'Cook oats with water for 5 minutes, stirring throughout.',
          'Grate a small piece of fresh ginger directly into the bowl.',
          'Top generously with Greek yoghurt and a sprinkle of flaxseeds.',
          'Drizzle with a little apple cider vinegar for gut support.',
        ],
      },
      {
        name: 'Tempeh & Courgette Stir-fry', emoji: '🥘', time: '15 min', type: 'Lunch',
        ingredients: ['Tempeh', 'Courgette', 'Garlic', 'Spinach', 'Brown rice'],
        steps: [
          'Start brown rice cooking per packet while you prep.',
          'Slice tempeh and courgette, sauté with garlic for 8 minutes.',
          'Add spinach in the last 2 minutes, toss until wilted.',
          'Serve over brown rice and season with salt and lemon.',
        ],
      },
      {
        name: 'Ginger Egg Scramble', emoji: '🍳', time: '10 min', type: 'Dinner',
        ingredients: ['Eggs', 'Spinach', 'Fresh ginger', 'Garlic', 'Courgette'],
        steps: [
          'Sauté sliced courgette and garlic in a pan for 3 minutes.',
          'Add grated ginger and spinach, stir for 1 minute.',
          'Whisk 2 eggs and pour over the vegetables.',
          'Scramble gently on low heat until just set. Season and serve.',
        ],
      },
      {
        name: 'Kefir Smoothie', emoji: '🥛', time: '3 min', type: 'Snack',
        ingredients: ['Kefir', 'Flaxseeds', 'Rolled oats', 'Fresh ginger'],
        steps: [
          'Add kefir, a small handful of oats and flaxseeds to a blender.',
          'Add a small piece of fresh ginger for flavour and gut support.',
          'Blend for 30 seconds until completely smooth.',
          'Drink immediately for maximum probiotic benefit.',
        ],
      },
    ],
  },

  glowing_skin: {
    headline: 'Feed your skin from the inside out',
    subtitle: '12 ingredients · 4 meals · under 20 min each',
    grocery: {
      proteins: [
        { name: 'Wild Salmon', benefit: 'Omega-3s reduce inflammation and keep skin dewy' },
        { name: 'Eggs', benefit: 'Biotin and collagen-building amino acids in every bite' },
        { name: 'Chickpeas', benefit: 'Zinc helps heal skin and reduce breakouts naturally' },
      ],
      vegetables: [
        { name: 'Sweet Potato', benefit: 'Beta-carotene converts to vitamin A for cell renewal' },
        { name: 'Cucumber', benefit: 'Silica-rich hydration that plumps skin from within' },
        { name: 'Kale', benefit: 'Vitamin C boosts collagen production naturally' },
        { name: 'Avocado', benefit: 'Healthy fats lock moisture deep into skin cells' },
      ],
      pantry: [
        { name: 'Pumpkin Seeds', benefit: 'Zinc and vitamin E for clear, even-toned skin' },
        { name: 'Green Tea', benefit: 'EGCG antioxidants protect skin from daily damage' },
        { name: 'Extra Virgin Olive Oil', benefit: 'Polyphenols fight the free radicals that age skin' },
      ],
      snacks: [
        { name: 'Walnuts', benefit: 'Highest plant source of skin-loving omega-3 fatty acids' },
        { name: 'Blueberries', benefit: 'Anthocyanins protect your collagen from breaking down' },
      ],
    },
    meals: [
      {
        name: 'Glow Egg & Avocado Toast', emoji: '🥑', time: '10 min', type: 'Breakfast',
        ingredients: ['Eggs', 'Avocado', 'Kale', 'Pumpkin seeds', 'Olive oil'],
        steps: [
          'Lightly sauté kale in olive oil for 2 minutes until bright.',
          'Poach or fry eggs to your liking meanwhile.',
          'Smash avocado onto wholegrain toast and layer with kale and eggs.',
          'Finish with a scattering of pumpkin seeds for zinc.',
        ],
      },
      {
        name: 'Sweet Potato & Chickpea Bowl', emoji: '🍠', time: '18 min', type: 'Lunch',
        ingredients: ['Sweet potato', 'Chickpeas', 'Kale', 'Olive oil', 'Pumpkin seeds'],
        steps: [
          'Cube sweet potato and roast in olive oil at 200°C for 15 minutes.',
          'Massage kale with a tiny drop of olive oil until it softens.',
          'Combine roasted sweet potato and chickpeas over the kale.',
          'Top with pumpkin seeds and a squeeze of fresh lemon.',
        ],
      },
      {
        name: 'Seared Salmon & Cucumber Salad', emoji: '🐟', time: '15 min', type: 'Dinner',
        ingredients: ['Wild salmon', 'Cucumber', 'Avocado', 'Olive oil', 'Kale'],
        steps: [
          'Season salmon with salt, sear in olive oil 4 minutes each side.',
          'Slice cucumber and avocado into thin elegant pieces.',
          'Arrange kale, cucumber, and avocado on a wide plate.',
          'Place salmon on top and finish with a drizzle of olive oil.',
        ],
      },
      {
        name: 'Blueberry & Walnut Bowl', emoji: '🫐', time: '2 min', type: 'Snack',
        ingredients: ['Blueberries', 'Walnuts', 'Pumpkin seeds'],
        steps: [
          'Add a generous handful of blueberries to a small bowl.',
          'Top with walnuts and pumpkin seeds.',
          'Pair with a cup of green tea for a full antioxidant hit.',
        ],
      },
    ],
  },

  hormone_balance: {
    headline: 'Eat to feel balanced, clear, and calm',
    subtitle: '12 ingredients · 4 meals · under 20 min each',
    grocery: {
      proteins: [
        { name: 'Lentils', benefit: 'Plant protein stabilises blood sugar and supports progesterone' },
        { name: 'Chicken Breast', benefit: 'Lean protein reduces cortisol spikes between meals' },
        { name: 'Pumpkin Seeds', benefit: 'Zinc supports healthy oestrogen metabolism in the body' },
      ],
      vegetables: [
        { name: 'Broccoli', benefit: 'DIM compound helps your body clear excess oestrogen' },
        { name: 'Spinach', benefit: 'Iron and magnesium support cycle regularity and mood' },
        { name: 'Beetroot', benefit: 'Supports liver detox pathways for clean hormone clearance' },
        { name: 'Sweet Potato', benefit: 'Complex carbs boost serotonin and lower cortisol naturally' },
      ],
      pantry: [
        { name: 'Ground Flaxseed', benefit: 'Lignans gently bind excess oestrogen to restore balance' },
        { name: 'Quinoa', benefit: 'Complete protein with B6 to support hormone production' },
        { name: 'Extra Virgin Olive Oil', benefit: 'Monounsaturated fats are the building blocks of hormones' },
      ],
      snacks: [
        { name: 'Dark Chocolate (85%+)', benefit: 'Magnesium eases PMS symptoms and calms stress hormones' },
        { name: 'Brazil Nuts', benefit: 'Just two a day gives your thyroid all the selenium it needs' },
      ],
    },
    meals: [
      {
        name: 'Flax & Sweet Potato Scramble', emoji: '🍠', time: '12 min', type: 'Breakfast',
        ingredients: ['Sweet potato', 'Ground flaxseed', 'Spinach', 'Eggs', 'Olive oil'],
        steps: [
          'Dice sweet potato small and pan-fry in olive oil for 8 minutes.',
          'Add spinach and cook until just wilted.',
          'Create a small well, crack in 2 eggs and scramble gently.',
          'Plate and finish with a sprinkle of ground flaxseed.',
        ],
      },
      {
        name: 'Lentil & Broccoli Quinoa Bowl', emoji: '🥗', time: '18 min', type: 'Lunch',
        ingredients: ['Lentils', 'Broccoli', 'Quinoa', 'Olive oil', 'Spinach'],
        steps: [
          'Cook quinoa per packet instructions (around 12 minutes).',
          'Steam broccoli or sauté in olive oil for 5 minutes.',
          'Warm lentils in a pan with a pinch of cumin and salt.',
          'Layer quinoa, broccoli, lentils and a handful of fresh spinach.',
        ],
      },
      {
        name: 'Roasted Chicken & Beetroot', emoji: '🍗', time: '20 min', type: 'Dinner',
        ingredients: ['Chicken breast', 'Beetroot', 'Spinach', 'Olive oil', 'Quinoa'],
        steps: [
          'Season chicken and pan-cook in olive oil, 7 minutes each side.',
          'Thinly slice beetroot and sauté in the same pan for 3 minutes.',
          'Rest chicken for 2 minutes before slicing.',
          'Serve over quinoa with beetroot and a bed of fresh spinach.',
        ],
      },
      {
        name: 'Dark Chocolate & Nut Plate', emoji: '🍫', time: '1 min', type: 'Snack',
        ingredients: ['Dark chocolate (85%+)', 'Brazil nuts', 'Pumpkin seeds'],
        steps: [
          'Break off one or two squares of dark chocolate.',
          'Add 2 brazil nuts and a small spoon of pumpkin seeds.',
          'Eat slowly — this is quality nourishment, not just a snack.',
        ],
      },
    ],
  },

  energy_boost: {
    headline: 'Steady energy from morning to night',
    subtitle: '12 ingredients · 4 meals · under 20 min each',
    grocery: {
      proteins: [
        { name: 'Eggs', benefit: 'Complete protein sustains energy for hours without spiking blood sugar' },
        { name: 'Canned Tuna', benefit: 'B12 and lean protein for sharp, sustained mental focus' },
        { name: 'Edamame', benefit: 'Plant protein paired with slow-release complex carbohydrates' },
      ],
      vegetables: [
        { name: 'Kale', benefit: 'Iron and B vitamins help your body convert food to energy' },
        { name: 'Asparagus', benefit: 'Folate and B vitamins support energy production at cell level' },
        { name: 'Spinach', benefit: 'Low iron is the number one cause of fatigue in women' },
        { name: 'Red Bell Pepper', benefit: 'Vitamin C doubles the iron you absorb from plant foods' },
      ],
      pantry: [
        { name: 'Rolled Oats', benefit: 'Beta-glucan releases glucose slowly for hours of steady energy' },
        { name: 'Brown Rice', benefit: 'Complex carbs fuel your brain without the mid-afternoon crash' },
        { name: 'Chia Seeds', benefit: 'Omega-3s support brain energy and clear away mental fog' },
      ],
      snacks: [
        { name: 'Banana', benefit: 'Natural sugars plus potassium for fast, clean energy release' },
        { name: 'Almonds', benefit: 'Magnesium and healthy fats prevent the dreaded afternoon slump' },
      ],
    },
    meals: [
      {
        name: 'Overnight Oats & Banana', emoji: '🌙', time: '5 min', type: 'Breakfast',
        ingredients: ['Rolled oats', 'Chia seeds', 'Banana', 'Almonds'],
        steps: [
          'Combine oats, chia seeds and your choice of milk in a jar the night before.',
          'Stir well, cover and refrigerate overnight.',
          'In the morning, top with sliced banana and crushed almonds.',
          'No cooking, no waiting — just grab and go.',
        ],
      },
      {
        name: 'Tuna & Pepper Rice Bowl', emoji: '🐟', time: '12 min', type: 'Lunch',
        ingredients: ['Canned tuna', 'Red bell pepper', 'Spinach', 'Brown rice', 'Edamame'],
        steps: [
          'Cook brown rice or use a pre-cooked pouch to save time.',
          'Slice bell pepper and combine with drained tuna and edamame.',
          'Layer over rice with a large handful of fresh spinach.',
          'Season with lemon juice and a drizzle of olive oil.',
        ],
      },
      {
        name: 'Asparagus & Egg Stir-fry', emoji: '🍳', time: '15 min', type: 'Dinner',
        ingredients: ['Eggs', 'Asparagus', 'Kale', 'Red bell pepper', 'Brown rice'],
        steps: [
          'Trim asparagus, sauté with sliced bell pepper for 4 minutes.',
          'Add kale and toss until just wilted, about 2 minutes more.',
          'Push vegetables aside, scramble 2 eggs in the same pan.',
          'Combine everything and serve over brown rice.',
        ],
      },
      {
        name: 'Banana & Almond Boost', emoji: '🍌', time: '2 min', type: 'Snack',
        ingredients: ['Banana', 'Almonds', 'Chia seeds'],
        steps: [
          'Slice a banana into a small bowl.',
          'Top with a handful of almonds and a pinch of chia seeds.',
          'Eat about 30 minutes before you need your peak energy or focus.',
        ],
      },
    ],
  },

  weight_balance: {
    headline: 'Eat well, feel full, find your balance',
    subtitle: '12 ingredients · 4 meals · under 20 min each',
    grocery: {
      proteins: [
        { name: 'Chicken Breast', benefit: 'High-satiety protein that keeps hunger away for hours' },
        { name: 'Greek Yoghurt (plain)', benefit: 'Protein and probiotics together support healthy metabolism' },
        { name: 'Black Beans', benefit: 'Fibre and protein combination keeps you genuinely satisfied' },
      ],
      vegetables: [
        { name: 'Broccoli', benefit: 'High volume, low calorie — fills your plate and your stomach' },
        { name: 'Spinach', benefit: 'Thylakoids slow fat digestion and naturally reduce cravings' },
        { name: 'Cucumber', benefit: 'High water content adds bulk to meals with almost no calories' },
        { name: 'Courgette', benefit: 'Bulks out every meal without adding significant calories' },
      ],
      pantry: [
        { name: 'Quinoa', benefit: 'Complete protein grain that satisfies more deeply than white rice' },
        { name: 'Rolled Oats', benefit: 'Beta-glucan fibre keeps hunger hormones balanced all morning' },
        { name: 'Apple Cider Vinegar', benefit: 'Helps regulate blood sugar and reduce fat storage signals' },
      ],
      snacks: [
        { name: 'Green Apple', benefit: 'Pectin fibre slows digestion and extends your feeling of fullness' },
        { name: 'Almonds', benefit: 'The perfect portion of fat and protein for real, lasting satiety' },
      ],
    },
    meals: [
      {
        name: 'Yoghurt Oat Parfait', emoji: '🍣', time: '5 min', type: 'Breakfast',
        ingredients: ['Rolled oats', 'Greek yoghurt', 'Green apple', 'Almonds'],
        steps: [
          'Layer rolled oats and Greek yoghurt in a glass or wide bowl.',
          'Dice the green apple finely and scatter over the top.',
          'Finish with a small handful of almonds for crunch and protein.',
          'Add a drizzle of honey or cinnamon if you like a little sweetness.',
        ],
      },
      {
        name: 'Black Bean & Courgette Quinoa', emoji: '🥗', time: '18 min', type: 'Lunch',
        ingredients: ['Black beans', 'Courgette', 'Quinoa', 'Spinach', 'Cucumber'],
        steps: [
          'Cook quinoa per packet instructions (about 12 minutes).',
          'Sauté diced courgette in olive oil with cumin for 5 minutes.',
          'Warm black beans in a small pan with salt and paprika.',
          'Serve over quinoa with fresh spinach and sliced cucumber.',
        ],
      },
      {
        name: 'Grilled Chicken & Broccoli Bowl', emoji: '🍗', time: '18 min', type: 'Dinner',
        ingredients: ['Chicken breast', 'Broccoli', 'Spinach', 'Courgette', 'Quinoa'],
        steps: [
          'Grill or pan-cook seasoned chicken for 7 minutes each side.',
          'Steam broccoli and sauté courgette in the same pan.',
          'Rest the chicken for 2 minutes, then slice on the diagonal.',
          'Serve over quinoa with broccoli, courgette and fresh spinach.',
        ],
      },
      {
        name: 'Apple & Almond Snack', emoji: '🍏', time: '1 min', type: 'Snack',
        ingredients: ['Green apple', 'Almonds', 'Greek yoghurt'],
        steps: [
          'Slice a crisp green apple into wedges.',
          'Serve alongside exactly 12 almonds — the satiety sweet spot.',
          'Add a small spoonful of Greek yoghurt for extra protein.',
        ],
      },
    ],
  },
};
