/** What the Profile and the Day screen say about Levels and Status (#73, DEC-011). Pure: no React, no I/O. */
import type { PillarNumbers, Progress, ProfileOutcome } from '../functionClient'
import type { Result } from '../functionClient/types'

export const PILLAR_LABEL = { move: 'Move', meal: 'Meal', mindset: 'Mindset', meet_up: 'Meet up' } as const
type Pillar = keyof typeof PILLAR_LABEL

/** Clockwise from the top. */
export const CHART_AXES: Pillar[] = ['move', 'meal', 'mindset', 'meet_up']

/** The polygon for a set of Levels, in a square of side 2·r centred at (r, r). Level 10 reaches the edge. */
export function chartPoints(levels: PillarNumbers, r: number): string {
  return CHART_AXES.map((p, i) => {
    const v = Math.min(10, Math.max(0, levels[p] ?? 0)) / 10
    const ang = -Math.PI / 2 + (i * Math.PI) / 2
    const x = Math.round((r + r * v * Math.cos(ang)) * 100) / 100
    const y = Math.round((r + r * v * Math.sin(ang)) * 100) / 100
    return `${x},${y}`
  }).join(' ')
}

/** The inline note after a Completion that raised a Level; not a moment. */
export function levelUpLine(levelUps: Progress['levelUps']): string | null {
  if (!levelUps.length) return null
  const [first, ...rest] = levelUps
  const head = `${PILLAR_LABEL[first.pillar]} is now Level ${first.level}`
  if (!rest.length) return `${head}.`
  return `${head}, and ${rest.map((u) => `${PILLAR_LABEL[u.pillar]} Level ${u.level}`).join(', and ')}.`
}

export function toNextLine(points: number, nextAt: number | null, level: number): string {
  if (nextAt === null) return 'Top Level'
  const left = Math.max(1, nextAt - points)
  return `${left} point${left === 1 ? '' : 's'} to Level ${level + 1}`
}

/** Share the image through the phone's share sheet when it takes files; otherwise save it. */
export function shareMethod(nav: { canShare?: (d: { files?: File[] }) => boolean }): 'share' | 'download' {
  try {
    return nav.canShare && nav.canShare({ files: [new File([new Uint8Array(1)], 'oriri-status.png', { type: 'image/png' })] }) ? 'share' : 'download'
  } catch {
    return 'download'
  }
}

export function profileScreen(r: Result<ProfileOutcome>): 'member' | 'guest' | 'error' {
  if (!r.ok) return 'error'
  return r.data.outcome === 'profile' ? 'member' : 'guest'
}

/** "a Glowing Clean Eater", "an Iconic Balanced". */
export const withArticle = (name: string) => `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`

/**
 * The link sent with a shared Status: Bestie on the live site, tagged so shares show up in analytics.
 * It names no Member and opens nothing of hers; crediting her for who joins is its own ticket.
 */
export const SHARE_LINK = 'https://www.oriri.me/bestie?utm_source=status_share&utm_medium=share&utm_campaign=status'

export const shareText = (statusName: string) =>
  `I’m now ${withArticle(statusName)} on Oriri. Bestie plans my day around my energy, time and budget. Try it free: ${SHARE_LINK}`
