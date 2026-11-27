/** Paths served by the Wellness Bestie marketing site (everything else is the podcast app). */
export const WELLNESS_PATHS = ['/', '/plan', '/plan/inputs', '/plan/day', '/join', '/membership', '/bestie', '/pilot', '/about', '/privacy', '/shop', '/podcast', '/community', '/profile'];
export const isWellnessPath = (p: string) => WELLNESS_PATHS.includes(p.replace(/\/+$/, '') || '/');
