--! Previous: sha1:e1ddf290fd7294500d216d56cee6c0ce83270212
--! Hash: sha1:172500ed57357a7d0e25df294c04dcc13990b1b0

-- Add Goal/Native language columns to vocabulary and optional short codes
ALTER TABLE vocabulary
ADD COLUMN goal_language TEXT NOT NULL DEFAULT 'English',
ADD COLUMN native_language TEXT NOT NULL DEFAULT 'Russian',
ADD COLUMN goal_code TEXT,
ADD COLUMN native_code TEXT;

-- Optional: backfill short codes heuristically for common languages
UPDATE vocabulary
SET goal_code = UPPER(SUBSTRING(goal_language FROM 1 FOR 2)),
native_code = UPPER(SUBSTRING(native_language FROM 1 FOR 2))
WHERE goal_code IS NULL OR native_code IS NULL;
