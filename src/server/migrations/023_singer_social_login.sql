BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS social_provider TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS social_subject TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_social_identity_check' AND conrelid = 'users'::regclass) THEN
    ALTER TABLE users ADD CONSTRAINT users_social_identity_check CHECK (
      (social_provider IS NULL AND social_subject IS NULL) OR
      (social_provider IS NOT NULL AND social_provider IN ('google', 'facebook')
        AND social_subject IS NOT NULL AND LENGTH(social_subject) BETWEEN 1 AND 512
        AND oidc_subject IS NULL AND oidc_issuer IS NULL)
    );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_social_identity
  ON users(social_provider, social_subject) WHERE social_provider IS NOT NULL;

COMMIT;
