#!/usr/bin/env ts-node
/**
 * Migration script to hash existing plaintext passwords in the database
 * 
 * This script:
 * 1. Checks if the admin password is stored in plaintext
 * 2. If it is, hashes it using bcrypt
 * 3. Updates the database with the hashed password
 * 
 * This script is idempotent and safe to run multiple times.
 */

import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { resolveDatabaseUrl } from '../src/databaseUrl.js';

const SALT_ROUNDS = 10;

async function migratePasswords() {
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

    // Get the current password from settings
    const result = await pool.query(
      'SELECT value FROM settings WHERE key = $1',
      ['admin.password']
    );

    if (result.rows.length === 0) {
      console.log('⚠️  No admin.password found in settings table');
      console.log('Setting default password (changeme-password)...');
      
      const hashedPassword = await bcrypt.hash('changeme-password', SALT_ROUNDS);
      await pool.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)`,
        ['admin.password', JSON.stringify(hashedPassword)]
      );
      console.log('✅ Default password set and encrypted');
      return;
    }

    const currentPassword = result.rows[0].value;
    console.log('Current password value type:', typeof currentPassword);
    
    // Check if the password is already hashed using the same regex as in db.ts
    // Bcrypt hashes start with $2a$, $2b$, or $2y$ followed by cost factor
    const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$/;
    const isBcryptHash = typeof currentPassword === 'string' && 
                        BCRYPT_HASH_REGEX.test(currentPassword);
    
    if (isBcryptHash) {
      console.log('✅ Password is already encrypted with bcrypt');
      console.log('No migration needed.');
      return;
    }

    // If the password is not a bcrypt hash, it's plaintext - hash it
    console.log('⚠️  Password appears to be in plaintext');
    console.log('Encrypting password...');
    
    const plaintextPassword = currentPassword;
    const hashedPassword = await bcrypt.hash(plaintextPassword, SALT_ROUNDS);
    
    // Update the password in the database
    await pool.query(
      `UPDATE settings SET value = $1 WHERE key = $2`,
      [JSON.stringify(hashedPassword), 'admin.password']
    );
    
    console.log('✅ Password successfully encrypted');
    console.log('\n🎉 Password migration completed!');
    console.log('All passwords are now securely hashed using bcrypt.');
    
  } catch (error: unknown) {
    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    console.error('❌ Error migrating passwords:', errorMessage);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Main execution
migratePasswords().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
