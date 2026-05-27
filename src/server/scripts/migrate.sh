#!/bin/sh
# Migration script to apply database schema changes
# Migrations 001-002 must succeed (base schema)
# Migrations 003-008 are non-fatal to allow incremental updates

set -e

# Initial Database build
psql "$DATABASE_URL" -f migrations/init.sql

# # Base schema migrations (must succeed)
# psql "$DATABASE_URL" -f migrations/001_init.sql
# psql "$DATABASE_URL" -f migrations/002_seed_settings.sql

# # Additional migrations (non-fatal to allow running on existing databases)
# psql "$DATABASE_URL" -f migrations/003_dedupe_tracks.sql || true
# psql "$DATABASE_URL" -f migrations/004_add_duration.sql || true
# psql "$DATABASE_URL" -f migrations/005_add_external_support.sql || true
# psql "$DATABASE_URL" -f migrations/006_fix_external_tracks_constraint.sql || true
# psql "$DATABASE_URL" -f migrations/007_add_admin_credentials.sql || true
# psql "$DATABASE_URL" -f migrations/008_add_sessions.sql || true
# psql "$DATABASE_URL" -f migrations/009_add_key_adjustment.sql || true
# psql "$DATABASE_URL" -f migrations/010_add_cover_art.sql || true
# psql "$DATABASE_URL" -f migrations/011_add_ytdlp_settings.sql || true

# Patch: extend track_status enum with 'done' and 'removed' (non-fatal for new DBs)
psql "$DATABASE_URL" -f migrations/016_fix_queue_status_enum.sql || true

echo "Migrations completed successfully"
