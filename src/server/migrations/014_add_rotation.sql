-- ============================================================================
-- Rotation Support (migration 014)
-- ============================================================================
-- Adds karaoke rotation scheduling: singers, song requests, rotation config,
-- rotation state, turns, and manual host overrides.

-- -----------------------------------------------------------------------
-- Enum types
-- -----------------------------------------------------------------------

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

-- -----------------------------------------------------------------------
-- Singers
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS singers (
  id            BIGSERIAL PRIMARY KEY,
  display_name  TEXT NOT NULL,
  status        singer_status NOT NULL DEFAULT 'active',
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sang_at  TIMESTAMPTZ,
  total_songs_sung INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_singers_status ON singers(status);

-- -----------------------------------------------------------------------
-- Song Requests
-- -----------------------------------------------------------------------

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

-- -----------------------------------------------------------------------
-- Rotations
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rotations (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'hybrid',
  base_policy     TEXT NOT NULL DEFAULT 'strict_round_robin',
  status          rotation_status NOT NULL DEFAULT 'active',
  current_round   INT NOT NULL DEFAULT 1,
  current_turn_id BIGINT,           -- FK added after rotation_turns is created
  config          JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------
-- Rotation Singers
-- -----------------------------------------------------------------------

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

-- -----------------------------------------------------------------------
-- Rotation Turns
-- -----------------------------------------------------------------------

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

-- Add FK from rotations.current_turn_id -> rotation_turns.id now that the table exists
ALTER TABLE rotations
  ADD CONSTRAINT fk_rotations_current_turn
  FOREIGN KEY (current_turn_id) REFERENCES rotation_turns(id) ON DELETE SET NULL
  NOT VALID;   -- NOT VALID avoids full-table scan on existing (empty) data

-- -----------------------------------------------------------------------
-- Manual Overrides
-- -----------------------------------------------------------------------

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
