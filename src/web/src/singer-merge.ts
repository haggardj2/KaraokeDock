export type SingerLoginProvider = 'google' | 'facebook' | 'oidc' | 'local'

export type SingerMergeLogin = {
  userId: number
  username: string
  provider: SingerLoginProvider
  role: 'admin' | 'user'
  isActive: boolean
}

export type SingerMergeCandidate = {
  singerId: string
  displayName: string
  status: string
  historyCount: number
  accountLogins: SingerMergeLogin[]
}

export type SingerMergeCandidates = { singers: SingerMergeCandidate[]; hasMore: boolean }

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function isSingerId(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n
}

function parseLogin(value: unknown): SingerMergeLogin {
  if (!record(value) || typeof value.userId !== 'number' || !Number.isSafeInteger(value.userId) || value.userId <= 0 ||
      typeof value.username !== 'string' ||
      (value.provider !== 'google' && value.provider !== 'facebook' && value.provider !== 'oidc' && value.provider !== 'local') ||
      (value.role !== 'admin' && value.role !== 'user') || typeof value.isActive !== 'boolean') {
    throw new Error('Could not read linked login details. Please reload the singer list.')
  }
  return { userId: value.userId, username: value.username, provider: value.provider, role: value.role, isActive: value.isActive }
}

export function parseSingerMergeCandidates(value: unknown): SingerMergeCandidates {
  if (!record(value) || !Array.isArray(value.singers) || typeof value.hasMore !== 'boolean') {
    throw new Error('Could not read the singer list. Please try again.')
  }
  const seen = new Set<string>()
  const singers = value.singers.map((singer: unknown): SingerMergeCandidate => {
    if (!record(singer) || !isSingerId(singer.singerId) || typeof singer.displayName !== 'string' ||
        !singer.displayName.trim() || typeof singer.status !== 'string' ||
        typeof singer.historyCount !== 'number' || !Number.isSafeInteger(singer.historyCount) || singer.historyCount < 0 ||
        !Array.isArray(singer.accountLogins) || seen.has(singer.singerId)) {
      throw new Error('Could not read a singer profile. Please reload the singer list.')
    }
    seen.add(singer.singerId)
    return {
      singerId: singer.singerId, displayName: singer.displayName, status: singer.status,
      historyCount: singer.historyCount, accountLogins: singer.accountLogins.map(parseLogin),
    }
  })
  return { singers, hasMore: value.hasMore }
}

export function describeSingerLogin(login: SingerMergeLogin): string {
  const providers = { google: 'Google', facebook: 'Facebook', oidc: 'SSO / OIDC', local: 'Password' }
  return `${providers[login.provider]}: ${login.username} (${login.role}${login.isActive ? '' : ', disabled'})`
}
