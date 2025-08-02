CREATE TABLE IF NOT EXISTS app_user (
  user_id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  current_vocab_id INTEGER REFERENCES vocabulary(id)
);

CREATE TABLE IF NOT EXISTS chat (
  chat_id BIGINT PRIMARY KEY,
  title TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vocabulary (
  id SERIAL PRIMARY KEY,
  owner_id BIGINT REFERENCES app_user(user_id),
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS word (
  id SERIAL PRIMARY KEY,
  vocabulary_id INTEGER REFERENCES vocabulary(id),
  front TEXT NOT NULL,
  back TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exercise_state (
  id SERIAL PRIMARY KEY,
  vocabulary_id INTEGER REFERENCES vocabulary(id),
  user_id BIGINT REFERENCES app_user(user_id),
  position INTEGER DEFAULT 0,
  multiplier REAL DEFAULT 1.5
);

CREATE TABLE IF NOT EXISTS score (
  state_id INTEGER REFERENCES exercise_state(id),
  word_id INTEGER REFERENCES word(id),
  score REAL DEFAULT 1,
  next_slot INTEGER DEFAULT 0,
  PRIMARY KEY(state_id, word_id)
);


-- Migrations
ALTER TABLE app_user
  ADD COLUMN IF NOT EXISTS current_vocab_id INTEGER REFERENCES vocabulary(id);
-- === word ===============================================================
ALTER TABLE word
  ADD COLUMN IF NOT EXISTS vocabulary_id INTEGER REFERENCES vocabulary(id);

UPDATE word
SET    vocabulary_id = base_id
WHERE  base_id IS NOT NULL
  AND (vocabulary_id IS NULL OR vocabulary_id <> base_id);

ALTER TABLE word
  DROP COLUMN IF EXISTS base_id;

-- === exercise_state =====================================================
ALTER TABLE exercise_state
  ADD COLUMN IF NOT EXISTS vocabulary_id INTEGER REFERENCES vocabulary(id);

UPDATE exercise_state
SET    vocabulary_id = base_id
WHERE  base_id IS NOT NULL
  AND (vocabulary_id IS NULL OR vocabulary_id <> base_id);

ALTER TABLE exercise_state
  DROP COLUMN IF EXISTS base_id;
