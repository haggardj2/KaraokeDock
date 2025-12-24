-- Add settings for yt-dlp and request management
INSERT INTO settings (key, value) VALUES
('ytdlp.download_location', '"/media/downloads"'::jsonb),
('ytdlp.allow_downloads', 'true'::jsonb),
('requests.acceptance', '"local"'::jsonb),
('admin.background_tasks_enabled', 'true'::jsonb),
('libraries.local_enabled', 'true'::jsonb),
('libraries.external_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
