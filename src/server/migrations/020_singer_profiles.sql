ALTER TABLE singers
  ADD COLUMN IF NOT EXISTS profile_image_source TEXT,
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
  ADD COLUMN IF NOT EXISTS profile_image_mime TEXT,
  ADD COLUMN IF NOT EXISTS profile_image_data BYTEA,
  ADD COLUMN IF NOT EXISTS profile_image_focus_x REAL NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS profile_image_focus_y REAL NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS profile_image_updated_at TIMESTAMPTZ;

