// server/src/queueIdentity.ts
// Canonical singer identity helpers.
// All singer lookups should go through these functions so that name variants
// like "Jared", " jared ", "JARED" and "Jared  " all map to the same singer.

import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { query } from './db.js';
import { withQueueTransaction } from './rotation/queueTransaction.js';
import { DEFAULT_ROTATION_CONFIG, effectiveRotationType, normalizeRotationConfig, type RotationConfig, type RotationType } from './rotation/types.js';

// ---------------------------------------------------------------------------
// Name normalisation
// ---------------------------------------------------------------------------

/**
 * Normalise a singer's display name to a canonical search key:
 *  - Trim leading/trailing whitespace.
 *  - Collapse runs of internal whitespace to a single space.
 *  - Lower-case everything.
 */
export function normalizeSingerName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

// ---------------------------------------------------------------------------
// Find-or-create singer
// ---------------------------------------------------------------------------

export interface SingerRow {
  id: bigint;
  public_uuid: string;
  display_name: string;
  normalized_name: string;
  status: string;
}

export function normalizeSingerUuid(value: unknown): string | null {
  const uuid = String(value ?? '').trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uuid)
    ? uuid
    : null;
}

async function updateSingerNameIfPossible(singerId: bigint, displayName: string, normalizedName: string): Promise<void> {
  const conflict = await query<{ id: string }>(
    `SELECT id FROM singers WHERE normalized_name = $1 AND id != $2 LIMIT 1`,
    [normalizedName, singerId],
  );
  if (conflict.rows.length > 0) {
    await query(
      `UPDATE singers SET display_name = $1 WHERE id = $2`,
      [displayName, singerId],
    );
    return;
  }

  await query(
    `UPDATE singers SET display_name = $1, normalized_name = $2 WHERE id = $3`,
    [displayName, normalizedName, singerId],
  );
}

/**
 * Look up a singer by normalised name.  If none exists, insert a new one.
 * The display_name stored is the first canonical version supplied (later
 * calls with the same normalised name just return the existing row).
 *
 * Thread-safe: uses INSERT … ON CONFLICT DO NOTHING + SELECT fallback.
 */
export async function findOrCreateSinger(displayName: string, singerUuid?: string | null): Promise<SingerRow> {
  const trimmed = displayName.trim().replace(/\s+/g, ' ') || displayName;
  const norm = normalizeSingerName(trimmed);
  const publicUuid = normalizeSingerUuid(singerUuid) ?? randomUUID();

  if (singerUuid) {
    const existingByUuid = await query<SingerRow>(
      `SELECT id, public_uuid, display_name, normalized_name, status
         FROM singers
        WHERE public_uuid = $1
        LIMIT 1`,
      [publicUuid],
    );
    if (existingByUuid.rows.length > 0) {
      const singerId = BigInt(existingByUuid.rows[0].id as unknown as string);
      await updateSingerNameIfPossible(singerId, trimmed, norm);
      const updated = await query<SingerRow>(
        `SELECT id, public_uuid, display_name, normalized_name, status
           FROM singers
          WHERE id = $1
          LIMIT 1`,
        [singerId],
      );
      return { ...updated.rows[0], id: BigInt(updated.rows[0].id as unknown as string) };
    }
  }

  // Fast path: already exists
  const existing = await query<SingerRow>(
    `SELECT id, public_uuid, display_name, normalized_name, status
       FROM singers
      WHERE public_uuid = $1 OR normalized_name = $2
      ORDER BY CASE WHEN public_uuid = $1 THEN 0 ELSE 1 END
      LIMIT 1`,
    [publicUuid, norm],
  );
  if (existing.rows.length > 0) {
    return { ...existing.rows[0], id: BigInt(existing.rows[0].id as unknown as string) };
  }

  // Upsert: insert if not exists, then select
  await query(
    `INSERT INTO singers (public_uuid, display_name, normalized_name, status)
     VALUES ($1, $2, $3, 'active')
     ON CONFLICT (normalized_name) DO NOTHING`,
    [publicUuid, trimmed, norm],
  );

  const created = await query<SingerRow>(
    `SELECT id, public_uuid, display_name, normalized_name, status
       FROM singers
      WHERE public_uuid = $1 OR normalized_name = $2
      ORDER BY CASE WHEN public_uuid = $1 THEN 0 ELSE 1 END
      LIMIT 1`,
    [publicUuid, norm],
  );
  return { ...created.rows[0], id: BigInt(created.rows[0].id as unknown as string) };
}

// ---------------------------------------------------------------------------
// Ensure singer is in the active rotation
// ---------------------------------------------------------------------------

/**
 * Add a singer to the active rotation if they are not already there.
 * If no active rotation exists, a default one is created automatically.
 * Idempotent — calling multiple times for the same singer does nothing.
 */
export async function ensureSingerInActiveRotation(singerId: bigint, client?: PoolClient): Promise<void> {
  const ensureMembership = async (client: PoolClient) => {
    type MembershipRotation = { id: string; type: RotationType; base_policy: RotationType; current_round: number; config: Partial<RotationConfig> };
    let rotation = (await client.query<MembershipRotation>(
      `SELECT id, type, base_policy, current_round, config FROM rotations WHERE status IN ('active', 'paused')
        ORDER BY (status = 'active') DESC, created_at DESC, id DESC LIMIT 1 FOR UPDATE`,
    )).rows[0];
    if (!rotation) {
      const config: RotationConfig = {
        ...DEFAULT_ROTATION_CONFIG, type: 'strict_round_robin',
        duetPolicy: 'primary_only', priorityPolicy: 'none',
      };
      rotation = (await client.query<MembershipRotation>(
        `INSERT INTO rotations (name, type, base_policy, status, current_round, config)
         VALUES ('Default Rotation', 'strict_round_robin', 'strict_round_robin', 'active', 1, $1)
         RETURNING id, type, base_policy, current_round, config`, [JSON.stringify(config)],
      )).rows[0];
    }
    const existing = (await client.query<{ status: string }>(
      `SELECT status FROM rotation_singers WHERE rotation_id = $1 AND singer_id = $2`,
      [rotation.id, singerId],
    )).rows[0];
    if (existing?.status === 'active') return;
    const config = normalizeRotationConfig({
      ...rotation.config,
      type: rotation.config.type ?? rotation.type,
      basePolicy: rotation.config.basePolicy ?? rotation.base_policy,
    });
    const placement = effectiveRotationType(config) === 'strict_round_robin'
      ? config.newSingerPlacement
      : 'end_of_current_round';
    let position = (await client.query<{ position: number }>(
      `SELECT COALESCE(MAX(position), -1) + 1 AS position FROM rotation_singers WHERE rotation_id = $1`, [rotation.id],
    )).rows[0].position;
    if (placement === 'next_available') {
      const next = (await client.query<{ position: number }>(
        `SELECT rs.position FROM rotation_singers rs JOIN singers s ON s.id = rs.singer_id
          WHERE rs.rotation_id = $1 AND rs.status = 'active' AND s.status = 'active'
            AND rs.current_round_joined <= $2 AND COALESCE(rs.last_round_sang, 0) < $2
            AND EXISTS (SELECT 1 FROM queue WHERE singer_id = rs.singer_id AND status = 'queued')
            AND NOT EXISTS (SELECT 1 FROM queue WHERE singer_id = rs.singer_id AND status = 'playing')
          ORDER BY rs.position LIMIT 1`, [rotation.id, rotation.current_round],
      )).rows[0];
      if (next) {
        position = next.position;
        await client.query(`UPDATE rotation_singers SET position = position + 1 WHERE rotation_id = $1 AND position >= $2`, [rotation.id, position]);
      }
    }
    const round = rotation.current_round + (placement === 'next_round' ? 1 : 0);
    await client.query(
      `INSERT INTO rotation_singers (rotation_id, singer_id, status, position, current_round_joined)
       VALUES ($1, $2, 'active', $3, $4)
       ON CONFLICT (rotation_id, singer_id) DO UPDATE
         SET status = 'active', position = EXCLUDED.position, current_round_joined = EXCLUDED.current_round_joined`,
      [rotation.id, singerId, position, round],
    );
  };
  if (client) await ensureMembership(client);
  else await withQueueTransaction(ensureMembership);
}
