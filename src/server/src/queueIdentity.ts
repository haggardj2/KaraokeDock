// server/src/queueIdentity.ts
// Canonical singer identity helpers.
// All singer lookups should go through these functions so that name variants
// like "Jared", " jared ", "JARED" and "Jared  " all map to the same singer.

import { query } from './db.js';

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
  display_name: string;
  normalized_name: string;
  status: string;
}

/**
 * Look up a singer by normalised name.  If none exists, insert a new one.
 * The display_name stored is the first canonical version supplied (later
 * calls with the same normalised name just return the existing row).
 *
 * Thread-safe: uses INSERT … ON CONFLICT DO NOTHING + SELECT fallback.
 */
export async function findOrCreateSinger(displayName: string): Promise<SingerRow> {
  const trimmed = displayName.trim().replace(/\s+/g, ' ') || displayName;
  const norm = normalizeSingerName(trimmed);

  // Fast path: already exists
  const existing = await query<SingerRow>(
    `SELECT id, display_name, normalized_name, status
       FROM singers
      WHERE normalized_name = $1
      LIMIT 1`,
    [norm],
  );
  if (existing.rows.length > 0) {
    return { ...existing.rows[0], id: BigInt(existing.rows[0].id as unknown as string) };
  }

  // Upsert: insert if not exists, then select
  await query(
    `INSERT INTO singers (display_name, normalized_name, status)
     VALUES ($1, $2, 'active')
     ON CONFLICT (normalized_name) DO NOTHING`,
    [trimmed, norm],
  );

  const created = await query<SingerRow>(
    `SELECT id, display_name, normalized_name, status
       FROM singers
      WHERE normalized_name = $1
      LIMIT 1`,
    [norm],
  );
  return { ...created.rows[0], id: BigInt(created.rows[0].id as unknown as string) };
}

// ---------------------------------------------------------------------------
// Ensure singer is in the active rotation
// ---------------------------------------------------------------------------

/**
 * Add a singer to the active rotation if they are not already there.
 * Idempotent — calling multiple times for the same singer does nothing.
 */
export async function ensureSingerInActiveRotation(singerId: bigint): Promise<void> {
  // Find the most-recent active rotation
  const rotRes = await query<{ id: string }>(
    `SELECT id FROM rotations WHERE status = 'active' ORDER BY created_at DESC LIMIT 1`,
  );
  if (rotRes.rows.length === 0) return; // no active rotation, nothing to do

  const rotationId = BigInt(rotRes.rows[0].id);

  // Determine the next available position
  const posRes = await query<{ max_pos: number | null }>(
    `SELECT MAX(position) AS max_pos FROM rotation_singers WHERE rotation_id = $1`,
    [rotationId],
  );
  const nextPos = (posRes.rows[0].max_pos ?? -1) + 1;

  // Get current rotation round so new singers join appropriately
  const roundRes = await query<{ current_round: number }>(
    `SELECT current_round FROM rotations WHERE id = $1`,
    [rotationId],
  );
  const currentRound = roundRes.rows[0]?.current_round ?? 1;

  // Insert singer if not already in this rotation
  await query(
    `INSERT INTO rotation_singers
       (rotation_id, singer_id, status, position, current_round_joined)
     VALUES ($1, $2, 'active', $3, $4)
     ON CONFLICT (rotation_id, singer_id) DO NOTHING`,
    [rotationId, singerId, nextPos, currentRound],
  );
}
