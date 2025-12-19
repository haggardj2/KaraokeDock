-- Migration 010: Add note about password encryption
-- Note: This migration doesn't change the database schema.
-- 
-- Starting with this migration, passwords should be hashed using bcrypt.
-- Run 'npm run migrate-passwords' to hash existing plaintext passwords.
-- 
-- The migrate-passwords script will:
-- 1. Check if admin.password is in plaintext
-- 2. Hash it using bcrypt if needed
-- 3. Update the database
-- 
-- This script is idempotent and safe to run multiple times.

-- No schema changes needed in this migration
SELECT 1;
