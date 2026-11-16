import { describe, expect, it } from 'vitest'
import { DUBAI_AREAS } from '../../../src/app/wellness/content'
import { CONSENT_PURPOSES, CONSENT_VERSION, HOME_AREAS, createMemoryJoinStore, join, memberOf } from './join'

const NOW = new Date('2026-11-16T08:00:00.000Z')
const ME = { id: 'u-1', email: 'Me@X.com' }

const valid = {
  adult: true,
  homeArea: 'Dubai Marina',
  instagram: '',
  consents: { terms: true, location: false, wellness_signals: true, personalisation: false, push: false, marketing: true },
}

describe('join', () => {
  it('creates a Member in Dubai with her home area, 18+ time and every consent recorded separately', async () => {
    const store = createMemoryJoinStore()
    const r = await join(store, ME, valid, NOW)
    expect(r).toEqual({ outcome: 'joined', member: { city: 'dubai', homeArea: 'Dubai Marina', instagram: null } })
    expect(store.members.get('u-1')).toMatchObject({ city: 'dubai', home_area: 'Dubai Marina', adult_confirmed_at: NOW.toISOString() })
    expect(store.consents).toHaveLength(6)
    for (const purpose of CONSENT_PURPOSES) {
      expect(store.consents).toContainEqual({
        member_id: 'u-1',
        purpose,
        version: CONSENT_VERSION,
        granted: valid.consents[purpose],
        recorded_at: NOW.toISOString(),
      })
    }
  })

  it('refuses without the 18+ confirmation, and writes nothing', async () => {
    const store = createMemoryJoinStore()
    const r = await join(store, ME, { ...valid, adult: false }, NOW)
    expect(r).toMatchObject({ outcome: 'invalid' })
    expect(store.members.size).toBe(0)
    expect(store.consents).toHaveLength(0)
  })

  it('refuses without the terms consent', async () => {
    const store = createMemoryJoinStore()
    const r = await join(store, ME, { ...valid, consents: { ...valid.consents, terms: false } }, NOW)
    expect(r).toMatchObject({ outcome: 'invalid' })
    expect(store.members.size).toBe(0)
  })

  it('refuses a home area that is not on the list', async () => {
    const store = createMemoryJoinStore()
    expect(await join(store, ME, { ...valid, homeArea: 'Atlantis' }, NOW)).toMatchObject({ outcome: 'invalid' })
    expect(await join(store, ME, { ...valid, homeArea: undefined }, NOW)).toMatchObject({ outcome: 'invalid' })
  })

  it('treats a missing optional consent as refused, never granted', async () => {
    const store = createMemoryJoinStore()
    await join(store, ME, { ...valid, consents: { terms: true } }, NOW)
    expect(store.consents.filter((c) => c.granted).map((c) => c.purpose)).toEqual(['terms'])
  })

  it('only counts a consent as granted when it is exactly true', async () => {
    const store = createMemoryJoinStore()
    await join(store, ME, { ...valid, consents: { terms: true, marketing: 'yes' } }, NOW)
    expect(store.consents.find((c) => c.purpose === 'marketing')?.granted).toBe(false)
  })

  it('keeps a self-added Instagram handle, cleaned of a leading @', async () => {
    const store = createMemoryJoinStore()
    const r = await join(store, ME, { ...valid, instagram: '  @ren.oriri_ ' }, NOW)
    expect(r).toMatchObject({ outcome: 'joined', member: { instagram: 'ren.oriri_' } })
  })

  it('refuses an Instagram handle Instagram would not allow', async () => {
    const store = createMemoryJoinStore()
    expect(await join(store, ME, { ...valid, instagram: 'bad handle!' }, NOW)).toMatchObject({ outcome: 'invalid' })
    expect(await join(store, ME, { ...valid, instagram: 'a'.repeat(31) }, NOW)).toMatchObject({ outcome: 'invalid' })
  })

  it('joining twice changes nothing', async () => {
    const store = createMemoryJoinStore()
    await join(store, ME, valid, NOW)
    const later = new Date('2026-11-17T08:00:00.000Z')
    const r = await join(store, ME, { ...valid, homeArea: 'Deira', consents: { terms: true } }, later)
    expect(r).toEqual({ outcome: 'alreadyJoined', member: { city: 'dubai', homeArea: 'Dubai Marina', instagram: null } })
    expect(store.consents).toHaveLength(6)
  })

  it('marks her earlier Free day lead as joined, matched by lower-cased email', async () => {
    const store = createMemoryJoinStore({ freeDayLeads: ['me@x.com'] })
    await join(store, ME, valid, NOW)
    expect(store.joinedLeads).toEqual([{ email: 'me@x.com', memberId: 'u-1', joinedAt: NOW.toISOString() }])
  })

  it('still joins when there is no Free day lead to mark', async () => {
    const store = createMemoryJoinStore()
    expect(await join(store, ME, valid, NOW)).toMatchObject({ outcome: 'joined' })
    expect(store.joinedLeads).toEqual([])
  })

  it('a Free day lead that cannot be marked does not stop her joining', async () => {
    const store = createMemoryJoinStore({ freeDayLeads: ['me@x.com'], failLeadMark: true })
    expect(await join(store, ME, valid, NOW)).toMatchObject({ outcome: 'joined' })
  })
})

describe('memberOf', () => {
  it('is null before she joins, and her Member after', async () => {
    const store = createMemoryJoinStore()
    expect(await memberOf(store, 'u-1')).toBeNull()
    await join(store, ME, valid, NOW)
    expect(await memberOf(store, 'u-1')).toEqual({ city: 'dubai', homeArea: 'Dubai Marina', instagram: null })
  })
})

describe('home areas', () => {
  it('are exactly the areas the Check-in offers', () => {
    expect([...HOME_AREAS]).toEqual([...DUBAI_AREAS])
  })
})
