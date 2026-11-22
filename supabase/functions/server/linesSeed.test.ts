import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DAILY_LINES_SEED, RENS_APPROVALS, linesSeedSql, lineProblems, renApprovalSql, type SeedLine } from './linesSeed'
import { LINE_MOMENTS } from './morning'
import { PILLARS } from './bestie'

const migration = () => {
  const f = readdirSync('supabase/migrations').find((n) => n.endsWith('_bestie_daily_lines_seed.sql'))
  if (!f) throw new Error('no daily lines seed migration')
  return readFileSync(`supabase/migrations/${f}`, 'utf8').replace(/\r\n/g, '\n')
}
const reviewFile = () => readFileSync('docs/lines/2026-11-ren-voice.md', 'utf8').replace(/\r\n/g, '\n')

describe('the daily lines seed (DEC-013)', () => {
  it('the migration inserts exactly the seed', () => {
    expect(migration()).toContain(linesSeedSql())
  })

  it('the review file lists exactly the seed, in order, with its tags', () => {
    const listed = reviewFile().split('\n').filter((l) => l.startsWith('- [')).map((l) => l)
    const expected = DAILY_LINES_SEED.map((l) => `- [${[l.moment, l.goal ?? '-', l.pillar ?? '-', l.energy ?? '-'].join(' · ')}] ${l.body}`)
    expect(listed).toEqual(expected)
  })

  it('is big enough: 60 lines, and 14 general ones so the general line does not repeat for two weeks', () => {
    expect(DAILY_LINES_SEED.length).toBeGreaterThanOrEqual(60)
    expect(DAILY_LINES_SEED.filter((l) => l.moment === 'any' && !l.goal && !l.pillar && !l.energy).length).toBeGreaterThanOrEqual(14)
  })

  it('covers every moment, Goal, Pillar and energy at least twice', () => {
    const count = (f: (l: SeedLine) => boolean) => DAILY_LINES_SEED.filter(f).length
    for (const m of LINE_MOMENTS) expect(count((l) => l.moment === m), m).toBeGreaterThanOrEqual(2)
    for (const g of ['recharge', 'focus', 'glow', 'connect', 'unwind']) expect(count((l) => l.goal === g), g).toBeGreaterThanOrEqual(2)
    for (const p of PILLARS) expect(count((l) => l.pillar === p), p).toBeGreaterThanOrEqual(2)
    for (const e of ['low', 'steady', 'high']) expect(count((l) => l.energy === e), e).toBeGreaterThanOrEqual(2)
  })

  it('every line keeps the voice rules', () => {
    expect(DAILY_LINES_SEED.flatMap((l) => lineProblems(l.body).map((p) => `${l.body}: ${p}`))).toEqual([])
    expect(new Set(DAILY_LINES_SEED.map((l) => l.body)).size).toBe(DAILY_LINES_SEED.length)
  })

  it('emoji on at most 40% of the lines', () => {
    const withEmoji = DAILY_LINES_SEED.filter((l) => /[✨🌸]$/u.test(l.body)).length
    expect(withEmoji / DAILY_LINES_SEED.length).toBeLessThanOrEqual(0.4)
  })

  it("Ren's approvals: the migration signs exactly the approved bodies, and each is a seed line", () => {
    const f = readdirSync('supabase/migrations').find((n) => n.endsWith('_bestie_daily_lines_ren_approved.sql'))
    if (!f) throw new Error('no Ren approval migration')
    const sql = readFileSync(`supabase/migrations/${f}`, 'utf8').replace(/\r\n/g, '\n')
    expect(sql).toContain(renApprovalSql())
    const seed = new Set(DAILY_LINES_SEED.map((l) => l.body))
    expect(RENS_APPROVALS.filter((b) => !seed.has(b))).toEqual([])
    expect(new Set(RENS_APPROVALS).size).toBe(RENS_APPROVALS.length)
    expect(RENS_APPROVALS.length).toBe(64)
  })

  it('the rules catch what they guard (red-proof)', () => {
    expect(lineProblems('a'.repeat(91))).toContain('over 90 characters')
    expect(lineProblems('Skip the diet talk today.')).toContain('off-limits word: diet')
    expect(lineProblems('I love this one.')).toContain('off-limits word: I')
    expect(lineProblems('Two of them ✨🌸')).toContain('more than one emoji')
    expect(lineProblems('✨ at the start')).toContain('emoji only at the end')
    expect(lineProblems('A heart ❤️')).toContain('only ✨ or 🌸')
    expect(lineProblems('Small and steady still counts.')).toEqual([])
  })
})
