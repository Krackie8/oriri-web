import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MEMBER_DETAIL_SQL, MEMBERS_LIST_SQL } from './membersQuery'

const read = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

// The twin pipes each test file through stdin, so it cannot import the statements: the twin test
// embeds them, and this keeps the two identical.
describe.each([
  ['the Members list query', MEMBERS_LIST_SQL],
  ['the Member detail query', MEMBER_DETAIL_SQL],
])('%s', (_name, sql) => {
  it('is one read-only select', () => {
    expect(sql).toMatch(/^(with|select) /)
    expect(sql).not.toMatch(/\b(insert|update|delete|drop|alter|create|truncate|set)\b/i)
    expect(sql).not.toContain(';')
  })
  it('is embedded unchanged in the twin test', () => {
    expect(read('supabase/tests/admin_team.test.sql')).toContain(sql.replace(/\r\n/g, '\n'))
  })
})
