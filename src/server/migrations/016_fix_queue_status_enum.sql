-- ============================================================================
-- Migration 016: Fix track_status enum (add 'done' and 'removed')
-- ============================================================================
-- The server code uses 'done' (instead of 'finished') and 'removed' (instead
-- of 'cancelled') as terminal queue status values.  Add both values to the
-- existing track_status enum so those updates no longer fail.
-- 'IF NOT EXISTS' makes this safe to run multiple times.
-- ============================================================================

ALTER TYPE track_status ADD VALUE IF NOT EXISTS 'done';
ALTER TYPE track_status ADD VALUE IF NOT EXISTS 'removed';
