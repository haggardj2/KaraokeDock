BEGIN;

DROP INDEX IF EXISTS idx_users_singer_id;
CREATE INDEX IF NOT EXISTS idx_users_singer_id ON users(singer_id) WHERE singer_id IS NOT NULL;
ALTER TABLE singers
  ADD COLUMN IF NOT EXISTS identity_merged BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS profile_image_user_id INT REFERENCES users(id) ON DELETE SET NULL;

COMMIT;
