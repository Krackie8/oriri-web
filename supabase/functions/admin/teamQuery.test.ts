import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TEAM_CHANGES_SQL, TEAM_GRANT_SQL, TEAM_LIST_SQL, TEAM_REMOVE_SQL } from './teamQuery'

const read = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

// The twin pipes each test file through stdin, so it cannot import the statements: the twin test
// embeds them, and this keeps the two identical.
describe.each([
  ['the Team list query', TEAM_LIST_SQL],
  ['the Team changes query', TEAM_CHANGES_SQL],
])('%s', (_name, sql) => {
  it('is one read-only select', () => {
    expect(sql).toMatch(/^(with|select) /)
    expect(sql).not.toMatch(/\b(insert|update|delete|drop|alter|create|truncate|set)\b/i)
    expect(sql).not.toContain(';')
  })
})

describe.each([
  ['the Team grant statement', TEAM_GRANT_SQL],
  ['the Team remove statement', TEAM_REMOVE_SQL],
])('%s', (_name, sql) => {
  it('is one statement that never reads auth.users (it runs as service_role)', () => {
    expect(sql).not.toContain(';')
    expect(sql).not.toMatch(/\bauth\./)
    expect(sql).not.toMatch(/\b(drop|alter|create|truncate|grant|revoke)\b/i)
  })
  it('records the change in bestie.team_changes', () => {
    expect(sql).toMatch(/insert into bestie\.team_changes/)
  })
})

describe('the Team remove statement', () => {
  it('locks the live admin rows', () => {
    expect(TEAM_REMOVE_SQL).toMatch(/for update/)
  })
})

describe.each([
  ['TEAM_LIST_SQL', TEAM_LIST_SQL],
  ['TEAM_GRANT_SQL', TEAM_GRANT_SQL],
  ['TEAM_REMOVE_SQL', TEAM_REMOVE_SQL],
  ['TEAM_CHANGES_SQL', TEAM_CHANGES_SQL],
])('%s', (_name, sql) => {
  it('is embedded unchanged in the twin test', () => {
    expect(read('supabase/tests/admin_team.test.sql')).toContain(sql.replace(/\r\n/g, '\n'))
  })
})
