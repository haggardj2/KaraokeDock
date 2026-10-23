import type { User } from './db.js';

export function canAccessHost(user: User | null, role: string): boolean {
  if (!user) return role === 'admin'; // Legacy administrator sessions.
  return user.is_active && !user.canonical_user_id && !user.social_provider
    && (role === 'admin' || role === 'user')
    && (user.role === 'admin' || user.role === 'user')
    && Boolean(user.password_hash || user.oidc_subject || user.role === 'admin');
}
