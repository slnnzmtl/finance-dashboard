import { describe, it, expect } from 'vitest'
import {
  DEFAULT_AFTER_LOGIN,
  isAllowedEmail,
  isProtectedPath,
  parseAllowedEmails,
  safeRedirect,
} from '~/utils/auth'

describe('isProtectedPath', () => {
  it('protects app routes including home and expenses', () => {
    expect(isProtectedPath('/')).toBe(true)
    expect(isProtectedPath('/expenses')).toBe(true)
  })

  it('does not protect login', () => {
    expect(isProtectedPath('/login')).toBe(false)
  })

  it('ignores query and hash when matching', () => {
    expect(isProtectedPath('/expenses?year=2026')).toBe(true)
    expect(isProtectedPath('/#top')).toBe(true)
  })
})

describe('safeRedirect', () => {
  it('keeps an in-app path including query', () => {
    expect(safeRedirect('/expenses?year=2026')).toBe('/expenses?year=2026')
  })

  it('falls back for login and unsafe values', () => {
    expect(safeRedirect('/login')).toBe(DEFAULT_AFTER_LOGIN)
    expect(safeRedirect('https://evil.com')).toBe(DEFAULT_AFTER_LOGIN)
    expect(safeRedirect('//evil.com')).toBe(DEFAULT_AFTER_LOGIN)
    expect(safeRedirect(undefined)).toBe(DEFAULT_AFTER_LOGIN)
    expect(safeRedirect(['/expenses'])).toBe(DEFAULT_AFTER_LOGIN)
  })
})

describe('parseAllowedEmails / isAllowedEmail', () => {
  it('parses, trims, and lowercases emails', () => {
    expect(parseAllowedEmails('A@X.com, b@x.com')).toEqual([
      'a@x.com',
      'b@x.com',
    ])
  })

  it('fails closed on empty allowlist or missing email', () => {
    expect(parseAllowedEmails('')).toEqual([])
    expect(parseAllowedEmails('  ,  ')).toEqual([])
    expect(isAllowedEmail('a@x.com', [])).toBe(false)
    expect(isAllowedEmail(null, ['a@x.com'])).toBe(false)
    expect(isAllowedEmail(undefined, ['a@x.com'])).toBe(false)
  })

  it('allows listed emails case-insensitively', () => {
    const allowed = parseAllowedEmails('A@X.com, b@x.com')
    expect(isAllowedEmail('a@x.com', allowed)).toBe(true)
    expect(isAllowedEmail('B@X.COM', allowed)).toBe(true)
    expect(isAllowedEmail('other@x.com', allowed)).toBe(false)
  })
})
