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

import type { Context } from 'hono'
import type { AdminUser } from './app.ts'
import { thisWeeksMeetUp, type MeetUpRow } from '../server/morning.ts'

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

/* ── The list: the Meet up mark and bookings ─────────────────────────────── */

export interface Booking { ref: string; name: string; email: string; phone: string; guests: number; bookedAt: string }
export interface EventListItem extends StoredEvent {
  kind: EventKind
  bookings: number
  spots: number
  /** Bookings made since she last opened Events. */
  newBookings: number
  /** The one event the Member Meet up card shows this week. */
  inMeetUp: boolean
}
export interface EventsList {
  upcoming: EventListItem[]
  past: EventListItem[]
  tile: { comingUp: number; bookings: number; fresh: boolean }
}

/** How far ahead the Meet up card and the tile pill look: today and the 6 days after (thisWeeksMeetUp). */
const WEEK_DAYS = 6
const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * The id of the event the Meet up card shows this week, or null. It asks the Member function's own
 * rule (thisWeeksMeetUp, server/morning.ts) rather than copying it: each row goes in with its id as
 * its title, so the title that comes back names the pick. A test pins this to the real call.
 */
export function meetUpPickId(moments: StoredEvent[], events: StoredEvent[], today: string): string | null {
  const rows: MeetUpRow[] = [
    ...moments.map((m) => ({ ...m, title: m.title ? m.id : '', kind: 'moment' as const })),
    ...events.map((e) => ({ ...e, title: e.title ? e.id : '', kind: 'event' as const })),
  ]
  return thisWeeksMeetUp(rows, today)?.title ?? null
}

/** The booking records by ref, newest first. Rows without a ref and an email are dropped. */
export function groupBookings(rows: unknown[]): Map<string, Booking[]> {
  const out = new Map<string, Booking[]>()
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue
    const x = r as Record<string, unknown>
    if (typeof x.ref !== 'string' || !x.ref || typeof x.email !== 'string' || !x.email) continue
    const b: Booking = {
      ref: x.ref, name: str(x.name), email: x.email, phone: str(x.phone),
      guests: Number.isFinite(Number(x.guests)) && Number(x.guests) > 0 ? Number(x.guests) : 1,
      bookedAt: str(x.bookedAt),
    }
    out.set(b.ref, [...(out.get(b.ref) ?? []), b])
  }
  for (const list of out.values()) list.sort((a, b) => b.bookedAt.localeCompare(a.bookedAt))
  return out
}

export function listEvents(i: { moments: StoredEvent[]; events: StoredEvent[]; rsvps: unknown[]; today: string; seenAt: string | null }): EventsList {
  const byRef = groupBookings(i.rsvps)
  const pick = meetUpPickId(i.moments, i.events, i.today)
  const item = (kind: EventKind) => (e: StoredEvent): EventListItem => {
    const bookings = byRef.get(refOf(kind, e.id)) ?? []
    return {
      ...e, kind,
      bookings: bookings.length,
      spots: bookings.reduce((t, b) => t + b.guests, 0),
      newBookings: bookings.filter((b) => !i.seenAt || b.bookedAt > i.seenAt).length,
      inMeetUp: e.id === pick,
    }
  }
  const all = [...i.moments.map(item('moment')), ...i.events.map(item('event'))]
  const upcoming = all.filter((e) => e.date >= i.today).sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? '').localeCompare(b.startTime ?? '') || a.id.localeCompare(b.id))
  const past = all.filter((e) => e.date < i.today).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
  const weekEnd = addDays(i.today, WEEK_DAYS)
  return {
    upcoming,
    past,
    tile: {
      comingUp: upcoming.length,
      bookings: upcoming.reduce((t, e) => t + e.bookings, 0),
      fresh: upcoming.some((e) => e.date <= weekEnd && e.newBookings > 0),
    },
  }
}

/* ── Routes ──────────────────────────────────────────────────────────────── */

export type PhotoType = 'image/jpeg' | 'image/png' | 'image/webp'

export interface EventsDeps {
  list(kind: EventKind): Promise<StoredEvent[]>
  get(kind: EventKind, id: string): Promise<StoredEvent | null>
  put(kind: EventKind, e: StoredEvent): Promise<void>
  remove(kind: EventKind, id: string): Promise<void>
  /** Booking records whose key starts with `prefix` ('rsvp:' or 'rsvp:<ref>:'). */
  rsvps(prefix: string): Promise<unknown[]>
  removeRsvps(keys: string[]): Promise<void>
  /** Stores the photo in the public wellness bucket under a generated name; returns its public URL. */
  upload(bytes: Uint8Array, type: PhotoType): Promise<string>
  /** Who did what to which event. Never a guest's details. */
  log(entry: { actor: string; kind: EventKind; id: string; action: 'create' | 'edit' | 'delete' | 'booking_removed' }): Promise<void>
  seenAt(userId: string): Promise<string | null>
  markSeen(userId: string, at: string): Promise<void>
  /** The public URL prefix of the wellness bucket: a photo must start with it. */
  photoBase: string
  now(): Date
}

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024
const dubaiDate = (d: Date) => new Date(d.getTime() + 4 * 3600_000).toISOString().slice(0, 10)
const bookingKey = (ref: string, email: string) => `rsvp:${ref}:${email.toLowerCase()}`
const failed = (c: Context, what: string, err: unknown) => {
  console.error(`admin/events: ${what} failed`, (err as { message?: string } | null)?.message)
  return c.json({ success: false, error: 'Something went wrong' }, 500)
}

/** The event named by the path, or null for a bad kind or id (nothing is read for those). */
function target(c: Context): { kind: EventKind; id: string } | null {
  const kind = c.req.param('kind')
  const id = c.req.param('id') ?? ''
  return isEventKind(kind) && isEventId(id) ? { kind, id } : null
}
const notFound = (c: Context) => c.json({ error: 'Not found' }, 404)
const readBody = async (c: Context) => (await c.req.json().catch(() => null)) as Record<string, unknown> | null

export async function getEvents(c: Context, deps: EventsDeps, user: AdminUser) {
  try {
    const [moments, events, rsvps, seenAt] = await Promise.all([deps.list('moment'), deps.list('event'), deps.rsvps('rsvp:'), deps.seenAt(user.id)])
    const now = deps.now()
    const data = listEvents({ moments, events, rsvps, today: dubaiDate(now), seenAt })
    if (c.req.query('seen') === '1') await deps.markSeen(user.id, now.toISOString())
    return c.json({ success: true, data })
  } catch (err) { return failed(c, 'list', err) }
}

export async function createEvent(c: Context, deps: EventsDeps, user: AdminUser) {
  const b = await readBody(c)
  if (!b || !isEventKind(b.kind)) return c.json({ error: 'kind' }, 400)
  const kind = b.kind
  const clean = cleanEvent(kind, b, deps.photoBase)
  if (!clean.ok) return c.json({ error: 'invalid', problem: clean.problem }, 400)
  try {
    const at = deps.now().toISOString()
    const e: StoredEvent = { id: crypto.randomUUID(), ...clean.fields, createdAt: at, updatedAt: at }
    await deps.put(kind, e)
    await deps.log({ actor: user.id, kind, id: e.id, action: 'create' })
    return c.json({ success: true, data: e }, 201)
  } catch (err) { return failed(c, 'create', err) }
}

/**
 * KV has no compare-and-set, so the updatedAt check and the write are two steps: two saves inside
 * one request's length can both pass. With two admins that is accepted (spec, DEC-020).
 */
export async function updateEvent(c: Context, deps: EventsDeps, user: AdminUser) {
  const t = target(c)
  if (!t) return notFound(c)
  const b = await readBody(c)
  const clean = cleanEvent(t.kind, b, deps.photoBase)
  if (!clean.ok) return c.json({ error: 'invalid', problem: clean.problem }, 400)
  try {
    const old = await deps.get(t.kind, t.id)
    if (!old) return notFound(c)
    if (old.updatedAt !== b?.updatedAt) return c.json({ error: 'stale' }, 409)
    let at = deps.now().toISOString()
    if (at <= old.updatedAt) at = new Date(Date.parse(old.updatedAt) + 1).toISOString() // a change always moves updatedAt
    const e: StoredEvent = { ...clean.fields, id: old.id, createdAt: old.createdAt, updatedAt: at }
    await deps.put(t.kind, e)
    await deps.log({ actor: user.id, kind: t.kind, id: t.id, action: 'edit' })
    return c.json({ success: true, data: e })
  } catch (err) { return failed(c, 'edit', err) }
}

/** The event and its bookings go together, so no booking is left pointing at nothing. */
export async function deleteEvent(c: Context, deps: EventsDeps, user: AdminUser) {
  const t = target(c)
  if (!t) return notFound(c)
  try {
    if (!(await deps.get(t.kind, t.id))) return notFound(c)
    const ref = refOf(t.kind, t.id)
    const bookings = groupBookings(await deps.rsvps(`rsvp:${ref}:`)).get(ref) ?? []
    if (bookings.length) await deps.removeRsvps(bookings.map((b) => bookingKey(ref, b.email)))
    await deps.remove(t.kind, t.id)
    await deps.log({ actor: user.id, kind: t.kind, id: t.id, action: 'delete' })
    return c.json({ success: true, data: { bookingsRemoved: bookings.length } })
  } catch (err) { return failed(c, 'delete', err) }
}

export async function getBookings(c: Context, deps: EventsDeps) {
  const t = target(c)
  if (!t) return notFound(c)
  try {
    const ref = refOf(t.kind, t.id)
    return c.json({ success: true, data: groupBookings(await deps.rsvps(`rsvp:${ref}:`)).get(ref) ?? [] })
  } catch (err) { return failed(c, 'bookings', err) }
}

export async function removeBooking(c: Context, deps: EventsDeps, user: AdminUser) {
  const t = target(c)
  if (!t) return notFound(c)
  const email = (c.req.param('email') ?? '').trim().toLowerCase()
  if (!email || email.length > 160) return notFound(c)
  try {
    const ref = refOf(t.kind, t.id)
    // Match the whole email: the key prefix alone would also match a longer address.
    const found = (groupBookings(await deps.rsvps(`rsvp:${ref}:`)).get(ref) ?? []).some((b) => b.email.toLowerCase() === email)
    if (!found) return notFound(c)
    await deps.removeRsvps([bookingKey(ref, email)])
    await deps.log({ actor: user.id, kind: t.kind, id: t.id, action: 'booking_removed' })
    return c.json({ success: true, data: { removed: true } })
  } catch (err) { return failed(c, 'remove booking', err) }
}

/** The photo's type from its first bytes, whatever its name or declared type says. */
export function sniffPhoto(b: Uint8Array): PhotoType | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x)) return 'image/png'
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to))
  if (b.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  return null
}

export async function uploadPhoto(c: Context, deps: EventsDeps) {
  const form = await c.req.formData().catch(() => null)
  const file = form?.get('file')
  if (!file || typeof file === 'string') return c.json({ error: 'invalid', problem: 'Pick a photo.' }, 400)
  if (file.size > MAX_PHOTO_BYTES) return c.json({ error: 'invalid', problem: 'Photos can be up to 8 MB.' }, 400)
  const bytes = new Uint8Array(await file.arrayBuffer())
  const type = sniffPhoto(bytes)
  if (!type) return c.json({ error: 'invalid', problem: 'Photos must be JPEG, PNG or WebP.' }, 400)
  try {
    return c.json({ success: true, data: { url: await deps.upload(bytes, type) } })
  } catch (err) { return failed(c, 'photo', err) }
}
