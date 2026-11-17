import { describe, expect, it } from 'vitest'
import { afterJoin } from './afterJoin'

const plan = { outcome: 'planned', plan: {} } as never
describe('afterJoin', () => {
  it('opens her Day plan when the server has one for today, even with nothing saved in this browser', async () => {
    expect(await afterJoin(async () => ({ ok: true, data: plan }), () => false)).toBe('/plan/day')
  })
  it('falls back to answers saved in this browser', async () => {
    expect(await afterJoin(async () => ({ ok: true, data: { outcome: 'none' } }), () => true)).toBe('/plan/day')
    expect(await afterJoin(async () => ({ ok: true, data: { outcome: 'none' } }), () => false)).toBe('/plan/inputs')
  })
  it('a failed or throwing lookup goes to the Check-in, not an error', async () => {
    expect(await afterJoin(async () => ({ ok: false, error: { status: 0, message: 'offline' } } as never), () => false)).toBe('/plan/inputs')
    expect(await afterJoin(async () => { throw new Error('boom') }, () => false)).toBe('/plan/inputs')
  })
})
