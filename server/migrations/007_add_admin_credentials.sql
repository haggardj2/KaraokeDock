-- Add admin credentials to settings table
-- This allows the admin token to be stored in the database and changed via the Admin UI

INSERT INTO settings (key, value) VALUES
('admin.token', '""')
ON CONFLICT (key) DO NOTHING;
