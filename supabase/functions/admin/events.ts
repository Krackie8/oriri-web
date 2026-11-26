/**
 * The Events page (#100 piece 3, DEC-020): Stepsisters meet-ups and recaps, and partner events,
 * kept in the same KV entries the Member side reads (wellness:moment:<id>, wellness:event:<id>),
 * and their bookings (rsvp:<ref>:<email>). Pure and Deno-free so vitest can import it under Node;
 * index.tsx builds the real deps.
 *
 * - Every write keeps only the known fields of its kind, checked here: real dates, HH:MM times,
 *   https links only (the Member pages render `link` as a link), photos only from our own bucket.
 * - Guests' details appear only in the bookings answer, never in the log or a log line.
 */

export type EventKind = 'moment' | 'event'
export const EVENT_KINDS: readonly EventKind[] = ['moment', 'event']
/** The Legacy list (src/app/utils/wellnessApi.ts EVENT_CATEGORIES), unchanged. */
export const EVENT_CATEGORIES = ['Movement', 'Mind', 'Food', 'Beauty', 'Workshop', 'Pop-up', 'Community'] as const

/** Exactly the KV value. */
export interface StoredEvent {
  id: string
  title: string
  date: string
  startTime?: string
  location?: string
  description?: string
  link?: string
  pinned: boolean
  createdAt: string
  updatedAt: string
  /** Stepsisters only. */
  type?: 'upcoming' | 'recap'
  photos?: string[]
  /** Partner events only. */
  category?: string
  image?: string
  partner?: string
}
export type EventFields = Omit<StoredEvent, 'id' | 'createdAt' | 'updatedAt'>

export const MAX_PHOTOS = 12
const LIMITS = { title: 120, location: 120, description: 1000, partner: 80, link: 500 }

export const isEventId = (s: string) => /^[A-Za-z0-9-]{6,64}$/.test(s)
/** The booking ref the Member function uses (rsvpEvent in server/index.tsx). */
export const refOf = (kind: EventKind, id: string) => `${kind === 'moment' ? 'm' : 'e'}-${id}`
export const isEventKind = (s: unknown): s is EventKind => s === 'moment' || s === 'event'

const TOO_LONG = "That's longer than it can be."
class Problem extends Error {}
const refuse = (problem: string): never => { throw new Problem(problem) }

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
function capped(v: unknown, max: number): string {
  const s = str(v)
  if (s.length > max) refuse(TOO_LONG)
  return s
}

function realDate(v: unknown): string {
  const s = str(v)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return refuse('Pick a date.')
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) refuse('Pick a date.')
  return s
}

function httpsLink(v: unknown): string {
  const s = str(v)
  if (!s) return ''
  if (s.length > LIMITS.link) refuse(TOO_LONG)
  let url: URL
  try { url = new URL(s) } catch { return refuse('Links must start with https://') }
  if (url.protocol !== 'https:' || !url.hostname || !s.toLowerCase().startsWith('https://')) refuse('Links must start with https://')
  return s
}

/** A public URL in our bucket, with a plain file path after it: no `..`, query or fragment. */
function ourPhoto(v: unknown, base: string): string {
  const s = str(v)
  const rest = s.startsWith(base) ? s.slice(base.length) : ''
  if (!rest || !/^[A-Za-z0-9._\/-]+$/.test(rest) || rest.split('/').some((p) => p === '..' || p === '.' || p === '')) {
    refuse('Upload photos here, then pick them.')
  }
  return s
}

/** Only the known fields of `kind`, checked; or the one problem to show her. */
export function cleanEvent(kind: EventKind, body: unknown, photoBase: string):
  { ok: true; fields: EventFields } | { ok: false; problem: string } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  try {
    const title = capped(b.title, LIMITS.title)
    if (!title) refuse('Give it a title.')
    const date = realDate(b.date)
    const startTime = str(b.startTime)
    if (startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) refuse("That time doesn't look right.")
    const fields: EventFields = { title, date, pinned: b.pinned === true }
    if (startTime) fields.startTime = startTime
    const location = capped(b.location, LIMITS.location)
    if (location) fields.location = location
    const description = capped(b.description, LIMITS.description)
    if (description) fields.description = description
    const link = httpsLink(b.link)
    if (link) fields.link = link

    if (kind === 'moment') {
      const type = b.type === undefined || b.type === '' ? 'upcoming' : b.type
      if (type !== 'upcoming' && type !== 'recap') refuse('Pick meet-up or recap.')
      fields.type = type as 'upcoming' | 'recap'
      const photos = Array.isArray(b.photos) ? b.photos : []
      if (photos.length > MAX_PHOTOS) refuse(`Up to ${MAX_PHOTOS} photos.`)
      fields.photos = photos.map((p) => ourPhoto(p, photoBase))
    } else {
      const category = b.category === undefined || b.category === '' ? 'Movement' : b.category
      if (!(EVENT_CATEGORIES as readonly unknown[]).includes(category)) refuse('Pick a category.')
      fields.category = category as string
      if (str(b.image)) fields.image = ourPhoto(b.image, photoBase)
      const partner = capped(b.partner, LIMITS.partner)
      if (partner) fields.partner = partner
    }
    return { ok: true, fields }
  } catch (e) {
    if (e instanceof Problem) return { ok: false, problem: e.message }
    throw e
  }
}
