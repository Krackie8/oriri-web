/**
 * The area map: a rough centre for each Home area, so the Day plan can ask
 * "within 5 km" and "how long to get there". Pure: no I/O.
 *
 * The centres are approximate neighbourhood middles, for Khairul to check on a map.
 */
import { HOME_AREAS } from './join.ts'

export type HomeArea = (typeof HOME_AREAS)[number]
export type LatLng = { lat: number; lng: number }

/** Two Home areas count as nearby when their centres are closer than this. */
export const NEARBY_KM = 5

export const AREA_CENTRES: Readonly<Record<Exclude<HomeArea, 'Somewhere else'>, LatLng>> = {
  'Al Barsha': { lat: 25.113, lng: 55.2 },
  'Al Furjan': { lat: 25.027, lng: 55.15 },
  'Al Quoz': { lat: 25.14, lng: 55.23 },
  'Al Sufouh': { lat: 25.1, lng: 55.16 },
  'Al Wasl / City Walk': { lat: 25.205, lng: 55.26 },
  'Arabian Ranches': { lat: 25.055, lng: 55.27 },
  Bluewaters: { lat: 25.08, lng: 55.12 },
  'Bur Dubai': { lat: 25.253, lng: 55.295 },
  'Business Bay': { lat: 25.186, lng: 55.265 },
  'DAMAC Hills': { lat: 25.025, lng: 55.25 },
  Deira: { lat: 25.27, lng: 55.32 },
  DIFC: { lat: 25.212, lng: 55.28 },
  'Discovery Gardens': { lat: 25.04, lng: 55.14 },
  'Downtown Dubai': { lat: 25.195, lng: 55.275 },
  'Dubai Creek Harbour': { lat: 25.2, lng: 55.345 },
  'Dubai Hills Estate': { lat: 25.11, lng: 55.245 },
  'Dubai Marina': { lat: 25.08, lng: 55.14 },
  'Dubai Silicon Oasis': { lat: 25.125, lng: 55.385 },
  'Dubai South': { lat: 24.89, lng: 55.16 },
  'Dubai Sports City': { lat: 25.04, lng: 55.22 },
  'Emirates Hills': { lat: 25.07, lng: 55.17 },
  Jumeirah: { lat: 25.21, lng: 55.25 },
  'Jumeirah Beach Residence (JBR)': { lat: 25.078, lng: 55.134 },
  'Jumeirah Lake Towers (JLT)': { lat: 25.07, lng: 55.145 },
  'Jumeirah Village Circle (JVC)': { lat: 25.06, lng: 55.21 },
  'Jumeirah Village Triangle (JVT)': { lat: 25.045, lng: 55.19 },
  Karama: { lat: 25.245, lng: 55.305 },
  Meydan: { lat: 25.16, lng: 55.3 },
  Mirdif: { lat: 25.22, lng: 55.42 },
  'Motor City': { lat: 25.045, lng: 55.24 },
  'Palm Jumeirah': { lat: 25.115, lng: 55.14 },
  'The Greens & The Views': { lat: 25.095, lng: 55.175 },
  'The Springs / Meadows / Lakes': { lat: 25.065, lng: 55.16 },
  'Town Square': { lat: 25.015, lng: 55.29 },
  'Umm Suqeim': { lat: 25.145, lng: 55.2 },
}

/** The centre of a Home area, or null for "Somewhere else" and anything unknown. */
export function centreOf(area: string): LatLng | null {
  return Object.prototype.hasOwnProperty.call(AREA_CENTRES, area)
    ? AREA_CENTRES[area as keyof typeof AREA_CENTRES]
    : null
}

const EARTH_RADIUS_KM = 6371

/** Great-circle (haversine) distance in km. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** One-way travel time in minutes: 3 minutes per km, never under 10. */
export function travelMin(km: number): number {
  return Math.max(10, Math.round(3 * km))
}
