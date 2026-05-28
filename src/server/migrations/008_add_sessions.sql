-- Add sessions table for authentication
-- This replaces the admin token system with session-based authentication

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Fresh installs no longer seed a known default admin password here.
-- Startup generates a one-time bootstrap password when ADMIN_PASSWORD is unset.
