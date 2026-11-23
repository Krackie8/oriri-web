import { describe, expect, it } from 'vitest'
import { AFTER_SIGN_IN_KEY, consentWord, countWord, CONSENT_LABELS, dayWord, decideScreen, greeting, lastSignInWord, memberLoadProblem, signsInWithWord, summaryLine, teamProblemWord, timeWord, trendWord } from './view'
import type { Overview } from '../wellness/functionClient/admin'

const overview = (o: Partial<{ members: number; week: number }> = {}): Overview => ({
  visits: { week: o.week ?? 0, weekBefore: 0, month: 0, monthBefore: 0 },
  members: { total: o.members ?? 0, week: 0, month: 0 },
  activeWeek: 0,
  leads: 0,
  paying: null,
})

describe('greeting', () => {
  it.each([
    [8, 'Good morning'],
    [13, 'Good afternoon'],
    [20, 'Good evening'],
    [0, 'Good morning'],
    [11, 'Good morning'],
    [12, 'Good afternoon'],
    [16, 'Good afternoon'],
    [17, 'Good evening'],
  ])('at %i it says %s', (hour, words) => {
    expect(greeting(hour, null)).toBe(words)
    expect(greeting(hour, 'Ren')).toBe(`${words}, Ren`)
  })

  it('treats an empty name as no name', () => {
    expect(greeting(8, '')).toBe('Good morning')
  })
})

describe('trendWord', () => {
  it('shows a rise', () => expect(trendWord(108, 100)).toBe('+8%'))
  it('shows a fall with a real minus sign', () => expect(trendWord(88, 100)).toBe('−12%'))
  it('says same as before when equal', () => {
    expect(trendWord(5, 5)).toBe('same as before')
    expect(trendWord(0, 0)).toBe('same as before')
  })
  it('says new when there was nothing before', () => expect(trendWord(4, 0)).toBe('new'))
  it('rounds to a whole percent', () => expect(trendWord(101, 300)).toBe('−66%'))
})

describe('summaryLine', () => {
  it('shows zeros plainly', () => expect(summaryLine(overview())).toBe('0 Members · 0 visits this week'))
  it('shortens thousands', () => expect(summaryLine(overview({ members: 248, week: 3120 }))).toBe('248 Members · 3.1k visits this week'))
  it('does not show .0', () => expect(summaryLine(overview({ week: 3000 }))).toBe('0 Members · 3k visits this week'))
  it('keeps 999 whole', () => expect(summaryLine(overview({ week: 999 }))).toBe('0 Members · 999 visits this week'))
})

describe('decideScreen', () => {
  it('waits while the session is unknown', () => expect(decideScreen(null, 0, { kind: 'pending' })).toBe('checking'))
  it('no session is the login, whatever the last result said', () => {
    expect(decideScreen(false, 2, { kind: 'ok', gen: 1, isAdmin: true })).toBe('login')
  })
  it('a session with no answer yet is checking', () => expect(decideScreen(true, 1, { kind: 'pending' })).toBe('checking'))
  it('an admin gets Home', () => expect(decideScreen(true, 1, { kind: 'ok', gen: 1, isAdmin: true })).toBe('home'))
  it('a signed-in Member gets the login, not an error', () => {
    expect(decideScreen(true, 1, { kind: 'ok', gen: 1, isAdmin: false })).toBe('login')
  })
  it('a 401 gets the login', () => expect(decideScreen(true, 1, { kind: 'unauthorised', gen: 1 })).toBe('login'))
  it('any other failure gets the retry line', () => expect(decideScreen(true, 1, { kind: 'failed', gen: 1 })).toBe('retry'))
  it('a result from an older session never shows Home', () => {
    expect(decideScreen(true, 2, { kind: 'ok', gen: 1, isAdmin: true })).toBe('checking')
    expect(decideScreen(true, 2, { kind: 'failed', gen: 1 })).toBe('checking')
  })
})

describe('dayWord', () => {
  const now = new Date('2026-11-22T21:30:00Z') // 23 Nov, 01:30 in Dubai
  it('says today across the UTC/Dubai midnight edge', () => {
    expect(dayWord('2026-11-22T20:00:00Z', now)).toBe('today') // 00:00 on 23 Nov in Dubai
    expect(dayWord('2026-11-23T05:00:00Z', now)).toBe('today')
  })
  it('says yesterday', () => {
    expect(dayWord('2026-11-22T19:59:00Z', now)).toBe('yesterday') // 23:59 on 22 Nov in Dubai
    expect(dayWord('2026-11-21T20:00:00Z', now)).toBe('yesterday')
  })
  it('shows a date this year without the year', () => expect(dayWord('2026-11-14T08:00:00Z', now)).toBe('14 Nov'))
  it('adds the year for another year', () => expect(dayWord('2025-11-14T08:00:00Z', now)).toBe('14 Nov 2025'))
  it('uses the Dubai date, not the UTC one', () => expect(dayWord('2026-11-13T21:00:00Z', now)).toBe('14 Nov'))
  it('handles the new year edge', () => {
    expect(dayWord('2026-12-31T19:30:00Z', new Date('2027-01-01T10:00:00Z'))).toBe('yesterday')
  })
})

describe('timeWord', () => {
  it('shows Dubai time with two digits', () => {
    expect(timeWord('2026-11-23T05:12:00Z')).toBe('09:12')
    expect(timeWord('2026-11-22T20:05:00Z')).toBe('00:05')
  })
})

describe('lastSignInWord', () => {
  const now = new Date('2026-11-23T08:00:00Z')
  it('says Never signed in', () => expect(lastSignInWord(null)).toBe('Never signed in'))
  it('says when', () => {
    expect(lastSignInWord('2026-11-23T05:00:00Z', now)).toBe('Last sign-in today')
    expect(lastSignInWord('2026-11-14T05:00:00Z', now)).toBe('Last sign-in 14 Nov')
  })
})

describe('consentWord', () => {
  it('maps the three states', () => {
    expect(consentWord(true)).toBe('✓')
    expect(consentWord(false)).toBe('✗')
    expect(consentWord(null)).toBe('Not asked')
  })
})

describe('CONSENT_LABELS', () => {
  it('names each purpose', () => {
    expect(CONSENT_LABELS).toEqual({ terms: 'Terms', location: 'Location', wellness_signals: 'Wellness', personalisation: 'Personalisation', push: 'Push', marketing: 'Marketing' })
  })
})

describe('signsInWithWord', () => {
  it('joins the ways in plain words', () => {
    expect(signsInWithWord(['email', 'google'])).toBe('email and Google')
    expect(signsInWithWord(['email'])).toBe('email')
    expect(signsInWithWord(['apple'])).toBe('another way')
    expect(signsInWithWord([])).toBe('')
  })
})

describe('teamProblemWord', () => {
  it('says each problem plainly', () => {
    expect(teamProblemWord('reauth')).toBe('For safety, sign in again to change the team.')
    expect(teamProblemWord('invalid')).toBe("That doesn't look like an email address.")
    expect(teamProblemWord('self')).toBe("You can't remove yourself.")
    expect(teamProblemWord('last')).toBe('The team needs at least one admin.')
    expect(teamProblemWord('other')).toBe("That didn't work. Try again.")
  })
})

describe('AFTER_SIGN_IN_KEY', () => {
  it('is the agreed key', () => expect(AFTER_SIGN_IN_KEY).toBe('oriri-admin-after'))
})

describe('countWord', () => {
  it('uses the singular for one only', () => {
    expect(countWord(1, 'admin', 'admins')).toBe('1 admin')
    expect(countWord(0, 'admin', 'admins')).toBe('0 admins')
    expect(countWord(3, 'Member', 'Members')).toBe('3 Members')
  })
})

describe('memberLoadProblem', () => {
  it('a 404 says the Member is gone and offers no retry', () => {
    expect(memberLoadProblem(404)).toEqual({ message: "This Member isn't here any more.", canRetry: false })
  })
  it.each([[500], [0], [403], [undefined]])('status %s keeps the generic message and a retry', (status) => {
    expect(memberLoadProblem(status)).toEqual({ message: "Couldn't load Members.", canRetry: true })
  })
})
