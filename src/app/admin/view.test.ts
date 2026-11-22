import { describe, expect, it } from 'vitest'
import { greeting, summaryLine, trendWord } from './view'
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
