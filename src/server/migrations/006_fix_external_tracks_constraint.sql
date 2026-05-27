-- Fix unique constraint conflict for external tracks
-- Drop the existing constraint and recreate as a partial unique index
-- This allows external tracks to have empty path/basename since they use external_url instead

DO $$ 
BEGIN
  -- Drop the constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_tracks_kind_path_base'
  ) THEN
    ALTER TABLE tracks DROP CONSTRAINT uq_tracks_kind_path_base;
  END IF;
END $$;

-- Create a partial unique index that only applies to local tracks (where external_url is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_tracks_local_kind_path_base 
ON tracks (kind, path, basename) 
WHERE external_url IS NULL;

-- Note: External tracks are already uniquely constrained by idx_tracks_source_url
-- which was created in migration 005_add_external_support.sql
