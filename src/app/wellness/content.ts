/** Pillars: Move (workout + recovery), Meal, Meet up, plus Mindset (podcasts). */
export type PillarKey = 'move' | 'meal' | 'meet_up' | 'mindset';

export const PILLARS: {
  key: PillarKey;
  name: string;
  covers: string;
  real: string;
  digital: string;
  inCity: string;
  withBestie: string;
  photo: string;
  alt: string;
}[] = [
  {
    key: 'move',
    name: 'Move',
    covers: 'Workout and recovery',
    real: 'Studio class and sauna',
    digital: '20-minute flow and a wind-down at home',
    inCity: 'The reformer class in Al Quoz, then the sauna and cold plunge.',
    withBestie: 'A guided workout matched to your energy, plus a stretch or breathwork to recover.',
    photo: '1717500252297-b09508db7ceb',
    alt: 'A calm, sunlit movement studio with equipment and a plant',
  },
  {
    key: 'meal',
    name: 'Meal',
    covers: 'Healthy places and recipes',
    real: 'Wellness café brunch',
    digital: 'a 15-minute recipe from your fridge',
    inCity: 'The best healthy cafés and meal spots near you, picked for your budget.',
    withBestie: 'Simple recipes built from what you already have at home.',
    photo: '1501959915551-4e8d30928317',
    alt: 'A yoghurt and fruit bowl beside a cup of coffee',
  },
  {
    key: 'meet_up',
    name: 'Meet up',
    covers: 'Connection',
    real: 'Sunrise run club',
    digital: 'a circle of women who get it',
    inCity: 'Run clubs, coffee walks and classes with women near you.',
    withBestie: 'A small online circle, a nudge to reach out, and meet-ups in your area.',
    photo: '1542338332-76971ae8c292',
    alt: 'Two cups of coffee on a table, ready to share',
  },
  {
    key: 'mindset',
    name: 'Mindset',
    covers: 'Podcasts and reflection',
    real: 'Tea for Two episode',
    digital: 'a podcast for your walk',
    inCity: 'Our Tea for Two conversations about life, growth and wellness in the UAE.',
    withBestie: 'Episodes and shows we love, matched to how you want to feel.',
    photo: '1588338949261-659fc6fed20b',
    alt: 'A candle and a ceramic mug beside an open notebook',
  },
];

export const DUBAI_AREAS = [
  'Al Barsha',
  'Al Furjan',
  'Al Quoz',
  'Al Sufouh',
  'Al Wasl / City Walk',
  'Arabian Ranches',
  'Bluewaters',
  'Bur Dubai',
  'Business Bay',
  'DAMAC Hills',
  'Deira',
  'DIFC',
  'Discovery Gardens',
  'Downtown Dubai',
  'Dubai Creek Harbour',
  'Dubai Hills Estate',
  'Dubai Marina',
  'Dubai Silicon Oasis',
  'Dubai South',
  'Dubai Sports City',
  'Emirates Hills',
  'Jumeirah',
  'Jumeirah Beach Residence (JBR)',
  'Jumeirah Lake Towers (JLT)',
  'Jumeirah Village Circle (JVC)',
  'Jumeirah Village Triangle (JVT)',
  'Karama',
  'Meydan',
  'Mirdif',
  'Motor City',
  'Palm Jumeirah',
  'The Greens & The Views',
  'The Springs / Meadows / Lakes',
  'Town Square',
  'Umm Suqeim',
  'Somewhere else',
];

export const AGE_GROUPS = ['20s', '30s', '40s', '50s+'];

export const WORKOUTS = [
  'Pilates',
  'Reformer',
  'Yoga',
  'Hot yoga',
  'Strength',
  'HIIT',
  'Running',
  'Walking',
  'Barre',
  'Spin',
  'Boxing',
  'Swimming',
  'Padel',
  'Dance',
  'Hiking',
  'Still finding mine',
];

/** Waitlist profile: simple tags so besties can match on just one shared interest. */
export const MEAL_PREFS = ['Vegan', 'Vegetarian', 'High protein', 'Gluten-free', 'Dairy-free', 'Café hopping', 'Brunch', 'Home cooking', 'Eat everything'];
export const MINDSET_PREFS = ['Women in business', 'Self-development', 'Relationships', 'Health & body', 'Money', 'Faith & spirituality', 'Books', 'Podcasts'];

export const HEARD_FROM = ['Instagram', 'WhatsApp', 'Friend', 'Other'];
