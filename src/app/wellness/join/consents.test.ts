import { describe, expect, it } from 'vitest'
import { CONSENT_PURPOSES } from '../../../../supabase/functions/server/join'
import { CONSENT_LINES } from './consents'

describe('the join screen consents', () => {
  it('offer exactly the purposes the edge function records, in the same order', () => {
    expect(CONSENT_LINES.map((c) => c.purpose)).toEqual([...CONSENT_PURPOSES])
  })

  it('require only terms', () => {
    expect(CONSENT_LINES.filter((c) => c.required).map((c) => c.purpose)).toEqual(['terms'])
  })
})
