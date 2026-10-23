import { describe, expect, it } from 'vitest';
import type { User } from './db.js';
import { canAccessHost } from './permissions.js';

const user: User = {
  id: 1, username: 'host', display_name: null, picture: null,
  password_hash: null, role: 'user', is_active: true,
  oidc_subject: 'host-subject', oidc_issuer: 'https://id.example',
  created_at: new Date(0), updated_at: new Date(0),
};

describe('Host permissions', () => {
  it('grants managed Users and Admins access, including canonical linked-login accounts', () => {
    expect(canAccessHost(user, 'user')).toBe(true);
    expect(canAccessHost({ ...user, role: 'admin' }, 'admin')).toBe(true);
    expect(canAccessHost({ ...user, oidc_subject: null, password_hash: 'hash' }, 'user')).toBe(true);
    expect(canAccessHost({ ...user, canonical_user_id: null }, 'user')).toBe(true);
  });

  it('denies inactive accounts, link-source accounts and standalone social singers', () => {
    expect(canAccessHost({ ...user, is_active: false }, 'user')).toBe(false);
    expect(canAccessHost({ ...user, canonical_user_id: 2 }, 'user')).toBe(false);
    expect(canAccessHost({ ...user, oidc_subject: null }, 'user')).toBe(false);
    expect(canAccessHost({ ...user, social_provider: 'google' }, 'admin')).toBe(false);
    expect(canAccessHost(user, '')).toBe(false);
  });

  it('preserves legacy administrator sessions, but not anonymous or legacy user sessions', () => {
    expect(canAccessHost(null, 'admin')).toBe(true);
    expect(canAccessHost(null, 'user')).toBe(false);
    expect(canAccessHost(null, '')).toBe(false);
  });
});
