import { describe, expect, it } from 'vitest'
import { dayCopy } from './dayCopy'

describe('dayCopy: what the Day plan says to who is looking', () => {
  it('a Member is never told she is on a free trial or needs membership', () => {
    const c = dayCopy(true)
    for (const line of Object.values(c)) expect(String(line)).not.toMatch(/free trial|today only|with membership|as a member|is for members/i)
    expect(c.badge).toBe('Member')
    expect(c.showWaitlist).toBe(false)
  })
  it('a visitor still sees the free trial copy', () => {
    const c = dayCopy(false)
    expect(c.badge).toBe('Free trial · today only')
    expect(c.tracker).toMatch(/With membership/)
    expect(c.showWaitlist).toBe(true)
  })
})
