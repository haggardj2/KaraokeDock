-- ============================================================================
-- Consolidated Database Initialization Script
-- ============================================================================
-- This file combines all migrations (001-009) into a single initialization
-- script for creating a fresh database from scratch.
--
-- It includes:
-- - All table schemas with final column definitions
-- - All indexes and constraints from later migrations
-- - All default settings
-- - Sessions table for authentication
--
-- This script is idempotent and can be run multiple times safely.
-- ============================================================================

-- ============================================================================
-- Settings Table and Default Settings
-- ============================================================================
-- Store application configuration as key-value pairs with JSONB values

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);


-- Default settings from migrations 001, 002, 007, 008
INSERT INTO settings (key, value) VALUES
('parsing.templates', '["discID - Artist - Title","Artist - Title"]'::jsonb),
('player.queueOverlayEnabled', 'true'::jsonb),
('player.qrEnabled', 'true'::jsonb),
('ui.branding', '{"title":"Web Karaoke"}'::jsonb),
('host.crossfadeMs', '0'::jsonb),
('admin.token', '""'::jsonb),
('admin.password', '"changeme-password"'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- ============================================================================
-- Enum Types
-- ============================================================================
-- Create custom enum types for media formats and track status

DO $$ BEGIN
    CREATE TYPE media_kind AS ENUM ('mp4','cdgmp3');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE track_status AS ENUM ('queued','playing','skipped','finished','cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- Libraries Table
-- ============================================================================
-- Track media library locations on the filesystem

CREATE TABLE IF NOT EXISTS libraries (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Artists Table
-- ============================================================================
-- Store unique artist names with normalized versions for searching

CREATE TABLE IF NOT EXISTS artists (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  name_norm TEXT NOT NULL UNIQUE
);

-- ============================================================================
-- Tracks Table
-- ============================================================================
-- Store all karaoke tracks (both local files and external URLs)
-- Includes columns added in migrations 004 (duration_ms) and 005 (external_url, source)

CREATE TABLE IF NOT EXISTS tracks (
  id SERIAL PRIMARY KEY,
  artist_id INT REFERENCES artists(id),
  disc_id TEXT,
  title TEXT NOT NULL,
  kind media_kind NOT NULL,
  duration_ms INT,
  file_mp4 TEXT,
  file_cdg TEXT,
  file_mp3 TEXT,
  basename TEXT,
  library_id INT REFERENCES libraries(id),
  path TEXT NOT NULL,
  external_url TEXT,
  source TEXT DEFAULT 'local',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for tracks table
CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks USING GIN (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_tracks_source ON tracks(source);

-- Unique constraints for tracks
-- Partial unique index for local tracks (migration 006)
-- This allows external tracks to have empty path/basename since they use external_url instead
CREATE UNIQUE INDEX IF NOT EXISTS uq_tracks_local_kind_path_base 
ON tracks (kind, path, basename) 
WHERE external_url IS NULL;

-- Unique index for MP4 files
CREATE UNIQUE INDEX IF NOT EXISTS uq_tracks_file_mp4
ON tracks (file_mp4)
WHERE file_mp4 IS NOT NULL;

-- Unique constraint for external tracks (migration 005)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tracks_source_url ON tracks(source, external_url) 
WHERE external_url IS NOT NULL;

-- ============================================================================
-- Queue Table
-- ============================================================================
-- Manage the karaoke queue with track requests and playback status
-- Includes key_adjustment column added in migration 009

CREATE TABLE IF NOT EXISTS queue (
  id BIGSERIAL PRIMARY KEY,
  track_id INT NOT NULL REFERENCES tracks(id),
  requested_by TEXT,
  status track_status NOT NULL DEFAULT 'queued',
  position INT NOT NULL,
  notes TEXT,
  key_adjustment INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_queue_status_pos ON queue(status, position);

-- ============================================================================
-- Sessions Table
-- ============================================================================
-- Session-based authentication for admin and host access (migration 008)

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for faster token lookups and expiration cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================================
-- Initialization Complete
-- ============================================================================
