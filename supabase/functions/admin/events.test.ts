import { describe, expect, it } from 'vitest'
import { cleanEvent, isEventId, refOf } from './events'

const BASE = 'https://proj.supabase.co/storage/v1/object/public/make-a278ea32-wellness/'
const photo = (n = 1) => `${BASE}admin/170000000000${n}-abcd1234.jpg`
const moment = (o: Record<string, unknown> = {}) => cleanEvent('moment', { title: 'Sunset walk', date: '2026-11-29', ...o }, BASE)
const partner = (o: Record<string, unknown> = {}) => cleanEvent('event', { title: 'Reformer class', date: '2026-11-29', ...o }, BASE)
const problem = (r: ReturnType<typeof cleanEvent>) => (r.ok ? null : r.problem)

describe('cleanEvent: a good event round-trips', () => {
  it('keeps a Stepsisters meet-up exactly', () => {
    const r = moment({ startTime: '19:30', location: ' Kite Beach ', description: 'Bring water.', link: 'https://instagram.com/p/x', photos: [photo(1), photo(2)], pinned: true })
    expect(r).toEqual({
      ok: true,
      fields: {
        title: 'Sunset walk', date: '2026-11-29', startTime: '19:30', location: 'Kite Beach', description: 'Bring water.',
        link: 'https://instagram.com/p/x', pinned: true, type: 'upcoming', photos: [photo(1), photo(2)],
      },
    })
  })

  it('keeps a partner event exactly, with its defaults', () => {
    expect(partner({ partner: 'Studio X', image: photo() })).toEqual({
      ok: true,
      fields: { title: 'Reformer class', date: '2026-11-29', pinned: false, category: 'Movement', image: photo(), partner: 'Studio X' },
    })
  })

  it('keeps a recap', () => {
    const r = moment({ type: 'recap' })
    expect(r.ok && r.fields.type).toBe('recap')
  })
})

describe('cleanEvent: each rule refuses with its wording', () => {
  it('needs a title', () => {
    expect(problem(moment({ title: '   ' }))).toBe('Give it a title.')
    expect(problem(moment({ title: 42 }))).toBe('Give it a title.')
  })
  it('needs a real date', () => {
    for (const date of [undefined, '', '29/11/2026', '2026-02-30', '2026-13-01']) expect(problem(moment({ date })), String(date)).toBe('Pick a date.')
  })
  it('a time must be HH:MM', () => {
    for (const startTime of ['7pm', '24:00', '19:60', '9:30']) expect(problem(moment({ startTime })), startTime).toBe("That time doesn't look right.")
    expect(moment({ startTime: '' }).ok).toBe(true)
    expect(moment({ startTime: '00:00' }).ok).toBe(true)
  })
  it('a link must be https', () => {
    for (const link of ['javascript:alert(1)', ' javascript:alert(1)', 'data:text/html,x', 'http://x.test', 'www.x.test', 'https://'])
      expect(problem(moment({ link })), link).toBe('Links must start with https://')
    const r = moment({ link: '  https://x.test/a  ' })
    expect(r.ok && r.fields.link).toBe('https://x.test/a')
  })
  it('a photo must be one uploaded here', () => {
    for (const p of [
      'https://evil.test/make-a278ea32-wellness/x.jpg',
      `https://evil.test/?u=${BASE}x.jpg`,
      `${BASE}../other/x.jpg`,
      `${BASE}x.jpg?download=1`,
      BASE,
    ]) expect(problem(moment({ photos: [p] })), p).toBe('Upload photos here, then pick them.')
    expect(problem(partner({ image: 'https://evil.test/x.jpg' }))).toBe('Upload photos here, then pick them.')
  })
  it('up to 12 photos', () => {
    expect(moment({ photos: Array.from({ length: 12 }, (_, i) => photo(i)) }).ok).toBe(true)
    expect(problem(moment({ photos: Array.from({ length: 13 }, (_, i) => photo(i)) }))).toBe('Up to 12 photos.')
  })
  it('caps lengths', () => {
    expect(problem(moment({ title: 'x'.repeat(121) }))).toBe("That's longer than it can be.")
    expect(problem(moment({ location: 'x'.repeat(121) }))).toBe("That's longer than it can be.")
    expect(problem(moment({ description: 'x'.repeat(1001) }))).toBe("That's longer than it can be.")
    expect(problem(partner({ partner: 'x'.repeat(81) }))).toBe("That's longer than it can be.")
    expect(problem(moment({ link: `https://x.test/${'a'.repeat(500)}` }))).toBe("That's longer than it can be.")
    expect(moment({ title: 'x'.repeat(120), description: 'x'.repeat(1000) }).ok).toBe(true)
  })
  it('a category must be one of the list; a type one of the two', () => {
    expect(partner({ category: 'Food' }).ok).toBe(true)
    expect(problem(partner({ category: 'Nightlife' }))).toBe('Pick a category.')
    expect(problem(moment({ type: 'party' }))).toBe('Pick meet-up or recap.')
  })
})

describe('cleanEvent: drops what it does not know', () => {
  it('drops hidden, id, timestamps and the other kind’s fields', () => {
    const m = moment({ hidden: true, id: 'x', createdAt: 'y', category: 'Food', image: photo(), partner: 'P' })
    expect(m.ok && Object.keys(m.fields).sort()).toEqual(['date', 'photos', 'pinned', 'title', 'type'].sort())
    const e = partner({ type: 'recap', photos: [photo()] })
    expect(e.ok && Object.keys(e.fields).sort()).toEqual(['category', 'date', 'pinned', 'title'].sort())
  })
  it('pinned must be a boolean', () => {
    const r = moment({ pinned: 'yes' })
    expect(r.ok && r.fields.pinned).toBe(false)
  })
})

describe('ids and refs', () => {
  it('accepts the shape bookings use, nothing else', () => {
    expect(isEventId('3f2b9c1e-0000-4000-8000-000000000001')).toBe(true)
    expect(isEventId('../x')).toBe(false)
    expect(isEventId('abc')).toBe(false)
    expect(isEventId('a'.repeat(65))).toBe(false)
  })
  it('names a booking ref the way the server does', () => {
    expect(refOf('moment', 'abc123')).toBe('m-abc123')
    expect(refOf('event', 'abc123')).toBe('e-abc123')
  })
})

/* ── Task 2: the Meet up mark and bookings ─────────────────────────────── */
import { meetUpPickId, groupBookings, listEvents, type StoredEvent } from './events'
import { thisWeeksMeetUp } from '../server/morning'

const ev = (id: string, date: string, o: Partial<StoredEvent> = {}): StoredEvent =>
  ({ id, title: `Title ${id}`, date, pinned: false, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z', ...o })
const TODAY = '2026-11-26'

describe('meetUpPickId names the event the Meet up card shows', () => {
  it('a pinned partner event beats a Stepsisters one', () => {
    expect(meetUpPickId([ev('mmmmmm1', '2026-11-27', { type: 'upcoming' })], [ev('eeeeee1', '2026-11-30', { pinned: true })], TODAY)).toBe('eeeeee1')
  })
  it('Stepsisters beats a partner event on the same day, and the earlier one wins', () => {
    expect(meetUpPickId([ev('mmmmmm1', '2026-11-28')], [ev('eeeeee1', '2026-11-28')], TODAY)).toBe('mmmmmm1')
    expect(meetUpPickId([ev('mmmmmm2', '2026-11-30'), ev('mmmmmm1', '2026-11-27')], [], TODAY)).toBe('mmmmmm1')
  })
  it('never a recap; 7 days out counts and 8 does not; nothing gives null', () => {
    expect(meetUpPickId([ev('mmmmmm1', '2026-11-27', { type: 'recap' })], [], TODAY)).toBeNull()
    expect(meetUpPickId([ev('mmmmmm1', '2026-12-02')], [], TODAY)).toBe('mmmmmm1')
    expect(meetUpPickId([ev('mmmmmm1', '2026-12-03')], [], TODAY)).toBeNull()
    expect(meetUpPickId([ev('mmmmmm1', '2026-11-25')], [], TODAY)).toBeNull()
    expect(meetUpPickId([], [], TODAY)).toBeNull()
  })
  it('agrees with the real thisWeeksMeetUp on the same rows', () => {
    const moments = [ev('mmmmmm1', '2026-11-29'), ev('mmmmmm2', '2026-11-27', { type: 'recap' }), ev('mmmmmm3', '2026-12-01')]
    const events = [ev('eeeeee1', '2026-11-28', { pinned: true }), ev('eeeeee2', '2026-11-27')]
    for (const [m, e] of [[moments, events], [moments, []], [[], events.slice(1)]] as const) {
      const id = meetUpPickId([...m], [...e], TODAY)
      const real = thisWeeksMeetUp([...m.map((x) => ({ ...x, kind: 'moment' as const })), ...e.map((x) => ({ ...x, kind: 'event' as const }))], TODAY)
      const picked = [...m, ...e].find((x) => x.id === id)
      expect(real && { title: real.title, date: real.date }).toEqual(picked ? { title: picked.title, date: picked.date } : null)
    }
  })
})

const rsvp = (ref: string, email: string, bookedAt: string, guests = 1) => ({ ref, email, name: `N ${email}`, phone: '+971 50', guests, bookedAt, eventTitle: 't', eventDate: 'd', wb_source: 'direct', updatedAt: bookedAt })

describe('groupBookings', () => {
  it('groups by ref, newest first, and drops malformed rows', () => {
    const g = groupBookings([
      rsvp('m-mmmmmm1', 'a@example.test', '2026-11-20T10:00:00Z'),
      rsvp('m-mmmmmm1', 'b@example.test', '2026-11-21T10:00:00Z', 3),
      rsvp('e-eeeeee1', 'c@example.test', '2026-11-19T10:00:00Z'),
      { ref: 'm-mmmmmm1' }, null, 'x', { email: 'z@example.test' },
    ])
    expect(g.get('m-mmmmmm1')!.map((b) => b.email)).toEqual(['b@example.test', 'a@example.test'])
    expect(g.get('m-mmmmmm1')![0]).toEqual({ ref: 'm-mmmmmm1', name: 'N b@example.test', email: 'b@example.test', phone: '+971 50', guests: 3, bookedAt: '2026-11-21T10:00:00Z' })
    expect(g.get('e-eeeeee1')).toHaveLength(1)
    expect(g.size).toBe(2)
  })
})

describe('listEvents', () => {
  const moments = [ev('mmmmmm1', '2026-11-29'), ev('mmmmmm2', '2026-11-10', { type: 'recap' })]
  const events = [ev('eeeeee1', '2026-12-06'), ev('eeeeee2', '2026-11-26')]
  const rsvps = [
    rsvp('m-mmmmmm1', 'a@example.test', '2026-11-20T10:00:00Z', 2),
    rsvp('m-mmmmmm1', 'b@example.test', '2026-11-25T10:00:00Z', 1),
    rsvp('e-eeeeee1', 'c@example.test', '2026-11-25T10:00:00Z', 4),
  ]
  it('splits coming up (soonest first, today included) from past (latest first), with counts and the mark', () => {
    const r = listEvents({ moments, events, rsvps, today: TODAY, seenAt: '2026-11-24T00:00:00Z' })
    expect(r.upcoming.map((e) => e.id)).toEqual(['eeeeee2', 'mmmmmm1', 'eeeeee1'])
    expect(r.past.map((e) => e.id)).toEqual(['mmmmmm2'])
    const m1 = r.upcoming.find((e) => e.id === 'mmmmmm1')!
    expect(m1).toMatchObject({ kind: 'moment', bookings: 2, spots: 3, newBookings: 1, inMeetUp: true })
    expect(r.upcoming.filter((e) => e.inMeetUp)).toHaveLength(1)
    expect(r.tile).toEqual({ comingUp: 3, bookings: 3, fresh: true })
  })
  it('the pill is only for new bookings on an event in the next 7 days', () => {
    const later = listEvents({ moments: [], events, rsvps, today: TODAY, seenAt: '2026-11-24T00:00:00Z' })
    expect(later.tile.fresh).toBe(false) // eeeeee1 is 10 days out
    const seen = listEvents({ moments, events, rsvps, today: TODAY, seenAt: '2026-11-26T00:00:00Z' })
    expect(seen.tile.fresh).toBe(false)
    const never = listEvents({ moments, events, rsvps, today: TODAY, seenAt: null })
    expect(never.tile.fresh).toBe(true)
  })
})
