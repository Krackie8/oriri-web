import { describe, expect, it } from 'vitest'
import { burstFlags, dubaiDayBounds, gateOpensAt, mealtimeOf, stripJpegMetadata, type LiveCompletion } from './proof'

// Dubai is UTC+4: 11:00 in Dubai is 07:00Z.
const dubaiAt = (hhmm: string) => new Date(`2026-11-20T${hhmm}:00+04:00`)

describe('mealtimeOf (Dubai clock time)', () => {
  it('splits the day into breakfast, lunch and dinner at 11:00 and 16:00', () => {
    expect(mealtimeOf(dubaiAt('00:30'))).toBe('breakfast')
    expect(mealtimeOf(dubaiAt('10:59'))).toBe('breakfast')
    expect(mealtimeOf(dubaiAt('11:00'))).toBe('lunch')
    expect(mealtimeOf(dubaiAt('15:59'))).toBe('lunch')
    expect(mealtimeOf(dubaiAt('16:00'))).toBe('dinner')
    expect(mealtimeOf(dubaiAt('23:59'))).toBe('dinner')
  })

  it('uses Dubai time, not UTC', () => {
    expect(mealtimeOf(new Date('2026-11-20T08:00:00Z'))).toBe('lunch') // 12:00 in Dubai
  })
})

describe('dubaiDayBounds', () => {
  it('gives the Dubai calendar day as UTC instants', () => {
    expect(dubaiDayBounds(dubaiAt('23:30'))).toEqual({ from: '2026-11-19T20:00:00.000Z', to: '2026-11-20T20:00:00.000Z' })
  })
})

describe('gateOpensAt', () => {
  it('opens once the item could have been done since she was shown it', () => {
    expect(gateOpensAt('2026-11-20T05:00:00.000Z', 45).toISOString()).toBe('2026-11-20T05:45:00.000Z')
    expect(gateOpensAt('2026-11-20T05:00:00.000Z', 0).toISOString()).toBe('2026-11-20T05:00:00.000Z')
  })
})

describe('burstFlags: a pace she could not have kept', () => {
  const T0 = Date.parse('2026-11-20T05:00:00.000Z') // her Check-in, 09:00 in Dubai
  const min = 60_000
  const c = (id: string, at: number, minutes: number, shownAt = T0): LiveCompletion => ({
    id, completedAt: new Date(at).toISOString(), shownAt: new Date(shownAt).toISOString(), minutes,
  })

  it('flags all of a burst ticked the moment the gates open (the prototype "Trying to game it")', () => {
    const live = [c('a', T0 + 30 * min, 10), c('b', T0 + 30 * min + 20_000, 10), c('c', T0 + 31 * min, 5), c('d', T0 + 31 * min + 30_000, 5)]
    expect(burstFlags(live).sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('does not flag the same burst in an evening Wrap-up after a morning Check-in', () => {
    const eve = T0 + 11 * 60 * min // 20:00 in Dubai
    const live = [c('a', eve, 10), c('b', eve + min, 10), c('c', eve + 2 * min, 5), c('d', eve + 3 * min, 5)]
    expect(burstFlags(live)).toEqual([])
  })

  it('does not flag two quick ticks', () => {
    expect(burstFlags([c('a', T0 + 30 * min, 10), c('b', T0 + 30 * min + 10_000, 10)])).toEqual([])
  })

  it('does not count ticks more than 10 minutes apart as one burst', () => {
    const live = [c('a', T0 + 10 * min, 5), c('b', T0 + 21 * min, 5), c('c', T0 + 32 * min, 5)]
    expect(burstFlags(live)).toEqual([])
  })

  it('stops flagging once 15 minutes have passed beyond the back-to-back time', () => {
    // 3 items, 10 min each: back to back by T0+30; the margin ends at T0+45.
    const at = (m: number) => [c('a', T0 + m * min, 10), c('b', T0 + m * min + 30_000, 10), c('c', T0 + (m + 1) * min, 10)]
    expect(burstFlags(at(43)).length).toBe(3)
    expect(burstFlags(at(45))).toEqual([])
  })

  it('starts the back-to-back clock at the earliest Suggestion in the burst (a swap is later)', () => {
    const live = [c('a', T0 + 40 * min, 10), c('b', T0 + 40 * min + 30_000, 10), c('c', T0 + 41 * min, 10, T0 + 30 * min)]
    expect(burstFlags(live).length).toBe(3) // earliest shown T0, 30 min back to back, margin to T0+45
  })
})

describe('stripJpegMetadata', () => {
  const seg = (marker: number, payload: number[]) => [0xff, marker, ((payload.length + 2) >> 8) & 0xff, (payload.length + 2) & 0xff, ...payload]
  const ascii = (s: string) => [...s].map((ch) => ch.charCodeAt(0))
  const jfif = seg(0xe0, [...ascii('JFIF'), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0])
  const exifWithGps = seg(0xe1, [...ascii('Exif'), 0, 0, ...ascii('GPS 25.0800N 55.1400E')])
  const comment = seg(0xfe, ascii('shot on my phone'))
  const dqt = seg(0xdb, [0, ...new Array(64).fill(1)])
  const sos = [...seg(0xda, [1, 1, 0, 0, 63, 0]), 0x12, 0x34, 0xff, 0x00, 0x56, 0xff, 0xd9]
  const jpeg = (...parts: number[][]) => new Uint8Array([0xff, 0xd8, ...parts.flat()])
  const has = (bytes: Uint8Array, text: string) => new TextDecoder('latin1').decode(bytes).includes(text)

  it('removes EXIF (with its location) and comments, and keeps the image data', () => {
    const out = stripJpegMetadata(jpeg(jfif, exifWithGps, comment, dqt, sos))
    expect(out).not.toBeNull()
    expect(has(out!, 'Exif')).toBe(false)
    expect(has(out!, 'GPS')).toBe(false)
    expect(has(out!, 'shot on')).toBe(false)
    expect([...out!]).toEqual([0xff, 0xd8, ...jfif, ...dqt, ...sos])
  })

  it('refuses anything that is not a JPEG', () => {
    expect(stripJpegMetadata(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))).toBeNull()
    expect(stripJpegMetadata(new Uint8Array([1, 2, 3]))).toBeNull()
    expect(stripJpegMetadata(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00]))).toBeNull() // truncated
    expect(stripJpegMetadata(jpeg(jfif, dqt))).toBeNull() // no image data
  })
})
