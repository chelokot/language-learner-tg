--! Previous: sha1:172500ed57357a7d0e25df294c04dcc13990b1b0
--! Hash: sha1:607991197138d06782261955770df968587d2704

-- Enter migration here
-- Add stats columns to the `word` table (idempotent)
ALTER TABLE word
  ADD COLUMN IF NOT EXISTS score          integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS correct_count  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wrong_count    integer NOT NULL DEFAULT 0;

-- Helpful indexes for sorting in stats screens
CREATE INDEX IF NOT EXISTS word_vocab_score_desc_idx
  ON word (vocabulary_id, score DESC, id);

CREATE INDEX IF NOT EXISTS word_vocab_front_back_ci_idx
  ON word (vocabulary_id, lower(front), lower(back));
