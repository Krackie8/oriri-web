/**
 * Where a magic link or Google/Apple sign-in sends her back to.
 * Picked from a fixed list, never from whatever origin the page claims, so the
 * site can't be made to mint a sign-in link to someone else's domain.
 * Each of these must also be on Supabase Auth's Redirect URLs allow-list.
 */
const ALLOWED_ORIGINS = ['https://www.oriri.me', 'https://oriri.me', 'https://new.oriri.me', 'http://localhost:8443']
const FALLBACK = 'https://www.oriri.me'

export const JOIN_PATH = '/join'

export function joinRedirectUrl(origin: string): string {
  return `${ALLOWED_ORIGINS.includes(origin) ? origin : FALLBACK}${JOIN_PATH}`
}
