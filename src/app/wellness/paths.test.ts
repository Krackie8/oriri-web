import { describe, expect, it } from 'vitest'
import { isWellnessPath } from './paths'

describe('isWellnessPath: which side of the app serves a path', () => {
  it('serves /profile from the Wellness site for everyone, admins included', () => {
    expect(isWellnessPath('/profile')).toBe(true)
    expect(isWellnessPath('/profile/')).toBe(true)
  })
  it('leaves the Legacy app its own paths', () => {
    expect(isWellnessPath('/admin/legacy')).toBe(false)
    expect(isWellnessPath('/store')).toBe(false)
  })
})
