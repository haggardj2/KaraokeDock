import type { PoolClient } from 'pg';
import { query } from './db.js';
import { withQueueTransaction } from './rotation/queueTransaction.js';

export interface PlayerPlaybackState {
  queueId: number | null;
  manualStop: boolean;
  paused: boolean;
  positionSec: number;
}

interface SavedPlayback {
  queueId: number;
  paused: boolean;
  positionSec: number;
}

function isSavedPlayback(value: unknown): value is SavedPlayback {
  return !!value && typeof value === 'object'
    && 'queueId' in value && typeof value.queueId === 'number' && Number.isSafeInteger(value.queueId) && value.queueId > 0
    && 'paused' in value && typeof value.paused === 'boolean'
    && 'positionSec' in value && typeof value.positionSec === 'number'
    && Number.isFinite(value.positionSec) && value.positionSec >= 0;
}

export async function getPlayerPlaybackState(client?: PoolClient): Promise<PlayerPlaybackState> {
  const runQuery = client ? client.query.bind(client) : query;
  const result = await runQuery<{ queue_id: string | null; playback: unknown; manual_stop: string | null }>(
    `SELECT (SELECT id FROM queue WHERE status = 'playing' ORDER BY id LIMIT 1) AS queue_id,
            (SELECT value FROM settings WHERE key = 'player.playback') AS playback,
            (SELECT value #>> '{}' FROM settings WHERE key = 'player.manual_stop') AS manual_stop`,
  );
  const row = result.rows[0];
  if (row.playback != null && !isSavedPlayback(row.playback)) throw new Error('Invalid saved player playback state');
  const queueId = row.queue_id == null ? null : Number(row.queue_id);
  const saved = isSavedPlayback(row.playback) && row.playback.queueId === queueId ? row.playback : null;
  return {
    queueId, manualStop: row.manual_stop === 'true',
    paused: saved?.paused ?? false, positionSec: saved?.positionSec ?? 0,
  };
}

export async function savePlayerPlayback(client: PoolClient, queueId: number | null, paused = false, positionSec = 0): Promise<void> {
  if (queueId == null) {
    await client.query(`DELETE FROM settings WHERE key = 'player.playback'`);
    return;
  }
  await client.query(
    `INSERT INTO settings (key, value) VALUES ('player.playback', $1::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [JSON.stringify({ queueId, paused, positionSec })],
  );
}

export async function setPlayerPlaybackPaused(queueId: number, paused: boolean, positionSec?: number): Promise<PlayerPlaybackState> {
  return withQueueTransaction(async (client) => {
    const state = await getPlayerPlaybackState(client);
    if (state.queueId !== queueId) {
      throw Object.assign(new Error('This song is no longer playing'), { status: 409 });
    }
    if (state.paused === paused) return state;
    const position = paused ? positionSec ?? state.positionSec : state.positionSec;
    await savePlayerPlayback(client, queueId, paused, position);
    return { ...state, paused, positionSec: position };
  });
}
