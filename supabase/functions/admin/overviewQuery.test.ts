import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { OVERVIEW_SQL } from './overviewQuery'

const read = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

// The twin pipes each test file through stdin, so it cannot import the statement: the twin test
// embeds it, and this keeps the two identical.
describe('the Overview query', () => {
  it('is one read-only select', () => {
    expect(OVERVIEW_SQL).toMatch(/^(with|select) /)
    expect(OVERVIEW_SQL).not.toMatch(/\b(insert|update|delete|drop|alter|create|truncate)\b/i)
    expect(OVERVIEW_SQL).not.toContain(';')
  })
  it('is embedded unchanged in the twin test', () => {
    expect(read('supabase/tests/admin_overview.test.sql')).toContain(OVERVIEW_SQL.replace(/\r\n/g, '\n'))
  })
})
