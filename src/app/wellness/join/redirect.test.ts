import { describe, expect, it } from 'vitest'
import { joinRedirectUrl } from './redirect'

describe('joinRedirectUrl', () => {
  it.each([
    ['https://www.oriri.me', 'https://www.oriri.me/join'],
    ['https://oriri.me', 'https://oriri.me/join'],
    ['https://new.oriri.me', 'https://new.oriri.me/join'],
    ['http://localhost:8443', 'http://localhost:8443/join'],
  ])('sends %s back to its own /join', (origin, expected) => {
    expect(joinRedirectUrl(origin)).toBe(expected)
  })

  it.each(['https://evil.example', 'https://oriri.me.evil.example', 'http://www.oriri.me', 'http://localhost:9999', ''])(
    'never hands out a link on %s: falls back to www.oriri.me',
    (origin) => {
      expect(joinRedirectUrl(origin)).toBe('https://www.oriri.me/join')
    },
  )
})
