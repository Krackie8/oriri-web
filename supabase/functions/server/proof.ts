/**
 * The Proof rules (DEC-003, #72 grilling 2026-11-20) that need no storage: Dubai mealtimes, the time
 * gate, the quiet flag for a pace she could not have kept, and stripping a photo's metadata.
 * Pure functions, so vitest drives them directly.
 */

const DUBAI_OFFSET_MS = 4 * 3600_000 // UTC+4, no daylight saving
const MIN_MS = 60_000

export type Mealtime = 'breakfast' | 'lunch' | 'dinner'

/** Breakfast before 11:00, lunch 11:00 to 16:00, dinner from 16:00, by the Dubai clock. */
export function mealtimeOf(at: Date): Mealtime {
  const hour = new Date(at.getTime() + DUBAI_OFFSET_MS).getUTCHours()
  return hour < 11 ? 'breakfast' : hour < 16 ? 'lunch' : 'dinner'
}

/** The Dubai calendar day containing `at`, as UTC instants [from, to). */
export function dubaiDayBounds(at: Date): { from: string; to: string } {
  const local = new Date(at.getTime() + DUBAI_OFFSET_MS)
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - DUBAI_OFFSET_MS
  return { from: new Date(midnight).toISOString(), to: new Date(midnight + 86_400_000).toISOString() }
}

/** The time gate: a Suggestion can be completed once its duration could have passed since she was shown it. */
export const gateOpensAt = (shownAt: string, minutes: number) => new Date(Date.parse(shownAt) + minutes * MIN_MS)

/** One of today's live Completions, as the flag rule sees it. */
export interface LiveCompletion {
  id: string
  completedAt: string
  /** When she was shown its Suggestion (Check-in or swap). */
  shownAt: string
  minutes: number
}

const BURST_SIZE = 3
const BURST_WINDOW_MS = 10 * MIN_MS
const MARGIN_MS = 15 * MIN_MS

/**
 * The Completions to flag quietly: 3 or more ticked within 10 minutes, the last of them less than
 * 15 minutes after the earliest moment she could have done them all one after another (the
 * earliest of their Suggestions being shown, plus all their durations). An evening Wrap-up after a
 * morning Check-in is never flagged. Flags never change what she sees.
 */
export function burstFlags(live: LiveCompletion[]): string[] {
  const rows = live.map((c) => ({ ...c, at: Date.parse(c.completedAt), shown: Date.parse(c.shownAt) })).sort((a, b) => a.at - b.at)
  const flagged = new Set<string>()
  for (const last of rows) {
    const burst = rows.filter((r) => r.at <= last.at && r.at >= last.at - BURST_WINDOW_MS)
    if (burst.length < BURST_SIZE) continue
    const backToBack = Math.min(...burst.map((r) => r.shown)) + burst.reduce((t, r) => t + r.minutes, 0) * MIN_MS
    if (last.at < backToBack + MARGIN_MS) burst.forEach((r) => flagged.add(r.id))
  }
  return [...flagged]
}

/**
 * A JPEG with every metadata segment removed: APP1 to APP15 (EXIF, with any location, XMP, ICC)
 * and comments. APP0 (JFIF) and the image itself are kept byte for byte. Null for anything that
 * is not a well-formed JPEG with image data. This is the server's lock; the browser's redraw
 * on a canvas is the first.
 */
export function stripJpegMetadata(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  const out: number[] = [0xff, 0xd8]
  let i = 2
  while (i < bytes.length) {
    if (bytes[i] !== 0xff) return null
    const marker = bytes[i + 1]
    if (marker === undefined) return null
    if (marker === 0xff) { i++; continue } // fill byte
    if (marker === 0xd9) return null // end of image before any image data
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { out.push(0xff, marker); i += 2; continue }
    if (i + 3 >= bytes.length) return null
    const len = (bytes[i + 2] << 8) | bytes[i + 3]
    if (len < 2 || i + 2 + len > bytes.length) return null
    const end = i + 2 + len
    if (marker === 0xda) {
      // Start of scan: the image data runs to the end of the file.
      const result = new Uint8Array(out.length + bytes.length - i)
      result.set(out, 0)
      result.set(bytes.subarray(i), out.length)
      return result
    }
    const metadata = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe
    if (!metadata) for (let k = i; k < end; k++) out.push(bytes[k])
    i = end
  }
  return null
}
