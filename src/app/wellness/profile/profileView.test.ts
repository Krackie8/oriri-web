import { describe, expect, it } from 'vitest'
import { profileView } from './profileView'

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
