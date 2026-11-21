/**
 * #72: Completing with Proof (DEC-003, grilling 2026-11-20), through the module with the in-memory store.
 */
import { describe, expect, it } from 'vitest'
import {
  checkIn, todayPlan, swapOptions, swapSuggestion, skipSuggestion, complete, undoCompletion, attachPhoto, deletePhoto, journal,
  personalWeight, createMemoryBestieStore, createMemoryPhotoStore, MAX_PHOTO_BYTES, type DayPlan, type SuggestionView,
} from './bestie'

const MEMBER = { id: 'm1' }
const OTHER = { id: 'm2' }
/** A Dubai clock time on a date. */
const dubai = (hhmm: string, date = '2026-11-20') => new Date(`${date}T${hhmm}:00+04:00`)
const plus = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60_000)
const LOW30 = { energy: 'low', minutes: 30, budgetAed: 0 }
const GOOD = { energy: 'low', minutes: 120, budgetAed: 250 }

const setup = () => {
  const store = createMemoryBestieStore({ members: [{ id: 'm1', home_area: 'Dubai Marina' }, { id: 'm2', home_area: 'Deira' }] })
  const photos = createMemoryPhotoStore()
  return { store, photos }
}
type Store = ReturnType<typeof setup>['store']

async function plan(store: Store, input: unknown, now: Date, user = MEMBER): Promise<DayPlan> {
  const r = await checkIn(store, user, input, now)
  if (r.outcome !== 'planned') throw new Error(`expected a plan, got ${JSON.stringify(r)}`)
  return r.plan
}
const of = (p: DayPlan, pillar: string): SuggestionView => p.suggestions.find((s) => s.pillars.includes(pillar as never))!
const done = async (store: Store, id: string, now: Date, reflection?: string) => {
  const r = await complete(store, MEMBER, id, reflection === undefined ? {} : { reflection }, now)
  if (r.outcome !== 'planned') throw new Error(`expected a Completion, got ${JSON.stringify(r)}`)
  return r.plan
}
const completionOf = (store: Store, suggestionId: string) => store.completions.find((c) => c.suggestion_id === suggestionId && !c.undone_at)!

// A tiny JPEG carrying EXIF with a location.
const seg = (marker: number, payload: number[]) => [0xff, marker, ((payload.length + 2) >> 8) & 0xff, (payload.length + 2) & 0xff, ...payload]
const ascii = (s: string) => [...s].map((ch) => ch.charCodeAt(0))
const PHOTO = new Uint8Array([0xff, 0xd8, ...seg(0xe1, [...ascii('Exif'), 0, 0, ...ascii('GPS 25.08N 55.14E')]),
  ...seg(0xda, [1, 1, 0, 0, 63, 0]), 0x12, 0x34, 0xff, 0xd9])

describe('only her own Suggestions from today can be completed', () => {
  it('refuses another Member, yesterday, and Suggestions she swapped, skipped or passed on', async () => {
    const { store } = setup()
    const t = dubai('09:00')
    const p = await plan(store, GOOD, t)
    const move = of(p, 'move')
    expect((await complete(store, { id: 'm3' }, move.id, {}, plus(t, 120))).outcome).toBe('notJoined')
    await plan(store, GOOD, t, OTHER)
    expect((await complete(store, OTHER, move.id, {}, plus(t, 120))).outcome).toBe('notFound')
    expect((await complete(store, MEMBER, 'nope', {}, plus(t, 120))).outcome).toBe('notFound')
    expect((await complete(store, MEMBER, move.id, {}, dubai('09:00', '2026-11-21'))).outcome).toBe('notFound')

    const opts = await swapOptions(store, MEMBER, move.id, t)
    if (opts.outcome !== 'options') throw new Error(opts.outcome)
    const s = await swapSuggestion(store, MEMBER, move.id, opts.options[0].catalogueItemId, t)
    if (s.outcome !== 'planned') throw new Error(s.outcome)
    expect((await complete(store, MEMBER, move.id, {}, plus(t, 120))).outcome).toBe('notFound') // swapped
    const passedOn = store.suggestions.find((x) => x.outcome === 'not_picked')!
    expect((await complete(store, MEMBER, passedOn.id, {}, plus(t, 120))).outcome).toBe('notFound')
    const meal = of(s.plan, 'meal')
    await skipSuggestion(store, MEMBER, meal.id, t)
    expect((await complete(store, MEMBER, meal.id, {}, plus(t, 120))).outcome).toBe('notFound')
  })
})

describe('the time gate', () => {
  it('opens once the item could have been done since the Check-in, and says when', async () => {
    const { store } = setup()
    const t = dubai('09:00')
    const p = await plan(store, GOOD, t)
    const move = of(p, 'move')
    expect(move.readyAt).toBe(plus(t, move.minutes).toISOString())
    const early = await complete(store, MEMBER, move.id, {}, plus(t, move.minutes - 1))
    expect(early).toEqual({ outcome: 'tooSoon', readyAt: plus(t, move.minutes).toISOString() })
    expect(store.completions).toHaveLength(0)
    const p2 = await done(store, move.id, plus(t, move.minutes))
    expect(p2.suggestions.find((s) => s.id === move.id)!.done).toMatchObject({ at: plus(t, move.minutes).toISOString() })
    expect(store.suggestions.find((s) => s.id === move.id)!.outcome).toBe('completed')
  })

  it('starts a swapped-in pick at the swap', async () => {
    const { store } = setup()
    const t = dubai('09:00')
    const p = await plan(store, GOOD, t)
    const move = of(p, 'move')
    const swapAt = plus(t, 60)
    const opts = await swapOptions(store, MEMBER, move.id, swapAt)
    if (opts.outcome !== 'options') throw new Error(opts.outcome)
    const pick = opts.options.find((o) => o.minutes >= 10)!
    const s = await swapSuggestion(store, MEMBER, move.id, pick.catalogueItemId, swapAt)
    if (s.outcome !== 'planned') throw new Error(s.outcome)
    const fresh = s.plan.suggestions.find((x) => x.slug === pick.slug)!
    expect((await complete(store, MEMBER, fresh.id, {}, plus(swapAt, pick.minutes - 1))).outcome).toBe('tooSoon')
    await done(store, fresh.id, plus(swapAt, pick.minutes))
  })
})

describe('a Mindset Completion needs a Reflection', () => {
  it('asks for one line, keeps it, and refuses more than 280 characters', async () => {
    const { store } = setup()
    const t = dubai('09:00')
    const p = await plan(store, LOW30, t)
    const mindset = of(p, 'mindset')
    const later = plus(t, 30)
    expect((await complete(store, MEMBER, mindset.id, {}, later)).outcome).toBe('reflectionNeeded')
    expect((await complete(store, MEMBER, mindset.id, { reflection: '   ' }, later)).outcome).toBe('reflectionNeeded')
    expect((await complete(store, MEMBER, mindset.id, { reflection: 'x'.repeat(281) }, later)).outcome).toBe('reflectionTooLong')
    await done(store, mindset.id, later, '  Rest is part of it  ')
    expect(completionOf(store, mindset.id)).toMatchObject({ proof_kind: 'reflection', reflection: 'Rest is part of it' })
  })

  it('records a plain tick for Move and Meal, ignoring any text', async () => {
    const { store } = setup()
    const t = dubai('09:00')
    const p = await plan(store, LOW30, t)
    await done(store, of(p, 'move').id, plus(t, 30), 'not needed')
    expect(completionOf(store, of(p, 'move').id)).toMatchObject({ proof_kind: 'tick', reflection: null })
  })
})

describe('one Meal per mealtime', () => {
  it('refuses a second Meal in the same mealtime after checking in again (a snack counts)', async () => {
    const { store } = setup()
    const t = dubai('11:00')
    const p = await plan(store, LOW30, t)
    const opts = await swapOptions(store, MEMBER, of(p, 'meal').id, t)
    if (opts.outcome !== 'options') throw new Error(opts.outcome)
    const snack = opts.options.find((o) => o.slug === 'smoothiehome')!
    const s = await swapSuggestion(store, MEMBER, of(p, 'meal').id, snack.catalogueItemId, t)
    if (s.outcome !== 'planned') throw new Error(s.outcome)
    await done(store, of(s.plan, 'meal').id, plus(t, 15)) // a snack is her Meal for lunch
    const p2 = await plan(store, LOW30, plus(t, 20))
    expect(await complete(store, MEMBER, of(p2, 'meal').id, {}, plus(t, 40))).toEqual({ outcome: 'mealCapped', mealtime: 'lunch' })
  })

  it('allows breakfast then lunch, and lunch then dinner', async () => {
    const { store } = setup()
    const p1 = await plan(store, LOW30, dubai('10:00'))
    await done(store, of(p1, 'meal').id, dubai('10:15'))
    const p2 = await plan(store, LOW30, dubai('11:00'))
    await done(store, of(p2, 'meal').id, dubai('11:15'))
    const p3 = await plan(store, LOW30, dubai('16:00'))
    await done(store, of(p3, 'meal').id, dubai('16:15'))
  })
})

describe('one reach-out a day', () => {
  it('refuses a second across Check-ins, and an undo frees it', async () => {
    const { store } = setup()
    const t = dubai('09:00')
    const p = await plan(store, LOW30, t)
    const reach = of(p, 'meet_up')
    expect(reach.slug).toBe('reachout')
    await done(store, reach.id, plus(t, 10))
    expect(completionOf(store, reach.id).proof_kind).toBe('reach_out')
    const p2 = await plan(store, LOW30, plus(t, 60))
    const reach2 = of(p2, 'meet_up')
    expect(await complete(store, MEMBER, reach2.id, {}, plus(t, 90))).toEqual({ outcome: 'reachOutCapped' })
    const undone = await undoCompletion(store, createMemoryPhotoStore(), MEMBER, completionOf(store, reach.id).id, plus(t, 95))
    expect(undone.outcome).toBe('planned')
    await done(store, reach2.id, plus(t, 100))
  })
})

describe('same-day undo', () => {
  it('reopens the Suggestion, keeps the row as history, hides it from the Journal, and lets her complete it again', async () => {
    const { store, photos } = setup()
    const t = dubai('09:00')
    const p = await plan(store, LOW30, t)
    const move = of(p, 'move')
    await done(store, move.id, plus(t, 30))
    const c = completionOf(store, move.id)
    const r = await undoCompletion(store, photos, MEMBER, c.id, plus(t, 35))
    if (r.outcome !== 'planned') throw new Error(r.outcome)
    expect(r.plan.suggestions.find((s) => s.id === move.id)!.done).toBeNull()
    expect(store.suggestions.find((s) => s.id === move.id)!.outcome).toBe('shown')
    expect(store.completions.find((x) => x.id === c.id)!.undone_at).toBe(plus(t, 35).toISOString())
    expect((await journal(store, photos, MEMBER, plus(t, 36))).entries).toHaveLength(0)
    expect((await undoCompletion(store, photos, MEMBER, c.id, plus(t, 36))).outcome).toBe('notFound') // already undone
    await done(store, move.id, plus(t, 40))
    expect((await journal(store, photos, MEMBER, plus(t, 41))).entries).toHaveLength(1)
  })

  it('sends the Suggestion back to replaced when she has checked in again since', async () => {
    const { store, photos } = setup()
    const t = dubai('09:00')
    const p = await plan(store, LOW30, t)
    const move = of(p, 'move')
    await done(store, move.id, plus(t, 30))
    await plan(store, LOW30, plus(t, 40))
    await undoCompletion(store, photos, MEMBER, completionOf(store, move.id).id, plus(t, 45))
    expect(store.suggestions.find((s) => s.id === move.id)!.outcome).toBe('replaced')
  })

  it('is refused the next day, and for another Member', async () => {
    const { store, photos } = setup()
    const t = dubai('22:00')
    const p = await plan(store, LOW30, t)
    await done(store, of(p, 'move').id, plus(t, 30))
    const id = completionOf(store, of(p, 'move').id).id
    await plan(store, LOW30, t, OTHER)
    expect((await undoCompletion(store, photos, OTHER, id, plus(t, 35))).outcome).toBe('notFound')
    expect((await undoCompletion(store, photos, MEMBER, id, dubai('00:05', '2026-11-21'))).outcome).toBe('notFound')
  })
})

describe('the prototype scenario "Trying to game it"', () => {
  it('blocks the instant tick, quietly flags the burst, and refuses a second reach-out', async () => {
    const { store } = setup()
    const t = dubai('09:00')
    const p = await plan(store, LOW30, t)
    // She checks in and immediately ticks the Move: the time gate blocks it.
    expect((await complete(store, MEMBER, of(p, 'move').id, {}, t)).outcome).toBe('tooSoon')
    // She waits 30 minutes and ticks all four within a minute or two.
    let last: DayPlan | undefined
    for (const [k, s] of p.suggestions.entries()) last = await done(store, s.id, plus(t, 30 + k * 0.5), 'ok')
    expect(store.completions).toHaveLength(4)
    expect(store.completions.every((c) => c.flagged && c.flag_reason === 'too_fast')).toBe(true)
    // She is never told: what she sees carries no flag.
    expect(JSON.stringify(last)).not.toMatch(/flag|suspicious/i)
    // Check in again and try a second reach-out today.
    const p2 = await plan(store, LOW30, plus(t, 40))
    expect(await complete(store, MEMBER, of(p2, 'meet_up').id, {}, plus(t, 70))).toEqual({ outcome: 'reachOutCapped' })
  })

  it('leaves an honest evening Wrap-up unflagged', async () => {
    const { store } = setup()
    const t = dubai('09:00')
    const p = await plan(store, LOW30, t)
    for (const [k, s] of p.suggestions.entries()) await done(store, s.id, plus(dubai('20:00'), k), 'A slow morning')
    expect(store.completions.some((c) => c.flagged)).toBe(false)
  })

  it('a Wrap-up soon after a late Check-in is still flagged when she could not have done it all (#74)', async () => {
    const { store } = setup()
    const t = dubai('19:00')
    const p = await plan(store, LOW30, t)
    // Her 30 minutes hold all four: the earliest she could finish them back to back is 19:30.
    for (const [k, s] of p.suggestions.entries()) await done(store, s.id, plus(t, 30 + k), 'ok')
    expect(store.completions.every((c) => c.flagged && c.flag_reason === 'too_fast')).toBe(true)
  })
})

describe('learning from Completions', () => {
  it('lifts a completed item, and an undo takes the lift away', async () => {
    const { store, photos } = setup()
    const t = dubai('09:00')
    const p = await plan(store, LOW30, t)
    const move = of(p, 'move')
    const item = store.suggestions.find((s) => s.id === move.id)!.catalogue_item_id
    const weight = async () => personalWeight(await store.history('m1', '2026-11-01'), item, '2026-11-20')
    expect(await weight()).toBe(0)
    await done(store, move.id, plus(t, 30))
    expect(await weight()).toBe(3)
    await undoCompletion(store, photos, MEMBER, completionOf(store, move.id).id, plus(t, 31))
    expect(await weight()).toBe(0)
  })
})

describe('photos', () => {
  it('are optional, private, stripped of location, and shown in her Journal', async () => {
    const { store, photos } = setup()
    const t = dubai('09:00')
    const p = await plan(store, LOW30, t)
    const move = of(p, 'move')
    await done(store, move.id, plus(t, 30))
    const c = completionOf(store, move.id)
    expect(await attachPhoto(store, photos, MEMBER, c.id, PHOTO)).toEqual({ outcome: 'saved' })
    const path = `m1/${c.id}.jpg`
    expect(store.completions.find((x) => x.id === c.id)!.photo_path).toBe(path)
    const saved = photos.files.get(path)!
    expect(new TextDecoder('latin1').decode(saved)).not.toMatch(/Exif|GPS/)
    const j = await journal(store, photos, MEMBER, plus(t, 31))
    expect(j.entries).toEqual([expect.objectContaining({ completionId: c.id, title: move.title, pillars: move.pillars, photoUrl: expect.stringContaining(path) })])
  })

  it('refuses another Member, a non-JPEG and anything over 5 MB', async () => {
    const { store, photos } = setup()
    const t = dubai('09:00')
    const p = await plan(store, LOW30, t)
    await done(store, of(p, 'move').id, plus(t, 30))
    const c = completionOf(store, of(p, 'move').id)
    await plan(store, LOW30, t, OTHER)
    expect((await attachPhoto(store, photos, OTHER, c.id, PHOTO)).outcome).toBe('notFound')
    expect((await attachPhoto(store, photos, MEMBER, c.id, new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).outcome).toBe('notJpeg')
    const big = new Uint8Array(MAX_PHOTO_BYTES + 1)
    big.set(PHOTO)
    expect((await attachPhoto(store, photos, MEMBER, c.id, big)).outcome).toBe('tooLarge')
    expect(photos.files.size).toBe(0)
  })

  it('can be removed by her, and go with an undo', async () => {
    const { store, photos } = setup()
    const t = dubai('09:00')
    const p = await plan(store, LOW30, t)
    await done(store, of(p, 'move').id, plus(t, 30))
    await done(store, of(p, 'meal').id, plus(t, 30))
    const a = completionOf(store, of(p, 'move').id)
    const b = completionOf(store, of(p, 'meal').id)
    await attachPhoto(store, photos, MEMBER, a.id, PHOTO)
    await attachPhoto(store, photos, MEMBER, b.id, PHOTO)
    expect(await deletePhoto(store, photos, MEMBER, a.id)).toEqual({ outcome: 'deleted' })
    expect(photos.files.has(`m1/${a.id}.jpg`)).toBe(false)
    expect(store.completions.find((x) => x.id === a.id)!.photo_path).toBeNull()
    await undoCompletion(store, photos, MEMBER, b.id, plus(t, 35))
    expect(photos.files.size).toBe(0)
  })
})

describe('the Day plan view', () => {
  it('marks what is done and keeps Completions when she checks in again', async () => {
    const { store } = setup()
    const t = dubai('09:00')
    const p = await plan(store, LOW30, t)
    await done(store, of(p, 'move').id, plus(t, 30))
    const today = (await todayPlan(store, MEMBER, plus(t, 31)))!
    expect(today.suggestions.filter((s) => s.done)).toHaveLength(1)
    await plan(store, LOW30, plus(t, 40))
    expect(store.completions.filter((c) => !c.undone_at)).toHaveLength(1)
  })
})
