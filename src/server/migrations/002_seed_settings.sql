INSERT INTO settings (key, value) VALUES
('ui.branding', '{"title":"KaraokeDock"}')
ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES
('host.crossfadeMs', '0')
ON CONFLICT (key) DO NOTHING;
