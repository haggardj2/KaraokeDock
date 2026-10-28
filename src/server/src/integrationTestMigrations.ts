// Database integration tests share one database and run in parallel, each in its own schema.
// CREATE EXTENSION IF NOT EXISTS (in init.sql) is not safe under concurrency, and would put the
// extension in whichever suite's schema came first, so the extensions are created once in public
// and each suite applies its migrations while holding an advisory lock on a dedicated connection.
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';

export const INTEGRATION_TEST_MIGRATIONS = ['init.sql', '018_singer_public_uuid.sql', '020_singer_profiles.sql',
  '021_singer_identity_and_crop.sql', '022_queue_manual_order.sql', '023_singer_social_login.sql',
  '024_shared_singer_identity.sql', '026_account_login_links.sql'];

const MIGRATION_LOCK = 727_100;

export async function runIntegrationTestMigrations(files = INTEGRATION_TEST_MIGRATIONS) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK]);
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public');
    await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public');
    for (const file of files) await client.query(await readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK]).catch(() => {});
    await client.end();
  }
}
