CREATE TABLE IF NOT EXISTS app_user (
  user_id BIGINT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat (
  chat_id BIGINT PRIMARY KEY,
  title TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS word_base (
  id SERIAL PRIMARY KEY,
  owner_id BIGINT REFERENCES app_user(user_id),
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS word (
  id SERIAL PRIMARY KEY,
  base_id INTEGER REFERENCES word_base(id),
  front TEXT NOT NULL,
  back TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exercise_state (
  id SERIAL PRIMARY KEY,
  base_id INTEGER REFERENCES word_base(id),
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
