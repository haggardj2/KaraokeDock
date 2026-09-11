import type { PoolClient } from 'pg';
import { withTransaction } from '../db.js';

export function withQueueTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  return withTransaction(async (client) => {
    // Playback, membership, and queue ordering must use the same connection
    // and lock, including when no active rotation exists yet.
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('karaokedock:live-queue'))`);
    return callback(client);
  });
}
