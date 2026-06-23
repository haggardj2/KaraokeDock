ALTER TABLE libraries
  ADD COLUMN IF NOT EXISTS parse_mode TEXT NOT NULL DEFAULT 'discid-artist-title';
