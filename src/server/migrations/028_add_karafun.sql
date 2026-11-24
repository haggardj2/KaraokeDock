-- KaraFun online source settings.
-- Credentials are stored only as the desktop app's password hash (MD5 of the
-- substituted password). The clear password is never stored.
-- The integration is disabled by default until an admin configures it.

INSERT INTO settings (key, value) VALUES
  ('libraries.karafun_enabled', 'false'::jsonb),
  ('karafun.username', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- NOTE: karafun.password_hash is written by the admin API only when a password
-- is supplied. It is intentionally not seeded here.
