export const LOGIN_PATH = '/login'
export const DEFAULT_AFTER_LOGIN = '/'

function pathnameOf(raw: string): string {
  const withoutHash = raw.split('#')[0] ?? raw
  const withoutQuery = withoutHash.split('?')[0] ?? withoutHash
  return withoutQuery
}

export function isProtectedPath(path: string): boolean {
  const pathname = pathnameOf(path)
  return pathname !== LOGIN_PATH
}

export function safeRedirect(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_AFTER_LOGIN
  if (!raw.startsWith('/') || raw.startsWith('//')) return DEFAULT_AFTER_LOGIN

  const pathname = pathnameOf(raw)
  if (pathname === LOGIN_PATH) return DEFAULT_AFTER_LOGIN
  if (!isProtectedPath(pathname)) return DEFAULT_AFTER_LOGIN

  return raw
}

export function parseAllowedEmails(raw: string): string[] {
  return raw
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isAllowedEmail(
  email: string | null | undefined,
  allowed: string[],
): boolean {
  if (!email || allowed.length === 0) return false
  return allowed.includes(email.trim().toLowerCase())
}
