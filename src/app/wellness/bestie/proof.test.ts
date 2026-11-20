import { describe, expect, it } from 'vitest'
import { fitWithin } from './photo'
import { readyLabel } from './proofView'

describe('fitWithin: the size a photo is redrawn at', () => {
  it('keeps a small photo as it is', () => {
    expect(fitWithin(1200, 900)).toEqual({ width: 1200, height: 900 })
  })
  it('shrinks the longer side to 1600, keeping the shape', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(3024, 4032)).toEqual({ width: 1200, height: 1600 })
  })
  it('never goes below one pixel', () => {
    expect(fitWithin(10000, 2)).toEqual({ width: 1600, height: 1 })
  })
})

describe('readyLabel: when she can tick it off', () => {
  const now = new Date('2026-11-20T05:00:00Z') // 09:00 in Dubai
  it('names the Dubai time while the gate is closed', () => {
    expect(readyLabel('2026-11-20T05:45:00.000Z', now)).toBe('Ready at 9:45 am')
    expect(readyLabel('2026-11-20T12:05:00.000Z', now)).toBe('Ready at 4:05 pm')
  })
  it('says nothing once it is open, or when unknown', () => {
    expect(readyLabel('2026-11-20T05:00:00.000Z', now)).toBeNull()
    expect(readyLabel(undefined, now)).toBeNull()
  })
})
