CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE singers
  ADD COLUMN IF NOT EXISTS public_uuid TEXT;

UPDATE singers
   SET public_uuid = gen_random_uuid()::text
 WHERE public_uuid IS NULL OR public_uuid = '';

ALTER TABLE singers
  ALTER COLUMN public_uuid SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_singers_public_uuid ON singers(public_uuid);
