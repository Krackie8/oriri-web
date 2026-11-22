/**
 * The Postgres store's SQL in index.tsx is replayed in the twin with literals, which cannot show how the
 * driver binds a parameter. postgres.js encodes a JS string bound to ::jsonb as JSON again, so
 * `${JSON.stringify(x)}::jsonb` arrives as a JSON string, not an array (#73: every tick failed on live
 * with "cannot call jsonb_to_recordset on a non-array"). Bind JSON with tx.json(x) instead.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const src = readFileSync(new URL('./index.tsx', import.meta.url), 'utf8')

describe('the Postgres store binds JSON the way postgres.js expects', () => {
  it('never casts a JSON.stringify(...) parameter to jsonb', () => {
    expect(src.match(/\$\{JSON\.stringify\([^}]*\)\}::jsonb/g) ?? []).toEqual([])
  })
  it('the points and Level inserts use tx.json (a floor, so the guard cannot pass on nothing)', () => {
    expect(src).toContain('jsonb_to_recordset(${tx.json(nc.points)}::jsonb)')
    expect(src).toContain('jsonb_to_recordset(${tx.json(ch.newLevelRows)}::jsonb)')
  })
})

describe('the morning store reads dates as text (#74)', () => {
  // postgres.js turns a date column into a JS Date; the module compares YYYY-MM-DD strings.
  it('every date it reads comes through to_char', () => {
    expect(src).toContain("to_char(completed_at at time zone 'Asia/Dubai', 'YYYY-MM-DD') as day")
    expect(src).toContain("to_char(show_on, 'YYYY-MM-DD') as show_on")
    expect(src).toContain("to_char(ends_on, 'YYYY-MM-DD') as ends_on")
    expect(src).toContain("to_char(shown_on, 'YYYY-MM-DD') as shown_on")
    expect(src).toContain("to_char(m.created_at at time zone 'Asia/Dubai', 'YYYY-MM-DD') as joined_on")
  })
})
