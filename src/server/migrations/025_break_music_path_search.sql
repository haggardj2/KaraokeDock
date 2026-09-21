-- pg_trgm is installed by init.sql and migration 019.
CREATE INDEX IF NOT EXISTS idx_break_music_tracks_file_path_trgm
  ON break_music_tracks USING gin (file_path gin_trgm_ops);
