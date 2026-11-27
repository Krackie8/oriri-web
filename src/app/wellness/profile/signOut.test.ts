import { describe, expect, it, vi } from 'vitest'
import { signOutThisDevice } from './signOut'

describe('signOutThisDevice: Sign out on the Profile', () => {
  it('signs out this device only, so her other devices stay signed in', async () => {
    const signOut = vi.fn(async () => ({ error: null }))
    expect(await signOutThisDevice({ signOut })).toBe(true)
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
  })
  it('says it failed when sign-out returns an error', async () => {
    expect(await signOutThisDevice({ signOut: async () => ({ error: new Error('offline') }) })).toBe(false)
  })
  it('says it failed when sign-out throws', async () => {
    expect(
      await signOutThisDevice({
        signOut: async () => {
          throw new Error('offline')
        },
      }),
    ).toBe(false)
  })
})
