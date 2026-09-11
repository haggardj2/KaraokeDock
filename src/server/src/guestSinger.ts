import { randomUUID } from 'crypto';
import { withTransaction } from './db.js';
import { normalizeSingerName, normalizeSingerUuid, type SingerRow } from './queueIdentity.js';

const requestError = (message: string, status: number) => Object.assign(new Error(message), { status });

/**
 * Guest UUIDs are public identifiers, not credentials. A missing/unknown UUID
 * may recover an unlinked guest by name, but never replaces its canonical UUID.
 * Known UUIDs win over stale names; only explicit name edits rename that row.
 * Host targeting and trusted remote imports intentionally use separate rules.
 */
export async function resolveGuestSinger(
  name: unknown,
  rawUuid: unknown,
  options: { rename?: boolean; requireUuid?: boolean } = {},
): Promise<SingerRow> {
  if (name != null && typeof name !== 'string') throw requestError('name must be a string', 400);
  const displayName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
  const normalizedName = normalizeSingerName(displayName);
  const uuid = normalizeSingerUuid(rawUuid);
  if (rawUuid != null && (typeof rawUuid !== 'string' || !uuid)) throw requestError('Invalid singerUuid', 400);
  if (options.rename && !displayName) throw requestError('name is required', 400);

  try {
    return await withTransaction(async (client) => {
      const byUuid = uuid
        ? await client.query<SingerRow>('SELECT * FROM singers WHERE public_uuid = $1 FOR UPDATE', [uuid])
        : { rows: [] };
      let singer = byUuid.rows[0];
      if (!singer) {
        if (!displayName) throw requestError('Sign in or provide a name and singerUuid', 400);
        const byName = await client.query<SingerRow>(
          'SELECT * FROM singers WHERE normalized_name = $1 FOR UPDATE', [normalizedName],
        );
        singer = byName.rows[0];
        if (!singer) {
          if (options.requireUuid !== false && !uuid) {
            throw requestError('A valid singerUuid is required to create a guest profile', 400);
          }
          const newUuid = uuid ?? randomUUID();
          await client.query(
            `INSERT INTO singers (public_uuid, display_name, normalized_name, status)
             VALUES ($1, $2, $3, 'active') ON CONFLICT DO NOTHING`,
            [newUuid, displayName, normalizedName],
          );
          const created = await client.query<SingerRow>(
            `SELECT * FROM singers WHERE public_uuid = $1 OR normalized_name = $2
             ORDER BY CASE WHEN public_uuid = $1 THEN 0 ELSE 1 END LIMIT 1 FOR UPDATE`,
            [newUuid, normalizedName],
          );
          singer = created.rows[0];
          if (!singer) throw requestError('Unable to resolve guest profile; please retry', 409);
        }
      }
      const singerId = BigInt(singer.id);
      const owner = await client.query('SELECT id FROM users WHERE singer_id = $1 LIMIT 1', [singerId]);
      if (owner.rows.length) {
        throw requestError('This singer is linked to an account. Sign in to manage its profile and history, or use a different guest name.', 403);
      }
      if (options.rename && byUuid.rows.length) {
        const conflict = await client.query(
          'SELECT id FROM singers WHERE normalized_name = $1 AND id <> $2 LIMIT 1',
          [normalizedName, singerId],
        );
        if (conflict.rows.length) throw requestError('Singer name is already in use; choose a different name', 409);
        const updated = await client.query<SingerRow>(
          'UPDATE singers SET display_name = $1, normalized_name = $2 WHERE id = $3 RETURNING *',
          [displayName, normalizedName, singerId],
        );
        singer = updated.rows[0];
        await client.query(
          `UPDATE queue SET requested_by = $1 WHERE singer_id = $2 AND status IN ('queued', 'playing')`,
          [displayName, singerId],
        );
      }
      return { ...singer, id: singerId };
    });
  } catch (error: any) {
    if (error?.code === '23505') throw requestError('Singer name is already in use; choose a different name', 409);
    throw error;
  }
}
