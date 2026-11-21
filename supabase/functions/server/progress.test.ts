import { describe, expect, it } from 'vitest'
import {
  LEVEL_AT, levelOf, nextAt, pointsFor, progressChanges, statusName, statusOf,
  type Levels, type RecordedRow, type Status, type Sums,
} from './progress'

const sums = (s: Partial<Sums> = {}): Sums => ({ move: 0, meal: 0, mindset: 0, meet_up: 0, ...s })
const lv = (l: Partial<Levels> = {}): Levels => ({ move: 1, meal: 1, mindset: 1, meet_up: 1, ...l })

describe('pointsFor (DEC-011 Q1)', () => {
  const item = (o: { pillars?: string[]; light?: boolean; kind?: string } = {}) =>
    ({ pillars: (o.pillars ?? ['move']) as any, light: o.light ?? false, kind: o.kind ?? 'activity' })
  it('10 for a normal Completion', () => {
    expect(pointsFor(item(), 'tick')).toEqual([{ pillar: 'move', amount: 10 }])
  })
  it('5 for a light one or a reach-out', () => {
    expect(pointsFor(item({ pillars: ['meal'], light: true }), 'tick')).toEqual([{ pillar: 'meal', amount: 5 }])
    expect(pointsFor(item({ pillars: ['meet_up'], kind: 'reach_out' }), 'reach_out')).toEqual([{ pillar: 'meet_up', amount: 5 }])
  })
  it('15 for QR Proof', () => {
    expect(pointsFor(item({ pillars: ['meet_up'], kind: 'meetup' }), 'qr')).toEqual([{ pillar: 'meet_up', amount: 15 }])
  })
  it('full points in both Pillars of a two-Pillar item, QR included', () => {
    expect(pointsFor(item({ pillars: ['meal', 'meet_up'] }), 'tick')).toEqual([{ pillar: 'meal', amount: 10 }, { pillar: 'meet_up', amount: 10 }])
    expect(pointsFor(item({ pillars: ['meal', 'meet_up'] }), 'qr')).toEqual([{ pillar: 'meal', amount: 15 }, { pillar: 'meet_up', amount: 15 }])
  })
})

describe('levelOf and nextAt (DEC-011 Q3)', () => {
  it('uses the prototype thresholds', () => {
    expect(LEVEL_AT).toEqual([0, 30, 80, 160, 280, 450, 700, 1000, 1400, 1900])
  })
  it('crosses each edge exactly at its threshold', () => {
    expect(levelOf(0)).toBe(1)
    expect(levelOf(29)).toBe(1)
    expect(levelOf(30)).toBe(2)
    expect(levelOf(279)).toBe(4)
    expect(levelOf(280)).toBe(5)
    expect(levelOf(1899)).toBe(9)
    expect(levelOf(1900)).toBe(10)
    expect(levelOf(99999)).toBe(10)
    expect(levelOf(-5)).toBe(1)
  })
  it('nextAt gives the points for the next Level, null at 10', () => {
    expect(nextAt(1)).toBe(30)
    expect(nextAt(9)).toBe(1900)
    expect(nextAt(10)).toBeNull()
  })
})

describe('statusOf (DEC-011 Q5)', () => {
  it('Balanced when highest and lowest are at most 1 apart', () => {
    expect(statusOf(lv(), sums())).toEqual({ shape: 'balanced', tier: 'rising' })
    expect(statusOf(lv({ move: 3, meal: 2, mindset: 2, meet_up: 2 }), sums())).toEqual({ shape: 'balanced', tier: 'glowing' })
  })
  it('a single Pillar when the top is 2 or more above the second', () => {
    expect(statusOf(lv({ meal: 5, move: 2, mindset: 2 }), sums()).shape).toBe('meal')
  })
  it('a pair when the second is at least 1 above the third', () => {
    expect(statusOf(lv({ meal: 5, meet_up: 5, move: 2, mindset: 2 }), sums()).shape).toBe('meal+meet_up')
    expect(statusOf(lv({ move: 6, meet_up: 5, meal: 3 }), sums()).shape).toBe('meet_up+move')
  })
  it('otherwise single, with ties ordered by points then Move, Meal, Mindset, Meet up', () => {
    // 5,5,5,2: not Balanced, not single by gap, not a pair: the top by points.
    expect(statusOf(lv({ move: 5, meal: 5, mindset: 5, meet_up: 2 }), sums({ move: 300, meal: 320, mindset: 290 })).shape).toBe('meal')
    expect(statusOf(lv({ move: 5, meal: 5, mindset: 5, meet_up: 2 }), sums({ move: 300, meal: 300, mindset: 300 })).shape).toBe('move')
  })
  it('the tier comes from total Levels', () => {
    const total = (n: number): Levels => { const t = lv(); let left = n - 4; for (const p of ['move', 'meal', 'mindset', 'meet_up'] as const) { const add = Math.min(9, left); t[p] += add; left -= add } return t }
    expect(statusOf(total(8), sums()).tier).toBe('rising')
    expect(statusOf(total(9), sums()).tier).toBe('glowing')
    expect(statusOf(total(17), sums()).tier).toBe('glowing')
    expect(statusOf(total(18), sums()).tier).toBe('radiant')
    expect(statusOf(total(27), sums()).tier).toBe('radiant')
    expect(statusOf(total(28), sums()).tier).toBe('iconic')
    expect(statusOf(total(40), sums()).tier).toBe('iconic')
  })
  it('names are placeholders built from keys', () => {
    expect(statusName({ shape: 'balanced', tier: 'rising' })).toBe('Rising Balanced')
    expect(statusName({ shape: 'meal', tier: 'glowing' })).toBe('Glowing Clean Eater')
    expect(statusName({ shape: 'meet_up+move', tier: 'radiant' })).toBe('Radiant Social Mover')
  })
})

// A tiny ledger replay: applies each settle to the recorded rows the way the store does.
function replay() {
  let recorded: RecordedRow[] = []
  let n = 0
  return {
    settle(s: Sums, at: string, dayStart: string) {
      const ch = progressChanges({ sums: s, recorded, dayStart })
      recorded = recorded.filter((r) => !ch.retract.includes(r.id))
      for (const u of ch.newLevelRows) recorded.push({ id: `r${++n}`, kind: 'level', pillar: u.pillar, level: u.level, shape: null, tier: null, reachedAt: at })
      if (ch.moment) recorded.push({ id: `r${++n}`, kind: 'status', pillar: null, level: null, shape: ch.moment.shape, tier: ch.moment.tier, reachedAt: at })
      return ch
    },
    get rows() { return recorded },
  }
}
const named = (m: Status | null) => (m ? statusName(m) : null)

describe('progressChanges: the prototype scenario "Status changes"', () => {
  it('Balanced, then Clean Eater, then a pair, then a year of everything', () => {
    const r = replay()
    const day = (d: number) => ({ at: `2026-${String(11 + Math.floor(d / 30)).padStart(2, '0')}-${String((d % 30) + 1).padStart(2, '0')}T08:00:00.000Z`, dayStart: `2026-${String(11 + Math.floor(d / 30)).padStart(2, '0')}-${String((d % 30) + 1).padStart(2, '0')}T00:00:00.000Z` })
    // Reset: she starts Rising Balanced, silently.
    let s = sums()
    let ch = r.settle(s, day(0).at, day(0).dayStart)
    expect(named(ch.status)).toBe('Rising Balanced')
    expect(ch.moment).toBeNull()
    expect(r.rows).toEqual([])
    // Weeks of Meal Completions.
    s = sums({ meal: 300, move: 40, mindset: 30, meet_up: 10 })
    ch = r.settle(s, day(1).at, day(1).dayStart)
    expect(named(ch.moment)).toBe('Glowing Clean Eater')
    expect(ch.levels).toEqual({ move: 2, meal: 5, mindset: 2, meet_up: 1 })
    // Then lots of Meet ups.
    s = sums({ meal: 300, move: 60, mindset: 30, meet_up: 310 })
    ch = r.settle(s, day(2).at, day(2).dayStart)
    expect(named(ch.moment)).toBe('Glowing Table Setter')
    // A year of everything.
    s = sums({ meal: 1600, move: 1560, mindset: 1530, meet_up: 1610 })
    ch = r.settle(s, day(3).at, day(3).dayStart)
    expect(named(ch.moment)).toBe('Iconic Balanced')
    expect(ch.levels).toEqual({ move: 9, meal: 9, mindset: 9, meet_up: 9 })
  })
})

describe('progressChanges: Level-ups and never dropping (DEC-011 Q4, Q6, Q7)', () => {
  const today = { at: '2026-11-21T08:00:00.000Z', dayStart: '2026-11-20T20:00:00.000Z' }
  const tomorrow = { at: '2026-11-22T08:00:00.000Z', dayStart: '2026-11-21T20:00:00.000Z' }

  it('a Completion that crosses 30 is a Level-up, not a moment', () => {
    const r = replay()
    r.settle(sums({ move: 20 }), today.at, today.dayStart)
    const ch = r.settle(sums({ move: 30 }), today.at, today.dayStart)
    expect(ch.levelUps).toEqual([{ pillar: 'move', level: 2 }])
    expect(ch.moment).toBeNull()
  })

  it('a same-day undo takes back the Level-up and moment it caused, quietly', () => {
    const r = replay()
    r.settle(sums({ move: 20 }), today.at, today.dayStart)
    const up = r.settle(sums({ move: 80 }), today.at, today.dayStart)
    expect(up.levelUps).toEqual([{ pillar: 'move', level: 3 }])
    expect(named(up.moment)).toBe('Rising Mover')
    const undo = r.settle(sums({ move: 70 }), today.at, today.dayStart)
    expect(undo.levels.move).toBe(2)
    expect(undo.moment).toBeNull()
    expect(undo.levelUps).toEqual([])
    expect(named(undo.status)).toBe('Rising Balanced')
    expect(r.rows.map((x) => (x.kind === 'level' ? `L${x.level}` : x.shape))).toEqual(['L2'])
  })

  it('yesterday\'s Level survives an undo today, and a later threshold change', () => {
    const r = replay()
    r.settle(sums({ move: 30 }), today.at, today.dayStart)
    // Tomorrow the ledger reads lower (an undo of an older row cannot happen, but a retune can).
    const ch = r.settle(sums({ move: 25 }), tomorrow.at, tomorrow.dayStart)
    expect(ch.levels.move).toBe(2)
    expect(ch.retract).toEqual([])
  })

  it('undoing back to the Status she had earlier today retracts only the rows after it', () => {
    const r = replay()
    r.settle(sums({ meal: 280, move: 30, mindset: 30 }), today.at, today.dayStart) // Glowing Clean Eater
    r.settle(sums({ meal: 280, meet_up: 280, move: 30, mindset: 30 }), today.at, today.dayStart) // Glowing Table Setter
    const back = r.settle(sums({ meal: 280, meet_up: 150, move: 30, mindset: 30 }), today.at, today.dayStart)
    expect(back.moment).toBeNull()
    expect(named(back.status)).toBe('Glowing Clean Eater')
    expect(r.rows.filter((x) => x.kind === 'status').map((x) => statusName({ shape: x.shape!, tier: x.tier as any }))).toEqual(['Glowing Clean Eater'])
  })

  it('a jump of several Levels is announced once, and recorded one row per Level crossed', () => {
    const r = replay()
    const ch = r.settle(sums({ move: 160 }), today.at, today.dayStart)
    expect(ch.levelUps).toEqual([{ pillar: 'move', level: 4 }])
    expect(ch.newLevelRows).toEqual([{ pillar: 'move', level: 2 }, { pillar: 'move', level: 3 }, { pillar: 'move', level: 4 }])
  })
})
