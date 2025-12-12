#!/bin/sh
# Migration script to apply database schema changes
# Migrations 001-002 must succeed (base schema)
# Migrations 003-008 are non-fatal to allow incremental updates

set -e

# Base schema migrations (must succeed)
psql "$DATABASE_URL" -f migrations/001_init.sql
psql "$DATABASE_URL" -f migrations/002_seed_settings.sql

# Additional migrations (non-fatal to allow running on existing databases)
psql "$DATABASE_URL" -f migrations/003_dedupe_tracks.sql || true
psql "$DATABASE_URL" -f migrations/004_add_duration.sql || true
psql "$DATABASE_URL" -f migrations/005_add_external_support.sql || true
psql "$DATABASE_URL" -f migrations/006_fix_external_tracks_constraint.sql || true
psql "$DATABASE_URL" -f migrations/007_add_admin_credentials.sql || true
psql "$DATABASE_URL" -f migrations/008_add_sessions.sql || true

echo "Migrations completed successfully"
