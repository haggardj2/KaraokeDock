import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { describeSingerLogin, parseSingerMergeCandidates } from '../src/singer-merge.ts'

const guest = {
  singerId: '9', displayName: 'Stored Singer', status: 'inactive', historyCount: 0, accountLogins: [],
}
const social = {
  singerId: '10', displayName: 'Stored Singer (2)', status: 'active', historyCount: 3,
  accountLogins: [{ userId: 8, username: 'google-singer', provider: 'google', role: 'user', isActive: true }],
}

describe('all-singer merge selection', () => {
  it('accepts archived and empty guest profiles as well as social/SSO accounts', () => {
    const oidc = {
      ...social, singerId: '11', displayName: 'Host',
      accountLogins: [{ userId: 3, username: 'oidc-host', provider: 'oidc', role: 'admin', isActive: true }],
    }
    const result = parseSingerMergeCandidates({ singers: [guest, social, oidc], hasMore: false })
    assert.deepEqual(result.singers, [guest, social, oidc])
    assert.equal(result.hasMore, false)
  })

  it('keeps bigint singer IDs exact instead of rounding them to JavaScript numbers', () => {
    const result = parseSingerMergeCandidates({
      singers: [{ ...guest, singerId: '9007199254740993' }, { ...social, singerId: '9223372036854775807' }],
      hasMore: false,
    })
    assert.deepEqual(result.singers.map((singer) => singer.singerId), ['9007199254740993', '9223372036854775807'])
    assert.equal(JSON.stringify({ sourceId: result.singers[0].singerId }), '{"sourceId":"9007199254740993"}')
  })

  it('identifies singers by IDs even if displayed names match', () => {
    const result = parseSingerMergeCandidates({
      singers: [guest, { ...social, displayName: guest.displayName }], hasMore: false,
    })
    assert.equal(result.singers.length, 2)
    assert.notEqual(result.singers[0].singerId, result.singers[1].singerId)
  })

  it('preserves multiple linked accounts and disabled-account information for confirmation', () => {
    const logins = [
      { userId: 1, username: 'host', provider: 'oidc', role: 'admin', isActive: true },
      { userId: 2, username: 'singer-google', provider: 'google', role: 'user', isActive: false },
      { userId: 3, username: 'singer-facebook', provider: 'facebook', role: 'user', isActive: true },
      { userId: 4, username: 'local-user', provider: 'local', role: 'user', isActive: true },
    ]
    const result = parseSingerMergeCandidates({ singers: [{ ...social, accountLogins: logins }], hasMore: true })
    assert.deepEqual(result.singers[0].accountLogins, logins)
    assert.equal(result.hasMore, true)
    assert.deepEqual(logins.map(describeSingerLogin), [
      'SSO / OIDC: host (admin)',
      'Google: singer-google (user, disabled)',
      'Facebook: singer-facebook (user)',
      'Password: local-user (user)',
    ])
  })

  it('accepts an empty search result without treating it as an error', () => {
    assert.deepEqual(parseSingerMergeCandidates({ singers: [], hasMore: false }), { singers: [], hasMore: false })
  })

  it('does not copy unrelated account properties such as provider subjects or credentials', () => {
    const result = parseSingerMergeCandidates({
      singers: [{ ...social, accountLogins: [{ ...social.accountLogins[0], subject: 'private', secret: 'private' }] }],
      hasMore: false,
    })
    assert.equal(JSON.stringify(result).includes('private'), false)
  })

  it('surfaces malformed results rather than silently showing no singers', () => {
    for (const value of [null, [], {}, { singers: [], hasMore: 'false' }, { singers: 'wrong', hasMore: false }]) {
      assert.throws(() => parseSingerMergeCandidates(value), /singer list/)
    }
  })

  it('rejects invalid IDs, duplicate IDs, invalid counts, and missing login metadata', () => {
    for (const singer of [
      { ...guest, singerId: 9 }, { ...guest, singerId: '0' }, { ...guest, singerId: '-1' },
      { ...guest, singerId: '9223372036854775808' }, { ...guest, singerId: '1.2' },
      { ...guest, displayName: '' }, { ...guest, historyCount: -1 }, { ...guest, historyCount: 1.5 },
      { ...guest, accountLogins: undefined },
    ]) assert.throws(() => parseSingerMergeCandidates({ singers: [singer], hasMore: false }), /singer profile/)
    assert.throws(() => parseSingerMergeCandidates({ singers: [guest, guest], hasMore: false }), /singer profile/)
  })

  it('rejects malformed linked-account entries rather than mislabeling credentials', () => {
    for (const login of [
      {}, { ...social.accountLogins[0], provider: 'unknown' }, { ...social.accountLogins[0], role: 'owner' },
      { ...social.accountLogins[0], isActive: 'false' }, { ...social.accountLogins[0], userId: 0 },
    ]) {
      assert.throws(() => parseSingerMergeCandidates({
        singers: [{ ...social, accountLogins: [login] }], hasMore: false,
      }), /linked login details/)
    }
  })
})
