-- Add support for external karaoke URLs (e.g., from Karaoke Nerds)
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS external_url TEXT;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'local';

-- Add index for external tracks
CREATE INDEX IF NOT EXISTS idx_tracks_source ON tracks(source);

-- Add unique constraint for external tracks
CREATE UNIQUE INDEX IF NOT EXISTS idx_tracks_source_url ON tracks(source, external_url) 
WHERE external_url IS NOT NULL;
