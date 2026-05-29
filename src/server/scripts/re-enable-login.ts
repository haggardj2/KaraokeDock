#!/usr/bin/env ts-node

import { Pool } from 'pg';
import { resolveDatabaseUrl } from '../src/databaseUrl.js';

async function reEnableUsernamePasswordLogin() {
  let connectionString: string;
  try {
    connectionString = resolveDatabaseUrl();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ ERROR: ${message}`);
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  try {
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      ['auth.password_login_enabled', JSON.stringify(true)]
    );
    console.log('✅ Username/password login has been re-enabled.');
  } catch (error: unknown) {
    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    console.error('❌ Failed to re-enable username/password login:', errorMessage);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

reEnableUsernamePasswordLogin().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
