#!/usr/bin/env ts-node
/**
 * Reset admin username and password
 * 
 * Usage:
 *   npm run reset-credentials
 *   npm run reset-credentials -- --username admin --password myNewPassword
 * 
 * This script resets the admin credentials stored in the database.
 * It updates the current users-table auth model and keeps the legacy settings
 * entries in sync for compatibility. If no password is provided, a secure
 * random password is generated and printed once.
 */

import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { resolveDatabaseUrl } from '../src/databaseUrl.js';

const DEFAULT_USERNAME = 'admin';
const SALT_ROUNDS = 10;

interface ResetOptions {
  username: string;
  password?: string;
}

async function resetCredentials(options: ResetOptions) {
  const username = options.username.trim();
  const password = options.password || crypto.randomBytes(18).toString('base64url');
  const generatedPassword = !options.password;

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
    // Test database connection
    await pool.query('SELECT 1');
    console.log('✅ Connected to database');

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    await pool.query('BEGIN');

    const existingTargetUser = await pool.query<{ id: number; role: string }>(
      'SELECT id, role FROM users WHERE username = $1 LIMIT 1',
      [username]
    );

    if (existingTargetUser.rows[0]) {
      await pool.query(
        `UPDATE users
            SET password_hash = $1,
                role = 'admin',
                is_active = true,
                updated_at = NOW()
          WHERE id = $2`,
        [hashedPassword, existingTargetUser.rows[0].id]
      );
      console.log(`✅ Updated existing user "${username}" and ensured admin access`);
    } else {
      const existingAdmin = await pool.query<{ id: number; username: string }>(
        `SELECT id, username
           FROM users
          WHERE role = 'admin'
          ORDER BY created_at ASC
          LIMIT 1`
      );

      if (existingAdmin.rows[0]) {
        await pool.query(
          `UPDATE users
              SET username = $1,
                  password_hash = $2,
                  role = 'admin',
                  is_active = true,
                  updated_at = NOW()
            WHERE id = $3`,
          [username, hashedPassword, existingAdmin.rows[0].id]
        );
        console.log(`✅ Renamed admin user "${existingAdmin.rows[0].username}" to "${username}"`);
      } else {
        await pool.query(
          `INSERT INTO users (username, password_hash, role, is_active)
           VALUES ($1, $2, 'admin', true)`,
          [username, hashedPassword]
        );
        console.log(`✅ Created admin user "${username}"`);
      }
    }

    // Keep legacy settings aligned with the users table.
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2) 
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      ['admin.username', JSON.stringify(username)]
    );
    console.log(`✅ Username reset to: "${username}"`);
    
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2) 
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      ['admin.password', JSON.stringify(hashedPassword)]
    );
    console.log('✅ Password reset and encrypted');

    // Clear all active sessions to force re-login
    const result = await pool.query('DELETE FROM sessions RETURNING *');
    const deletedCount = result.rowCount || 0;
    if (deletedCount > 0) {
      console.log(`✅ Cleared ${deletedCount} active session(s)`);
    }

    await pool.query('COMMIT');

    console.log('\n🎉 Credentials reset successfully!');
    console.log('You can now log in with:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    if (generatedPassword) {
      console.log('\nℹ️  A secure password was generated because none was provided.');
    }
    console.log('\n⚠️  Please change the password after logging in for security.');

  } catch (error: unknown) {
    await pool.query('ROLLBACK').catch(() => {});
    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    console.error('❌ Error resetting credentials:', errorMessage);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Parse command line arguments
function parseArgs(): ResetOptions {
  const args = process.argv.slice(2);
  let username = DEFAULT_USERNAME;
  let password: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--username' && i + 1 < args.length) {
      username = args[i + 1];
      i++;
    } else if (args[i] === '--password' && i + 1 < args.length) {
      password = args[i + 1];
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Usage: npm run reset-credentials [options]

Reset admin username and password.

Options:
  --username <username>  Set custom username (default: admin)
  --password <password>  Set custom password (default: generate a secure password)
  --help, -h            Show this help message

Examples:
  npm run reset-credentials
  npm run reset-credentials -- --username admin --password myNewPassword

Note: All active sessions will be cleared and users will need to log in again.
If --password is omitted, a secure password is generated and printed.
      `);
      process.exit(0);
    }
  }

  return { username, password };
}

// Main execution
const options = parseArgs();
resetCredentials(options).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
