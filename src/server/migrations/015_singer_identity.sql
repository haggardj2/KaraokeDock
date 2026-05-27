-- ============================================================================
-- Singer Identity (migration 015)
-- ============================================================================
-- Adds normalized_name to singers for case-insensitive deduplication.
-- Adds singer_id FK to the flat queue table so resortQueueByRotation can use
-- the canonical singer identity instead of raw requested_by text.
-- Backfills existing queue rows by creating/reusing singers from requested_by.
-- ============================================================================

-- -----------------------------------------------------------------------
-- 1. Add normalized_name to singers
-- -----------------------------------------------------------------------

ALTER TABLE singers
  ADD COLUMN IF NOT EXISTS normalized_name TEXT;

-- Backfill normalized_name for existing singers:
-- trim whitespace, collapse multiple spaces, lowercase.
UPDATE singers
   SET normalized_name = lower(regexp_replace(trim(display_name), '\s+', ' ', 'g'))
 WHERE normalized_name IS NULL;

-- Going forward normalized_name is required
ALTER TABLE singers
  ALTER COLUMN normalized_name SET NOT NULL;

-- Unique index so we can efficiently deduplicate by canonical name.
-- Use a partial unique index to avoid conflicts on older rows that might
-- temporarily have duplicate normalizations before the backfill runs.
CREATE UNIQUE INDEX IF NOT EXISTS idx_singers_normalized_name ON singers(normalized_name);

-- -----------------------------------------------------------------------
-- 2. Add singer_id to queue
-- -----------------------------------------------------------------------

ALTER TABLE queue
  ADD COLUMN IF NOT EXISTS singer_id BIGINT REFERENCES singers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_queue_singer_id ON queue(singer_id);

-- -----------------------------------------------------------------------
-- 3. Backfill queue.singer_id from queue.requested_by
-- -----------------------------------------------------------------------
-- For every distinct requested_by value in the queue that doesn't already
-- have a matching singer, create one, then link queue rows to it.

DO $$
DECLARE
  r RECORD;
  sid BIGINT;
  norm TEXT;
BEGIN
  FOR r IN
    SELECT DISTINCT COALESCE(requested_by, '') AS rb
      FROM queue
     WHERE singer_id IS NULL
       AND requested_by IS NOT NULL
       AND requested_by <> ''
  LOOP
    norm := lower(regexp_replace(trim(r.rb), '\s+', ' ', 'g'));

    -- Try to find an existing singer by normalized name
    SELECT id INTO sid FROM singers WHERE normalized_name = norm LIMIT 1;

    IF sid IS NULL THEN
      -- Create a new singer
      INSERT INTO singers (display_name, normalized_name, status)
      VALUES (trim(r.rb), norm, 'active')
      RETURNING id INTO sid;
    END IF;

    -- Link queue rows
    UPDATE queue
       SET singer_id = sid
     WHERE COALESCE(requested_by, '') = r.rb
       AND singer_id IS NULL;
  END LOOP;
END $$;
