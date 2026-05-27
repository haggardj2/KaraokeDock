-- Break music support
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

INSERT INTO settings (key, value) VALUES
('break_music.crossfade_seconds', '3'::jsonb),
('break_music.playlists_folder', '"/media/playlists"'::jsonb),
('break_music.paused', 'false'::jsonb),
('break_music.current_track_id', 'null'::jsonb),
('break_music.current_started_at', 'null'::jsonb),
('break_music.current_position_sec', '0'::jsonb),
('break_music.playlist_track_ids', '[]'::jsonb),
('break_music.playlist_index', '0'::jsonb)
ON CONFLICT (key) DO NOTHING;
