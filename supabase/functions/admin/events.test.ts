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
