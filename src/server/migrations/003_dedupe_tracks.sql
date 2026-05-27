WITH survivors AS (
  SELECT MIN(id) AS survivor_id, kind, path, basename
  FROM tracks
  GROUP BY kind, path, basename
),
dupes AS (
  SELECT t.id AS dup_id, s.survivor_id
  FROM tracks t
  JOIN survivors s
    ON t.kind = s.kind AND t.path = s.path AND t.basename = s.basename
  WHERE t.id <> s.survivor_id
)
UPDATE queue q
SET track_id = d.survivor_id
FROM dupes d
WHERE q.track_id = d.dup_id;
DELETE FROM tracks t
USING dupes d
WHERE t.id = d.dup_id;
WITH f_survivors AS (
  SELECT MIN(id) AS survivor_id, file_mp4
  FROM tracks
  WHERE file_mp4 IS NOT NULL
  GROUP BY file_mp4
),
f_dupes AS (
  SELECT t.id AS dup_id, s.survivor_id
  FROM tracks t
  JOIN f_survivors s ON t.file_mp4 = s.file_mp4
  WHERE t.id <> s.survivor_id
)
UPDATE queue q
SET track_id = fd.survivor_id
FROM f_dupes fd
WHERE q.track_id = fd.dup_id;
DELETE FROM tracks t
USING f_dupes fd
WHERE t.id = fd.dup_id;
DO $$ BEGIN
  ALTER TABLE tracks
    ADD CONSTRAINT uq_tracks_kind_path_base UNIQUE (kind, path, basename);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS uq_tracks_file_mp4
  ON tracks (file_mp4)
  WHERE file_mp4 IS NOT NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
