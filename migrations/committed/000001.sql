--! Previous: -
--! Hash: sha1:e1ddf290fd7294500d216d56cee6c0ce83270212

CREATE TABLE app_user (
  user_id BIGINT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE chat (
  chat_id BIGINT PRIMARY KEY,
  title TEXT NOT NULL
);

CREATE TABLE vocabulary (
  id SERIAL PRIMARY KEY,
  owner_id BIGINT REFERENCES app_user(user_id),
  name TEXT NOT NULL
);

ALTER TABLE app_user
  ADD COLUMN current_vocab_id INTEGER REFERENCES vocabulary(id);

CREATE TABLE word (
  id SERIAL PRIMARY KEY,
  vocabulary_id INTEGER REFERENCES vocabulary(id),
  front TEXT NOT NULL,
  back TEXT NOT NULL
);

CREATE TABLE exercise_state (
  id SERIAL PRIMARY KEY,
  vocabulary_id INTEGER REFERENCES vocabulary(id),
  user_id BIGINT REFERENCES app_user(user_id),
  position INTEGER DEFAULT 0,
  multiplier REAL DEFAULT 1.5
);

CREATE TABLE score (
  state_id INTEGER REFERENCES exercise_state(id),
  word_id INTEGER REFERENCES word(id),
  score REAL DEFAULT 1,
  next_slot INTEGER DEFAULT 0,
  PRIMARY KEY(state_id, word_id)
);
