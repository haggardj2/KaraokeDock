-- Explicit credential links only: existing shared singers do not imply shared permissions.
BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS canonical_user_id INT REFERENCES users(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_users_canonical_user_id ON users(canonical_user_id);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'users'::regclass AND conname = 'users_social_account_link_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_social_account_link_check CHECK (
      canonical_user_id IS NULL OR (
        canonical_user_id <> id AND social_provider IS NOT NULL AND social_subject IS NOT NULL
        AND password_hash IS NULL AND oidc_subject IS NULL
      )
    );
  END IF;
END $$;

-- Retain the credential used for a canonical session, so disabling that login invalidates it.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS login_user_id INT REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_sessions_login_user_id ON sessions(login_user_id);

COMMIT;
