import { describe, expect, it } from 'vitest'
import { adminCheckDone, profileView } from './profileView'

const base = { authLoading: false, isLoggedIn: false, adminChecked: false, isAdmin: false }

describe('profileView: what /profile shows', () => {
  it('waits while sign-in is loading', () => {
    expect(profileView({ ...base, authLoading: true })).toBe('loading')
  })
  it('a visitor sees the Bestie sign-in screen', () => {
    expect(profileView(base)).toBe('wellness')
  })
  it('waits for the admin check once signed in, so an admin never flashes the Member screen', () => {
    expect(profileView({ ...base, isLoggedIn: true })).toBe('loading')
  })
  it('a signed-in Member stays on the Bestie side, never the old admin profile', () => {
    expect(profileView({ ...base, isLoggedIn: true, adminChecked: true })).toBe('wellness')
  })
  it('an admin still reaches the admin profile', () => {
    expect(profileView({ ...base, isLoggedIn: true, adminChecked: true, isAdmin: true })).toBe('admin')
  })
})

describe('adminCheckDone: the admin check counts only for who is signed in now', () => {
  it('a check from before sign-in does not count (Ren just signed in)', () => {
    expect(adminCheckDone({ userId: 'ren', checkedFor: null, checking: false })).toBe(false)
  })
  it('a check for someone else does not count', () => {
    expect(adminCheckDone({ userId: 'ren', checkedFor: 'other', checking: false })).toBe(false)
  })
  it('not done while a check is running', () => {
    expect(adminCheckDone({ userId: 'ren', checkedFor: 'ren', checking: true })).toBe(false)
  })
  it('done once checked for this user', () => {
    expect(adminCheckDone({ userId: 'ren', checkedFor: 'ren', checking: false })).toBe(true)
  })
})
