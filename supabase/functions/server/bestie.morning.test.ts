/**
 * #74 Morning with Bestie and the Streak (DEC-013), through the module with the in-memory store.
 */
import { describe, expect, it } from 'vitest'
import { checkIn, complete, undoCompletion, profile, morning, createMemoryBestieStore, createMemoryPhotoStore, type DayPlan, type MeetUpSource } from './bestie'
import type { DailyLine } from './morning'

const MEMBER = { id: 'm1' }
const dubai = (hhmm: string, date: string) => new Date(`${date}T${hhmm}:00+04:00`)
const plus = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60_000)
const LOW30 = { energy: 'low', minutes: 30, budgetAed: 0 }
const STEADY = { energy: 'steady', minutes: 30, budgetAed: 0 }

const line = (id: string, o: Partial<DailyLine> = {}): DailyLine =>
  ({ id, body: `line ${id}`, author: 'bestie', goal: null, pillar: null, energy: null, moment: 'any', showOn: null, ...o })
const LINES = [line('g1'), line('g2'), line('low', { moment: 'low_energy' }), line('ren', { author: 'ren', moment: 'streak' })]
const noMeetUps: MeetUpSource = { upcoming: async () => [] }

const setup = (o: { personal?: boolean[]; lines?: DailyLine[]; joinedOn?: string } = {}) =>
  createMemoryBestieStore({
    members: [{ id: 'm1', home_area: 'Dubai Marina', joinedOn: o.joinedOn ?? '2026-10-01' }],
    lines: o.lines ?? LINES,
    consents: (o.personal ?? [true]).map((granted, i) => ({ memberId: 'm1', purpose: 'personalisation', granted, at: `2026-10-0${i + 1}T00:00:00Z` })),
  })
type Store = ReturnType<typeof setup>

async function planAndDo(store: Store, date: string, input: unknown = STEADY) {
  const t = dubai('09:00', date)
  const r = await checkIn(store, MEMBER, input, t)
  if (r.outcome !== 'planned') throw new Error(r.outcome)
  const s = r.plan.suggestions.find((x) => !x.pillars.includes('mindset'))!
  const c = await complete(store, MEMBER, s.id, {}, plus(t, 60))
  if (c.outcome !== 'planned') throw new Error(c.outcome)
  return c.plan as DayPlan
}
const card = async (store: Store, at: Date, meetUps = noMeetUps) => {
  const r = await morning(store, meetUps, MEMBER, at)
  if (r.outcome !== 'morning') throw new Error(r.outcome)
  return r.card
}

describe('morning()', () => {
  it('a visitor who has not joined gets notJoined', async () => {
    expect(await morning(setup(), noMeetUps, { id: 'nobody' }, dubai('08:00', '2026-11-23'))).toEqual({ outcome: 'notJoined' })
  })

  it('with the Consent and a low-energy Check-in: the low-energy line, recorded once, stable on reload', async () => {
    const store = setup()
    await planAndDo(store, '2026-11-22', LOW30) // yesterday: a low-energy day she did something on
    const first = await card(store, dubai('07:00', '2026-11-23'))
    expect(first.line).toEqual({ text: 'line low', by: 'bestie' })
    const again = await card(store, dubai('09:00', '2026-11-23'))
    expect(again.line).toEqual(first.line)
    expect(await store.recentLines('m1', '2026-11-01')).toEqual([{ lineId: 'low', shownOn: '2026-11-23' }])
  })

  it('a withdrawn Consent gets the general line and records nothing', async () => {
    const store = setup({ personal: [true, false] })
    await checkIn(store, MEMBER, LOW30, dubai('08:00', '2026-11-22'))
    const c = await card(store, dubai('07:00', '2026-11-23'))
    expect(['line g1', 'line g2']).toContain(c.line?.text)
    expect(await store.recentLines('m1', '2026-11-01')).toEqual([])
  })

  it('a line she saw yesterday is not picked today when another fits', async () => {
    const store = setup({ lines: [line('a'), line('b')] })
    const day1 = await card(store, dubai('07:00', '2026-11-23'))
    const day2 = await card(store, dubai('07:00', '2026-11-24'))
    expect(day2.line?.text).not.toBe(day1.line?.text)
  })

  it('a line Ren wrote is signed by her', async () => {
    const store = setup({ lines: [line('ren', { author: 'ren' })] })
    expect((await card(store, dubai('07:00', '2026-11-23'))).line).toEqual({ text: 'line ren', by: 'ren' })
  })

  it('an empty bank: no line, and the card still has the sky and the Streak', async () => {
    const c = await card(setup({ lines: [] }), dubai('07:00', '2026-12-10'))
    expect(c.line).toBeNull()
    expect(c.sky.hint).toMatch(/sunset/)
    expect(c.streak.count).toBe(0)
  })

  it('a Meet up source that fails leaves the Meet up out, not the card', async () => {
    const broken: MeetUpSource = { upcoming: async () => { throw new Error('kv down') } }
    expect((await card(setup(), dubai('07:00', '2026-12-10'), broken)).meetUp).toBeNull()
  })

  it("names this week's Meet up", async () => {
    const meetUps: MeetUpSource = { upcoming: async () => [{ id: 'm', kind: 'moment', title: 'Walk & Manifestation Tips', date: '2026-12-12', startTime: '17:00' }] }
    expect((await card(setup(), dubai('07:00', '2026-12-10'), meetUps)).meetUp).toEqual(
      { title: 'Walk & Manifestation Tips', date: '2026-12-12', time: '5:00pm', location: null, url: null })
  })
})

describe('the Streak (prototype scenario "Streak and the rest day")', () => {
  it('two days, the free rest day keeps it, the second missed day resets it; Levels never drop', async () => {
    const store = setup()
    await planAndDo(store, '2026-11-23')
    await planAndDo(store, '2026-11-24')
    const day3 = await card(store, dubai('07:00', '2026-11-26'))
    expect(day3.streak).toMatchObject({ count: 2, restUsedThisWeek: true, restDayYesterday: true })
    const before = await profile(store, MEMBER, dubai('07:00', '2026-11-26'))
    const day4 = await card(store, dubai('07:00', '2026-11-27'))
    expect(day4.streak.count).toBe(0)
    const after = await profile(store, MEMBER, dubai('07:00', '2026-11-27'))
    if (before.outcome !== 'profile' || after.outcome !== 'profile') throw new Error('no profile')
    expect(after.profile.levels).toEqual(before.profile.levels)
    expect(after.profile.points).toEqual(before.profile.points)
    expect(after.profile.streak.count).toBe(0)
    expect(before.profile.streak.count).toBe(2)
  })

  it('an undone Completion does not count; a flagged one does', async () => {
    const store = setup()
    const p = await planAndDo(store, '2026-11-23')
    const id = p.suggestions.find((s) => s.done)!.done!.completionId
    await undoCompletion(store, createMemoryPhotoStore(), MEMBER, id, dubai('11:00', '2026-11-23'))
    expect((await card(store, dubai('12:00', '2026-11-23'))).streak).toMatchObject({ count: 0, todayDone: false })

    store.completions.forEach((c) => { c.flagged = true })
    await planAndDo(store, '2026-11-24')
    store.completions.forEach((c) => { c.flagged = true })
    expect((await card(store, dubai('12:00', '2026-11-24'))).streak).toMatchObject({ count: 1, todayDone: true })
  })
})
