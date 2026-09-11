BEGIN;

ALTER TABLE singers
  ADD COLUMN IF NOT EXISTS profile_image_crop JSONB,
  ADD COLUMN IF NOT EXISTS profile_image_admin_override BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS singer_id BIGINT REFERENCES singers(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_singer_id ON users(singer_id) WHERE singer_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'singers_profile_image_crop_check') THEN
    ALTER TABLE singers ADD CONSTRAINT singers_profile_image_crop_check CHECK (
      profile_image_crop IS NULL OR CASE WHEN
        jsonb_typeof(profile_image_crop) = 'object'
        AND jsonb_typeof(profile_image_crop->'x') = 'number'
        AND jsonb_typeof(profile_image_crop->'y') = 'number'
        AND jsonb_typeof(profile_image_crop->'width') = 'number'
        AND jsonb_typeof(profile_image_crop->'height') = 'number'
      THEN
        (profile_image_crop->>'x')::numeric >= 0 AND (profile_image_crop->>'x')::numeric < 100
        AND (profile_image_crop->>'y')::numeric >= 0 AND (profile_image_crop->>'y')::numeric < 100
        AND (profile_image_crop->>'width')::numeric > 0 AND (profile_image_crop->>'width')::numeric <= 100
        AND (profile_image_crop->>'height')::numeric > 0 AND (profile_image_crop->>'height')::numeric <= 100
        AND (profile_image_crop->>'x')::numeric + (profile_image_crop->>'width')::numeric <= 100.0001
        AND (profile_image_crop->>'y')::numeric + (profile_image_crop->>'height')::numeric <= 100.0001
      ELSE FALSE END
    );
  END IF;
END $$;

-- Only link unambiguous existing identities; never merge singers or claim another user's singer.
WITH candidates AS (
  SELECT u.id AS user_id, s.id AS singer_id,
         COUNT(*) OVER (PARTITION BY u.id) AS user_matches,
         COUNT(*) OVER (PARTITION BY s.id) AS singer_matches
    FROM users u
    JOIN singers s ON s.normalized_name IN (
      LOWER(REGEXP_REPLACE(TRIM(COALESCE(NULLIF(u.display_name, ''), u.username)), '\s+', ' ', 'g')),
      LOWER(REGEXP_REPLACE(TRIM(u.username), '\s+', ' ', 'g'))
    )
   WHERE u.singer_id IS NULL
     AND NOT EXISTS (SELECT 1 FROM users owner WHERE owner.singer_id = s.id)
)
UPDATE users u SET singer_id = c.singer_id
  FROM candidates c
 WHERE u.id = c.user_id AND c.user_matches = 1 AND c.singer_matches = 1;

UPDATE queue q SET singer_id = u.singer_id
  FROM users u JOIN singers s ON s.id = u.singer_id
 WHERE q.singer_id IS NULL
   AND LOWER(REGEXP_REPLACE(TRIM(q.requested_by), '\s+', ' ', 'g')) = s.normalized_name;

-- Populate queue avatars for users who already logged in before profile support existed.
UPDATE singers s
   SET profile_image_source = CASE WHEN NULLIF(TRIM(u.picture), '') IS NOT NULL THEN 'oidc' ELSE NULL END,
       profile_image_url = NULLIF(TRIM(u.picture), ''),
       profile_image_crop = NULL,
       profile_image_updated_at = NOW()
  FROM users u
 WHERE u.singer_id = s.id AND u.oidc_subject IS NOT NULL
   AND (s.profile_image_source IS NULL OR s.profile_image_source = 'oidc')
   AND (s.profile_image_url IS DISTINCT FROM NULLIF(TRIM(u.picture), '')
     OR s.profile_image_source IS DISTINCT FROM CASE WHEN NULLIF(TRIM(u.picture), '') IS NOT NULL THEN 'oidc' ELSE NULL END);

COMMIT;
