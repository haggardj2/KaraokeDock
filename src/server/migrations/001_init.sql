CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);
INSERT INTO settings (key, value) VALUES
('parsing.templates', '["discID - Artist - Title","Artist - Title"]'::jsonb)
ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES
('player.queueOverlayEnabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES
('player.qrEnabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
CREATE TABLE IF NOT EXISTS libraries (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  parse_mode TEXT NOT NULL DEFAULT 'discid-artist-title',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
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
CREATE TABLE IF NOT EXISTS artists (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  name_norm TEXT NOT NULL UNIQUE
);
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks USING GIN (to_tsvector('english', title));
CREATE TABLE IF NOT EXISTS queue (
  id BIGSERIAL PRIMARY KEY,
  track_id INT NOT NULL REFERENCES tracks(id),
  requested_by TEXT,
  status track_status NOT NULL DEFAULT 'queued',
  position INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_queue_status_pos ON queue(status, position);
