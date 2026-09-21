import { getUserById, query, type User } from './db.js';
import { ensureAuthenticatedSinger } from './authenticatedSinger.js';
import { withQueueTransaction } from './rotation/queueTransaction.js';
import { mergeSingersWithClient } from './singerMerge.js';
import { getUserSingerPresentation } from './singerProfile.js';
import { SocialAuthError } from './socialAuthConfig.js';

const requestError = (message: string, status: number) => Object.assign(new Error(message), { status });

export function parseUserId(value: unknown): number {
  if ((typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) && typeof value !== 'number') {
    throw requestError('User id must be a positive integer', 400);
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) throw requestError('Invalid user id', 400);
  return id;
}

export function isManagedAccount(user: User): boolean {
  return !user.canonical_user_id && Boolean(user.password_hash || user.oidc_subject);
}

function isSocialLogin(user: User): boolean {
  return Boolean(user.social_provider && user.social_subject && !user.password_hash && !user.oidc_subject);
}

export async function resolveSocialLoginUser(login: User): Promise<User> {
  if (!login.is_active || !isSocialLogin(login)) throw new SocialAuthError('Social sign-in is unavailable for this account', 403);
  if (!login.canonical_user_id) return { ...login, role: 'user' };
  const target = await getUserById(login.canonical_user_id);
  if (!target?.is_active || !isManagedAccount(target) || target.social_provider) {
    throw new SocialAuthError('Social sign-in is unavailable for this account', 403);
  }
  return target;
}

export type LinkedLogin = {
  id: number; username: string; provider: 'google' | 'facebook' | 'oidc' | 'local'; isActive: boolean;
};

export async function getLinkedLogins(userId: number): Promise<LinkedLogin[]> {
  const result = await query<LinkedLogin>(
    `SELECT id, username, social_provider AS provider, is_active AS "isActive"
       FROM users WHERE canonical_user_id = $1 ORDER BY social_provider, id`, [userId],
  );
  return result.rows;
}

export async function getAccountLinkCandidates(target: unknown, search: unknown) {
  const id = parseUserId(target);
  if (search !== undefined && (typeof search !== 'string' || search.length > 200)) {
    throw requestError('q must be a search string of at most 200 characters', 400);
  }
  const user = await getUserById(id);
  if (!user) throw requestError('Target account not found', 404);
  if (!isManagedAccount(user) || user.social_provider) throw requestError('Target must be a local or OIDC account', 409);
  const pattern = `%${(typeof search === 'string' ? search.trim() : '').replace(/[\\%_]/g, '\\$&')}%`;
  const result = await query<User>(
    `SELECT u.* FROM users u LEFT JOIN singers s ON s.id = u.singer_id
       WHERE u.id <> $1 AND u.canonical_user_id IS NULL
         AND u.social_provider IS NOT NULL AND u.social_subject IS NOT NULL
         AND u.password_hash IS NULL AND u.oidc_subject IS NULL
         AND (u.username ILIKE $2 OR u.display_name ILIKE $2 OR s.display_name ILIKE $2
           OR u.social_provider ILIKE $2)
       ORDER BY LOWER(COALESCE(s.display_name, u.display_name, u.username)), u.id LIMIT 51`,
    [id, pattern],
  );
  const users = await Promise.all(result.rows.slice(0, 50).map(async (source) => ({
    id: source.id, username: source.username, ...await getUserSingerPresentation(source),
    provider: source.social_provider!, role: 'user' as const, isActive: source.is_active,
    singerId: source.singer_id == null ? null : String(source.singer_id),
  })));
  return { users, hasMore: result.rows.length > 50 };
}

export async function linkAccountLogin(target: unknown, source: unknown) {
  const targetId = parseUserId(target);
  const sourceId = parseUserId(source);
  if (targetId === sourceId) throw requestError('Cannot link an account to itself', 400);
  const initialTarget = await getUserById(targetId);
  const initialSource = await getUserById(sourceId);
  validateLink(initialTarget, initialSource, targetId);
  await ensureAuthenticatedSinger(initialTarget!);
  return withQueueTransaction(async (client) => {
    await client.query('SELECT id FROM rotations ORDER BY id FOR UPDATE');
    const accounts = await client.query<User>(
      'SELECT * FROM users WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE', [[targetId, sourceId]],
    );
    const account = accounts.rows.find((user) => user.id === targetId);
    const login = accounts.rows.find((user) => user.id === sourceId);
    validateLink(account, login, targetId);
    if (!account!.singer_id || !login!.singer_id) throw requestError('Both accounts need a singer profile before linking', 409);
    const alreadyLinked = login!.canonical_user_id === targetId;
    if (!alreadyLinked) {
      if (String(account!.singer_id) !== String(login!.singer_id)) {
        await mergeSingersWithClient(client, BigInt(account!.singer_id), BigInt(login!.singer_id), true);
      }
      // Preserve an already shared singer and its selected image, without letting this new credential own it.
      await client.query(
        `UPDATE singers SET identity_merged = TRUE,
           profile_image_user_id = CASE WHEN profile_image_user_id = $2 THEN NULL ELSE profile_image_user_id END
         WHERE id = $1`, [account!.singer_id, sourceId],
      );
      await client.query('UPDATE users SET canonical_user_id = $1, updated_at = NOW() WHERE id = $2', [targetId, sourceId]);
      await client.query('DELETE FROM sessions WHERE user_id = $1 OR login_user_id = $1', [sourceId]);
    }
    return {
      ok: true, userId: targetId, sourceUserId: sourceId, singerId: String(account!.singer_id),
      username: account!.username, role: account!.role, alreadyLinked,
    };
  });
}

function validateLink(target: User | null | undefined, source: User | null | undefined, targetId: number): void {
  if (!target || !source) throw requestError('One or both accounts not found', 404);
  if (!isManagedAccount(target) || target.social_provider) throw requestError('Target must be a local or OIDC account', 409);
  if (!isSocialLogin(source)) throw requestError('Only a social-only login can be linked to an account', 409);
  if (source.canonical_user_id && source.canonical_user_id !== targetId) {
    throw requestError('Social login is already linked to another account', 409);
  }
  if (!target.is_active || !source.is_active) throw requestError('Both accounts must be active before linking', 409);
}
