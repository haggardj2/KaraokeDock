-- Fast "contains" search over the break-music library (the manager pages through it as you
-- search). pg_trgm is installed by init.sql and migration 019; file_path is indexed by 025.
CREATE INDEX IF NOT EXISTS idx_break_music_tracks_title_trgm
  ON break_music_tracks USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_break_music_tracks_artist_trgm
  ON break_music_tracks USING gin (artist gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_break_music_tracks_genre_trgm
  ON break_music_tracks USING gin (genre gin_trgm_ops);
