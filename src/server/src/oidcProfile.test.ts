import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchUserInfo } from 'openid-client';
import { getOidcProfileClaims, getOidcGroupRole } from './oidcProfile.js';

vi.mock('openid-client', () => ({ fetchUserInfo: vi.fn() }));

const config = { serverMetadata: () => ({ userinfo_endpoint: 'https://id.example/userinfo' }) } as any;
const token = (claims: Record<string, unknown>) => ({ access_token: 'access', claims: () => claims }) as any;

beforeEach(() => vi.resetAllMocks());

describe('OIDC profile claims', () => {
  it('uses subject-validated UserInfo to obtain pictures omitted from ID tokens', async () => {
    vi.mocked(fetchUserInfo).mockResolvedValue({ sub: 'subject', picture: 'https://id.example/picture' });
    const claims = await getOidcProfileClaims(config, token({ sub: 'subject', email: 'host@example.com', name: 'Host' }));
    expect(claims.picture).toBe('https://id.example/picture');
    expect(fetchUserInfo).toHaveBeenCalledWith(config, 'access', 'subject');
  });

  it('does not fetch provider images or UserInfo when profile claims are already supplied', async () => {
    const claims = { sub: 'subject', email: 'host@example.com', name: 'Host', picture: 'https://id.example/picture', groups: ['karaokedock_user'] };
    expect(await getOidcProfileClaims(config, token(claims))).toEqual(claims);
    expect(fetchUserInfo).not.toHaveBeenCalled();
  });

  it('uses ID claims when the provider does not support UserInfo', async () => {
    const claims = { sub: 'subject', email: 'host@example.com' };
    expect(await getOidcProfileClaims({ serverMetadata: () => ({}) } as any, token(claims))).toEqual(claims);
  });

  it('propagates UserInfo failures and missing subjects rather than succeeding with a fallback', async () => {
    vi.mocked(fetchUserInfo).mockRejectedValue(new Error('subject mismatch'));
    await expect(getOidcProfileClaims(config, token({ sub: 'subject' }))).rejects.toThrow('subject mismatch');
    await expect(getOidcProfileClaims(config, token({}))).rejects.toThrow('Missing subject');
  });

  it('retrieves groups from subject-validated UserInfo even with a complete profile', async () => {
    vi.mocked(fetchUserInfo).mockResolvedValue({ sub: 'subject', groups: ['karaokedock_admin'] });
    const claims = await getOidcProfileClaims(config, token({
      sub: 'subject', email: 'host@example.com', name: 'Host', picture: 'https://id.example/picture',
    }));
    expect(getOidcGroupRole(claims.groups)).toBe('admin');
  });

  it.each([
    [['karaokedock_admin'], 'admin'],
    [['karaokedock_user'], 'user'],
    [['karaokedock_user', 'karaokedock_admin'], 'admin'],
    ['karaokedock_user', 'user'],
    [undefined, null],
    [[], null],
    [['other', 'KaraokeDock_Admin', '/karaokedock_admin'], null],
    [{ karaokedock_admin: true }, null],
  ])('maps exact group memberships %j to %s', (groups, role) => {
    expect(getOidcGroupRole(groups)).toBe(role);
  });
});
