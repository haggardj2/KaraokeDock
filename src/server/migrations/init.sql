-- ============================================================================
-- Consolidated Database Initialization Script
-- ============================================================================
-- This file combines all migrations (001-011) into a single initialization
-- script for creating a fresh database from scratch.
--
-- It includes:
-- - All table schemas with final column definitions
-- - All indexes and constraints from later migrations
-- - All default settings
-- - Sessions table for authentication
-- - yt-dlp and background task settings
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


-- Default settings from migrations 001, 002, 011
INSERT INTO settings (key, value) VALUES
('parsing.templates', '["discID - Artist - Title","Artist - Title"]'::jsonb),
('player.queueOverlayEnabled', 'true'::jsonb),
('player.qrEnabled', 'true'::jsonb),
('ui.branding', '{"title":"Web Karaoke"}'::jsonb),
('host.crossfadeMs', '0'::jsonb),
('admin.token', '""'::jsonb),
('ytdlp.download_location', '"/media/downloads"'::jsonb),
('ytdlp.allow_downloads', 'true'::jsonb),
('requests.acceptance', '"local"'::jsonb),
('admin.background_tasks_enabled', 'true'::jsonb),
('libraries.local_enabled', 'true'::jsonb),
('libraries.external_enabled', 'true'::jsonb),
('auth.password_login_enabled', 'true'::jsonb),
('break_music.crossfade_seconds', '3'::jsonb),
('break_music.playlists_folder', '"/media/playlists"'::jsonb),
('break_music.paused', 'false'::jsonb),
('break_music.current_track_id', 'null'::jsonb),
('break_music.current_started_at', 'null'::jsonb),
('break_music.current_position_sec', '0'::jsonb),
('break_music.playlist_track_ids', '[]'::jsonb),
('break_music.playlist_index', '0'::jsonb)
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
    CREATE TYPE track_status AS ENUM ('queued','playing','skipped','finished','cancelled','done','removed');
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
-- Break Music Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS break_music_folders (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS break_music_tracks (
  id SERIAL PRIMARY KEY,
  folder_id INT REFERENCES break_music_folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  artist TEXT,
  genre TEXT,
  duration_ms INT,
  file_path TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_break_music_tracks_title ON break_music_tracks (LOWER(title));
CREATE INDEX IF NOT EXISTS idx_break_music_tracks_artist ON break_music_tracks (LOWER(artist));

CREATE TABLE IF NOT EXISTS break_music_playlists (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS break_music_playlist_tracks (
  playlist_id INT NOT NULL REFERENCES break_music_playlists(id) ON DELETE CASCADE,
  track_id INT NOT NULL REFERENCES break_music_tracks(id) ON DELETE CASCADE,
  position INT NOT NULL,
  PRIMARY KEY (playlist_id, position)
);

CREATE INDEX IF NOT EXISTS idx_break_music_playlist_tracks_playlist ON break_music_playlist_tracks(playlist_id, position);

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
-- Add users & OIDC

-- Add users table for multi-user management
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT, -- null for OIDC-only users
  display_name TEXT,
  picture TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT true,
  oidc_subject TEXT,
  oidc_issuer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure older existing users tables gain OIDC/profile columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS picture TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS oidc_subject TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS oidc_issuer TEXT;

-- Constraint on role values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_role_check' AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'user'));
  END IF;
END $$;

-- Index for OIDC subject lookups
CREATE INDEX IF NOT EXISTS idx_users_oidc ON users(oidc_subject, oidc_issuer) WHERE oidc_subject IS NOT NULL;

-- Add user_id and role to sessions for role-based access control
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin';


-- ============================================================================
-- Rotation Support (migration 014)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE singer_status AS ENUM ('active','inactive','absent','skipped','banned');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE song_request_status AS ENUM ('pending','queued','singing','completed','skipped','removed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE rotation_status AS ENUM ('active','paused','closed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE rotation_singer_status AS ENUM ('active','inactive','absent','skipped');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE rotation_turn_status AS ENUM ('scheduled','active','completed','skipped');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE rotation_turn_source AS ENUM ('automatic','manual_override','priority');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE override_status AS ENUM ('pending','consumed','cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS singers (
  id            BIGSERIAL PRIMARY KEY,
  display_name  TEXT NOT NULL,
  status        singer_status NOT NULL DEFAULT 'active',
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sang_at  TIMESTAMPTZ,
  total_songs_sung INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_singers_status ON singers(status);

CREATE TABLE IF NOT EXISTS song_requests (
  id                    BIGSERIAL PRIMARY KEY,
  singer_id             BIGINT NOT NULL REFERENCES singers(id) ON DELETE CASCADE,
  track_id              INT REFERENCES tracks(id) ON DELETE SET NULL,
  title                 TEXT NOT NULL,
  artist                TEXT,
  status                song_request_status NOT NULL DEFAULT 'pending',
  requested_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at          TIMESTAMPTZ,
  priority              INT NOT NULL DEFAULT 0,
  participant_singer_ids BIGINT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_song_requests_singer ON song_requests(singer_id);
CREATE INDEX IF NOT EXISTS idx_song_requests_status ON song_requests(status);
CREATE INDEX IF NOT EXISTS idx_song_requests_singer_status ON song_requests(singer_id, status);

CREATE TABLE IF NOT EXISTS rotations (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'hybrid',
  base_policy     TEXT NOT NULL DEFAULT 'strict_round_robin',
  status          rotation_status NOT NULL DEFAULT 'active',
  current_round   INT NOT NULL DEFAULT 1,
  current_turn_id BIGINT,
  config          JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rotation_singers (
  id                   BIGSERIAL PRIMARY KEY,
  rotation_id          BIGINT NOT NULL REFERENCES rotations(id) ON DELETE CASCADE,
  singer_id            BIGINT NOT NULL REFERENCES singers(id) ON DELETE CASCADE,
  status               rotation_singer_status NOT NULL DEFAULT 'active',
  position             INT NOT NULL DEFAULT 0,
  joined_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_round_joined INT NOT NULL DEFAULT 1,
  last_round_sang      INT,
  last_sang_at         TIMESTAMPTZ,
  total_songs_sung     INT NOT NULL DEFAULT 0,
  UNIQUE (rotation_id, singer_id)
);

CREATE INDEX IF NOT EXISTS idx_rotation_singers_rotation ON rotation_singers(rotation_id, status, position);
CREATE INDEX IF NOT EXISTS idx_rotation_singers_singer ON rotation_singers(singer_id);

CREATE TABLE IF NOT EXISTS rotation_turns (
  id              BIGSERIAL PRIMARY KEY,
  rotation_id     BIGINT NOT NULL REFERENCES rotations(id) ON DELETE CASCADE,
  singer_id       BIGINT NOT NULL REFERENCES singers(id),
  song_request_id BIGINT REFERENCES song_requests(id) ON DELETE SET NULL,
  round_number    INT NOT NULL DEFAULT 1,
  status          rotation_turn_status NOT NULL DEFAULT 'scheduled',
  source          rotation_turn_source NOT NULL DEFAULT 'automatic',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rotation_turns_rotation ON rotation_turns(rotation_id, status);
CREATE INDEX IF NOT EXISTS idx_rotation_turns_singer ON rotation_turns(singer_id);

ALTER TABLE rotations
  ADD CONSTRAINT fk_rotations_current_turn
  FOREIGN KEY (current_turn_id) REFERENCES rotation_turns(id) ON DELETE SET NULL
  NOT VALID;

CREATE TABLE IF NOT EXISTS manual_overrides (
  id                BIGSERIAL PRIMARY KEY,
  rotation_id       BIGINT NOT NULL REFERENCES rotations(id) ON DELETE CASCADE,
  singer_id         BIGINT NOT NULL REFERENCES singers(id),
  song_request_id   BIGINT REFERENCES song_requests(id) ON DELETE SET NULL,
  position          INT NOT NULL DEFAULT 0,
  status            override_status NOT NULL DEFAULT 'pending',
  expires_after_turn BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manual_overrides_rotation ON manual_overrides(rotation_id, status, position);


-- ============================================================================
-- Singer Identity (migration 015)
-- ============================================================================
-- Adds normalized_name to singers for case-insensitive deduplication.
-- Adds singer_id FK to the flat queue table so resortQueueByRotation can use
-- the canonical singer identity instead of raw requested_by text.
-- Backfills existing queue rows by creating/reusing singers from requested_by.
-- ============================================================================

-- -----------------------------------------------------------------------
-- 1. Add normalized_name to singers
-- -----------------------------------------------------------------------

ALTER TABLE singers
  ADD COLUMN IF NOT EXISTS normalized_name TEXT;

-- Backfill normalized_name for existing singers:
-- trim whitespace, collapse multiple spaces, lowercase.
UPDATE singers
   SET normalized_name = lower(regexp_replace(trim(display_name), '\s+', ' ', 'g'))
 WHERE normalized_name IS NULL;

-- Going forward normalized_name is required
ALTER TABLE singers
  ALTER COLUMN normalized_name SET NOT NULL;

-- Unique index so we can efficiently deduplicate by canonical name.
-- Use a partial unique index to avoid conflicts on older rows that might
-- temporarily have duplicate normalizations before the backfill runs.
CREATE UNIQUE INDEX IF NOT EXISTS idx_singers_normalized_name ON singers(normalized_name);

-- -----------------------------------------------------------------------
-- 2. Add singer_id to queue
-- -----------------------------------------------------------------------

ALTER TABLE queue
  ADD COLUMN IF NOT EXISTS singer_id BIGINT REFERENCES singers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_queue_singer_id ON queue(singer_id);

-- -----------------------------------------------------------------------
-- 3. Backfill queue.singer_id from queue.requested_by
-- -----------------------------------------------------------------------
-- For every distinct requested_by value in the queue that doesn't already
-- have a matching singer, create one, then link queue rows to it.

DO $$
DECLARE
  r RECORD;
  sid BIGINT;
  norm TEXT;
BEGIN
  FOR r IN
    SELECT DISTINCT COALESCE(requested_by, '') AS rb
      FROM queue
     WHERE singer_id IS NULL
       AND requested_by IS NOT NULL
       AND requested_by <> ''
  LOOP
    norm := lower(regexp_replace(trim(r.rb), '\s+', ' ', 'g'));

    -- Try to find an existing singer by normalized name
    SELECT id INTO sid FROM singers WHERE normalized_name = norm LIMIT 1;

    IF sid IS NULL THEN
      -- Create a new singer
      INSERT INTO singers (display_name, normalized_name, status)
      VALUES (trim(r.rb), norm, 'active')
      RETURNING id INTO sid;
    END IF;

    -- Link queue rows
    UPDATE queue
       SET singer_id = sid
     WHERE COALESCE(requested_by, '') = r.rb
       AND singer_id IS NULL;
  END LOOP;
END $$;


-- ============================================================================
-- Initialization Complete
-- ============================================================================
-- Note: Password encryption (migration 010) is handled by the application code.
-- Passwords should be hashed using bcrypt. The migrate-passwords script can
-- be used to hash existing plaintext passwords if needed.
-- ============================================================================
