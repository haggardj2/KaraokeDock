-- Add key adjustment support to queue
-- Key adjustment is stored as semitones (e.g., -2, 0, +3)
-- Range typically -6 to +6 semitones
ALTER TABLE queue ADD COLUMN IF NOT EXISTS key_adjustment INT DEFAULT 0;
