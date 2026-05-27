-- Add users table for multi-user management
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT, -- null for OIDC-only users
  display_name TEXT,
  picture TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT true,
  oidc_subject TEXT,
  oidc_issuer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure older existing users tables gain OIDC/profile columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS picture TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS oidc_subject TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS oidc_issuer TEXT;

-- Constraint on role values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_role_check' AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'user'));
  END IF;
END $$;

-- Index for OIDC subject lookups
CREATE INDEX IF NOT EXISTS idx_users_oidc ON users(oidc_subject, oidc_issuer) WHERE oidc_subject IS NOT NULL;

-- Add user_id and role to sessions for role-based access control
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin';
