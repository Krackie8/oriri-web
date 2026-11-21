import { describe, expect, it } from 'vitest'
import { chartPoints, levelUpLine, profileScreen, shareMethod, toNextLine, withArticle, CHART_AXES } from './progressView'

const L = (move: number, meal: number, mindset: number, meet_up: number) => ({ move, meal, mindset, meet_up })

describe('chartPoints: the spider chart polygon', () => {
  it('puts the four Pillars on fixed axes: Move up, Meal right, Mindset down, Meet up left', () => {
    expect(CHART_AXES).toEqual(['move', 'meal', 'mindset', 'meet_up'])
    expect(chartPoints(L(10, 10, 10, 10), 100)).toBe('100,0 200,100 100,200 0,100')
  })
  it('scales each Level along its axis, Level 1 near the centre', () => {
    expect(chartPoints(L(5, 0, 0, 0), 100)).toBe('100,50 100,100 100,100 100,100')
  })
  it('clamps anything outside 0..10', () => {
    expect(chartPoints(L(12, -1, 10, 10), 100)).toBe('100,0 100,100 100,200 0,100')
  })
})

describe('levelUpLine', () => {
  it('is null with nothing new', () => {
    expect(levelUpLine([])).toBeNull()
  })
  it('names the Pillar and the Level', () => {
    expect(levelUpLine([{ pillar: 'move', level: 3 }])).toBe('Move is now Level 3.')
    expect(levelUpLine([{ pillar: 'meal', level: 2 }, { pillar: 'meet_up', level: 2 }])).toBe('Meal is now Level 2, and Meet up Level 2.')
  })
})

describe('toNextLine', () => {
  it('counts the points to the next Level, or says it is the top', () => {
    expect(toNextLine(40, 80, 2)).toBe('40 points to Level 3')
    expect(toNextLine(79, 80, 2)).toBe('1 point to Level 3')
    expect(toNextLine(2000, null, 10)).toBe('Top Level')
  })
})

describe('shareMethod', () => {
  it('shares the image through the phone when it can, and downloads it otherwise', () => {
    expect(shareMethod({ canShare: (d: { files?: File[] }) => !!d.files })).toBe('share')
    expect(shareMethod({ canShare: () => false })).toBe('download')
    expect(shareMethod({})).toBe('download')
  })
})

describe('profileScreen: what /profile shows for each reply', () => {
  it('her Profile for a Member, the sign-in page otherwise, and an error kept apart', () => {
    expect(profileScreen({ ok: true, data: { outcome: 'profile', profile: {} as never } })).toBe('member')
    expect(profileScreen({ ok: true, data: { outcome: 'signedOut' } })).toBe('guest')
    expect(profileScreen({ ok: true, data: { outcome: 'notJoined' } })).toBe('guest')
    expect(profileScreen({ ok: false, error: { status: 500, message: 'x' } as never })).toBe('error')
  })
})

describe('withArticle', () => {
  it('uses "an" before a vowel', () => {
    expect(withArticle('Iconic Balanced')).toBe('an Iconic Balanced')
    expect(withArticle('Glowing Clean Eater')).toBe('a Glowing Clean Eater')
  })
})
