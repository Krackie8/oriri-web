import { describe, expect, it } from 'vitest'
import { CHECK_IN_AGAIN, checkInGate, wantsAgain } from './returning'

describe('checkInGate: a Member who already has a plan today goes back to it', () => {
  it('sends a Member with a plan today to her day, so coming back never replaces it', () => {
    expect(checkInGate({ kind: 'member', hasPlanToday: true }, false)).toBe('day')
  })
  it('lets her check in again only when she chose to', () => {
    expect(checkInGate({ kind: 'member', hasPlanToday: true }, true)).toBe('inputs')
  })
  it('shows the Check-in to a Member with no plan today, and to a visitor', () => {
    expect(checkInGate({ kind: 'member', hasPlanToday: false }, false)).toBe('inputs')
    expect(checkInGate({ kind: 'visitor' }, false)).toBe('inputs')
  })
  it('waits while it is still finding out who is looking', () => {
    expect(checkInGate({ kind: 'checking' }, false)).toBe('wait')
    expect(checkInGate({ kind: 'checking' }, true)).toBe('inputs')
  })
})

describe('wantsAgain', () => {
  it('reads the "check in again" link', () => {
    expect(CHECK_IN_AGAIN).toBe('/plan/inputs?again=1')
    expect(wantsAgain('?again=1')).toBe(true)
    expect(wantsAgain('?again=1&utm_source=x')).toBe(true)
    expect(wantsAgain('')).toBe(false)
    expect(wantsAgain('?again=0')).toBe(false)
  })
})
