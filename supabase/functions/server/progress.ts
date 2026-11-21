/**
 * Points, Levels and Status (GLOSSARY.md, DEC-011). Pure rules: no I/O.
 * - A Completion earns 10 per Pillar, 5 if the item is light or a reach-out, 15 with QR Proof, and full
 *   points in both Pillars of a two-Pillar item. An undo reverses it exactly.
 * - A Level (1–10) comes from the ledger and never drops: it is floored by the highest Level recorded
 *   before today's Dubai midnight. Today's Level-ups stay provisional, so a same-day undo can take one back.
 * - A Status is a Shape (balanced, one Pillar, or a pair) and a Tier (from total Levels). Stored as keys;
 *   the display names are placeholders, to be renamed with Ren.
 */
import type { Pillar } from './catalogueSeed.ts'

export const PILLAR_ORDER: Pillar[] = ['move', 'meal', 'mindset', 'meet_up']
export type Sums = Record<Pillar, number>
export type Levels = Record<Pillar, number>
export type Tier = 'rising' | 'glowing' | 'radiant' | 'iconic'
/** shape: 'balanced', a Pillar, or two Pillars sorted and joined by '+'. */
export interface Status { shape: string; tier: Tier }

export const POINTS = { normal: 10, light: 5, qr: 15 } as const

/** The ledger rows one Completion earns. */
export function pointsFor(item: { pillars: Pillar[]; light: boolean; kind: string }, proofKind: string): { pillar: Pillar; amount: number }[] {
  const amount = item.light || item.kind === 'reach_out' ? POINTS.light : proofKind === 'qr' ? POINTS.qr : POINTS.normal
  return item.pillars.map((pillar) => ({ pillar, amount }))
}

/** Points needed to reach Level 1..10. Tuned for ~3 normal Completions per Pillar a week. */
export const LEVEL_AT = [0, 30, 80, 160, 280, 450, 700, 1000, 1400, 1900] as const

export function levelOf(points: number): number {
  let level = 1
  LEVEL_AT.forEach((t, i) => { if (points >= t) level = i + 1 })
  return level
}

/** Points that reach the Level after `level`; null at the top. */
export const nextAt = (level: number): number | null => LEVEL_AT[level] ?? null

export const emptySums = (): Sums => ({ move: 0, meal: 0, mindset: 0, meet_up: 0 })

export function levelsFrom(sums: Sums, floor: Partial<Levels> = {}): Levels {
  const out = {} as Levels
  for (const p of PILLAR_ORDER) out[p] = Math.max(levelOf(sums[p] ?? 0), floor[p] ?? 1)
  return out
}

export function statusOf(levels: Levels, sums: Sums): Status {
  const sorted = PILLAR_ORDER.slice().sort((a, b) =>
    levels[b] - levels[a] || (sums[b] ?? 0) - (sums[a] ?? 0) || PILLAR_ORDER.indexOf(a) - PILLAR_ORDER.indexOf(b))
  const [a, b, c, d] = sorted
  let shape: string
  if (levels[a] - levels[d] <= 1) shape = 'balanced'
  else if (levels[a] - levels[b] >= 2) shape = a
  else if (levels[b] - levels[c] >= 1) shape = [a, b].sort().join('+')
  else shape = a
  const total = PILLAR_ORDER.reduce((s, p) => s + levels[p], 0) // 4..40
  const tier: Tier = total >= 28 ? 'iconic' : total >= 18 ? 'radiant' : total >= 9 ? 'glowing' : 'rising'
  return { shape, tier }
}

/** Placeholder names (DEC-011 Q5). Rename here; stored rows hold only keys. */
export const STATUS_NAMES = {
  tier: { rising: 'Rising', glowing: 'Glowing', radiant: 'Radiant', iconic: 'Iconic' } as Record<Tier, string>,
  shape: {
    balanced: 'Balanced', move: 'Mover', meal: 'Clean Eater', mindset: 'Calm Mind', meet_up: 'Connector',
    'meet_up+move': 'Social Mover', 'meal+meet_up': 'Table Setter', 'meal+move': 'Fuelled Mover',
    'mindset+move': 'Mindful Mover', 'meal+mindset': 'Nourished Mind', 'meet_up+mindset': 'Kind Connector',
  } as Record<string, string>,
}

export const statusName = (s: Status) => `${STATUS_NAMES.tier[s.tier]} ${STATUS_NAMES.shape[s.shape] ?? 'Balanced'}`

export const BASELINE: Status = { shape: 'balanced', tier: 'rising' }

/** A member_levels row, as the store reads it. */
export interface RecordedRow {
  id: string
  kind: 'level' | 'status'
  pillar: Pillar | null
  level: number | null
  shape: string | null
  tier: string | null
  reachedAt: string
}

export interface ProgressChanges {
  levels: Levels
  status: Status
  /** To announce: the new Level per Pillar that went up. */
  levelUps: { pillar: Pillar; level: number }[]
  /** To record: one row per Level crossed. */
  newLevelRows: { pillar: Pillar; level: number }[]
  /** Ids of today's rows that no longer hold (a same-day undo). */
  retract: string[]
  /** The Status to record and show, when it changed forwards. */
  moment: Status | null
}

const sameStatus = (r: RecordedRow, s: Status) => r.shape === s.shape && r.tier === s.tier
const byTime = (a: RecordedRow, b: RecordedRow) => Date.parse(a.reachedAt) - Date.parse(b.reachedAt)

/**
 * What to write after her ledger changed. `dayStart` is today's Dubai midnight: rows before it are
 * permanent, rows from it on are provisional.
 */
export function progressChanges(o: { sums: Sums; recorded: RecordedRow[]; dayStart: string }): ProgressChanges {
  const start = Date.parse(o.dayStart)
  const isToday = (r: RecordedRow) => Date.parse(r.reachedAt) >= start
  const levelRows = o.recorded.filter((r) => r.kind === 'level' && r.pillar && r.level)
  const floor: Partial<Levels> = {}
  for (const r of levelRows) if (!isToday(r)) floor[r.pillar!] = Math.max(floor[r.pillar!] ?? 1, r.level!)
  const levels = levelsFrom(o.sums, floor)

  const retract: string[] = []
  for (const r of levelRows) if (isToday(r) && r.level! > levels[r.pillar!]) retract.push(r.id)
  const levelUps: ProgressChanges['levelUps'] = []
  const newLevelRows: ProgressChanges['newLevelRows'] = []
  for (const p of PILLAR_ORDER) {
    const kept = levelRows.filter((r) => r.pillar === p && !retract.includes(r.id)).reduce((m, r) => Math.max(m, r.level!), 1)
    if (levels[p] > kept) {
      levelUps.push({ pillar: p, level: levels[p] })
      for (let l = kept + 1; l <= levels[p]; l++) newLevelRows.push({ pillar: p, level: l })
    }
  }

  const status = statusOf(levels, o.sums)
  const statusRows = o.recorded.filter((r) => r.kind === 'status').sort(byTime)
  const before = statusRows.filter((r) => !isToday(r))
  const todays = statusRows.filter(isToday)
  const latest = todays.at(-1) ?? before.at(-1)
  let moment: Status | null = null
  if (!(latest ? sameStatus(latest, status) : sameStatus({ shape: BASELINE.shape, tier: BASELINE.tier } as RecordedRow, status))) {
    // Back to a Status she held earlier today (or before today): take back the rows after it, quietly.
    let back = -2
    for (let i = todays.length - 1; i >= 0; i--) if (sameStatus(todays[i], status)) { back = i; break }
    if (back === -2) {
      const prior = before.at(-1)
      if (prior ? sameStatus(prior, status) : status.shape === BASELINE.shape && status.tier === BASELINE.tier) back = -1
    }
    if (back > -2) retract.push(...todays.slice(back + 1).map((r) => r.id))
    else moment = status
  }
  return { levels, status, levelUps, newLevelRows, retract, moment }
}
