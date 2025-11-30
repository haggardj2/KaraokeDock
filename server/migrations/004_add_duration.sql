-- migrations/004_add_duration.sql
-- Add duration_ms column to tracks table if it doesn't exist
ALTER TABLE tracks 
ADD COLUMN IF NOT EXISTS duration_ms INTEGER DEFAULT NULL;

-- Update the queue view to include duration
-- The queue API endpoint will automatically pick this up
