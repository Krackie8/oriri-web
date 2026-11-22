import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

// The twin pipes each test file through stdin, so it cannot \i the query file: the twin test embeds
// the statement instead, and this keeps the two identical.
describe('the bestie-3 baseline query', () => {
  const statement = read('supabase/queries/engine_baseline.sql')
    .split('\n')
    .filter((l) => !l.startsWith('--'))
    .join('\n')
    .trim()
    .replace(/;$/, '')

  it('is one read-only select', () => {
    expect(statement).toMatch(/^select /)
    expect(statement).not.toMatch(/\b(insert|update|delete|drop|alter|create|truncate)\b/i)
    expect(statement).not.toContain(';')
  })

  it('is embedded unchanged in the twin test', () => {
    expect(read('supabase/tests/engine_baseline.test.sql')).toContain(statement)
  })
})
