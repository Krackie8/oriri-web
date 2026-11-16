import { readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { CATALOGUE_SEED, catalogueSeedSql } from './catalogueSeed'
import { checkIn, createMemoryBestieStore, BESTIE_ENGINE_VERSION, PILLARS } from './bestie'
import { OPTION_KEYS } from '../../../src/app/wellness/bestie/engine'

const migration = () => {
  const f = readdirSync('supabase/migrations').find((n) => n.endsWith('_bestie_catalogue_seed.sql'))
  if (!f) throw new Error('no catalogue seed migration')
  return readFileSync(`supabase/migrations/${f}`, 'utf8').replace(/\r\n/g, '\n')
}

describe('the Catalogue seed', () => {
  it('the migration inserts exactly the seed rows', () => {
    expect(migration()).toContain(catalogueSeedSql())
  })

  it("keys every seeded option by the engine's slug, plus the light Meet up reach-out", () => {
    const slugs = CATALOGUE_SEED.map((i) => i.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(slugs.filter((s) => !OPTION_KEYS.includes(s))).toEqual(['reachout'])
    // Treats are not a Pillar: left out, except the walk-and-talk.
    expect(OPTION_KEYS.filter((k) => !slugs.includes(k)).sort()).toEqual(['bookshop', 'manipedi'])
  })

  it('every Pillar has a free light fallback for every energy', () => {
    for (const p of PILLARS) {
      const f = CATALOGUE_SEED.filter((i) => i.light && i.fallback && i.pillars.length === 1 && i.pillars[0] === p)
      expect(f.length, p).toBeGreaterThan(0)
      expect(f.every((i) => i.costAed === 0 && i.energyFit.length === 3), p).toBe(true)
    }
  })
})

/** The plan for every energy x time x budget x goal, hashed. A change here means the rules changed. */
const FINGERPRINTS: Record<string, string> = {
  'bestie-1': '9ce2508478d8e817',
}

describe('the engine version', () => {
  it('changes whenever the fitting changes', async () => {
    const lines: string[] = []
    for (const now of [new Date('2026-11-16T05:00:00Z'), new Date('2026-07-10T05:00:00Z')])
      for (const energy of ['low', 'steady', 'high'])
        for (const minutes of [30, 60, 120, 240])
          for (const budgetAed of [0, 100, 250, 500])
            for (const goal of [null, 'recharge', 'focus', 'glow', 'connect', 'unwind']) {
              const store = createMemoryBestieStore({ members: [{ id: 'm', home_area: 'Deira' }] })
              const r = await checkIn(store, { id: 'm' }, { energy, minutes, budgetAed, goal }, now)
              if (r.outcome !== 'planned') throw new Error('no plan')
              lines.push(r.plan.suggestions.map((s) => `${s.slug}:${s.why}`).join('|'))
            }
    const hash = createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 16)
    expect(hash, `fitting changed: bump BESTIE_ENGINE_VERSION and add its fingerprint`).toBe(FINGERPRINTS[BESTIE_ENGINE_VERSION])
  })
})
