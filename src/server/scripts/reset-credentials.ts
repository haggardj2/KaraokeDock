#!/usr/bin/env ts-node
/**
 * Reset admin username and password to defaults
 * 
 * Usage:
 *   npm run reset-credentials
 *   npm run reset-credentials -- --username admin --password changeme-password
 *   npm run reset-credentials -- --username admin --password myNewPassword
 * 
 * This script resets the admin credentials stored in the database.
 * You can optionally specify custom username and password, otherwise defaults are used.
 */

import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'changeme-password';
const SALT_ROUNDS = 10;

interface ResetOptions {
  username: string;
  password: string;
}

async function resetCredentials(options: ResetOptions) {
  const { username, password } = options;
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set');
    console.error('Please set DATABASE_URL to your PostgreSQL connection string');
    console.error('Example: DATABASE_URL=postgresql://karaoke:karaoke@localhost:5432/karaoke');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Test database connection
    await pool.query('SELECT 1');
    console.log('✅ Connected to database');

    // Reset username
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2) 
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      ['admin.username', JSON.stringify(username)]
    );
    console.log(`✅ Username reset to: "${username}"`);

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Reset password
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2) 
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      ['admin.password', JSON.stringify(hashedPassword)]
    );
    console.log(`✅ Password reset and encrypted`);

    // Clear all active sessions to force re-login
    const result = await pool.query('DELETE FROM sessions RETURNING *');
    const deletedCount = result.rowCount || 0;
    if (deletedCount > 0) {
      console.log(`✅ Cleared ${deletedCount} active session(s)`);
    }

    console.log('\n🎉 Credentials reset successfully!');
    console.log('You can now log in with:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️  Please change the password after logging in for security.');

  } catch (error: unknown) {
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
  let password = DEFAULT_PASSWORD;

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

Reset admin username and password to defaults or custom values.

Options:
  --username <username>  Set custom username (default: admin)
  --password <password>  Set custom password (default: changeme-password)
  --help, -h            Show this help message

Examples:
  npm run reset-credentials
  npm run reset-credentials -- --username admin --password changeme-password
  npm run reset-credentials -- --username admin --password myNewPassword

Note: All active sessions will be cleared and users will need to log in again.
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
