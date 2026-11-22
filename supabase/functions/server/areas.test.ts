import { describe, expect, it } from 'vitest'
import { AREA_CENTRES, NEARBY_KM, centreOf, distanceKm, travelMin } from './areas'
import { HOME_AREAS } from './join'

describe('the area map', () => {
  it('every Home area except "Somewhere else" has a centre', () => {
    expect(Object.keys(AREA_CENTRES).sort()).toEqual(HOME_AREAS.filter((a) => a !== 'Somewhere else').sort())
  })

  it('every centre is inside Dubai', () => {
    for (const { lat, lng } of Object.values(AREA_CENTRES)) {
      expect(lat).toBeGreaterThanOrEqual(24.75)
      expect(lat).toBeLessThanOrEqual(25.4)
      expect(lng).toBeGreaterThanOrEqual(54.9)
      expect(lng).toBeLessThanOrEqual(55.65)
    }
  })

  it('Dubai Marina to JBR is within 5 km, and to Deira is not', () => {
    expect(distanceKm(centreOf('Dubai Marina')!, centreOf('Jumeirah Beach Residence (JBR)')!)).toBeLessThan(NEARBY_KM)
    expect(distanceKm(centreOf('Dubai Marina')!, centreOf('Deira')!)).toBeGreaterThan(20)
  })

  it('distance is symmetric and zero to itself', () => {
    const a = centreOf('Deira')!
    const b = centreOf('Dubai South')!
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 10)
    expect(distanceKm(a, a)).toBe(0)
  })

  it('travel time is at least 10 minutes and 3 minutes per km, one way', () => {
    expect(travelMin(0)).toBe(10)
    expect(travelMin(0.5)).toBe(10)
    expect(travelMin(5)).toBe(15)
    expect(travelMin(12)).toBe(36)
  })

  it('unknown areas have no centre', () => {
    expect(centreOf('Somewhere else')).toBeNull()
    expect(centreOf('Atlantis')).toBeNull()
  })
})
