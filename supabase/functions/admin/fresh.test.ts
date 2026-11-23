import { describe, it, expect } from 'vitest'
import { signedInAt, isFresh, FRESH_MS } from './fresh.ts'

describe('signedInAt', () => {
  it('converts seconds to ms', () => {
    expect(signedInAt({ amr: [{ method: 'otp', timestamp: 1000 }] })).toBe(1_000_000)
  })
  it('newest wins regardless of order', () => {
    expect(signedInAt({ amr: [{ method: 'otp', timestamp: 2000 }, { method: 'otp', timestamp: 1000 }] })).toBe(2_000_000)
    expect(signedInAt({ amr: [{ method: 'otp', timestamp: 1000 }, { method: 'otp', timestamp: 2000 }] })).toBe(2_000_000)
  })
  it('ignores token_refresh', () => {
    expect(signedInAt({ amr: [{ method: 'token_refresh', timestamp: 3000 }, { method: 'magiclink', timestamp: 1000 }] })).toBe(1_000_000)
  })
  it('returns null when missing or malformed', () => {
    expect(signedInAt({})).toBeNull()
    expect(signedInAt({ amr: 'x' })).toBeNull()
    expect(signedInAt({ amr: [{ method: 'otp' }] })).toBeNull()
    expect(signedInAt({ amr: [] })).toBeNull()
    expect(signedInAt(null)).toBeNull()
    expect(signedInAt({ amr: [null, 5, { method: 'otp', timestamp: NaN }, { method: 'otp', timestamp: '5' }] })).toBeNull()
  })
})

describe('isFresh', () => {
  const t = 1_700_000_000_000
  it('is true within the window', () => {
    expect(FRESH_MS).toBe(600_000)
    expect(isFresh(t, t + 600_000)).toBe(true)
    expect(isFresh(t, t)).toBe(true)
  })
  it('is false past the window', () => expect(isFresh(t, t + 600_001)).toBe(false))
  it('is false when null', () => expect(isFresh(null, t)).toBe(false))
  it('is false when far in the future', () => expect(isFresh(t + 120_000, t)).toBe(false))
})
