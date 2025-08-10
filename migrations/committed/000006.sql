--! Previous: sha1:2340d6ba826a7dee9c378c93813cc2b8b3ae05ba
--! Hash: sha1:f8c47d08e5ae191c76a85c4db3f94f0b4d4798a8

-- Enter migration here
-- up
CREATE TABLE IF NOT EXISTS exercise_sentence_log (
  id              bigserial PRIMARY KEY,
  user_id         bigint NOT NULL,
  vocabulary_id   bigint NOT NULL,
  exercise_kind   text   NOT NULL,
  direction       text   NOT NULL,
  goal_word       text   NOT NULL,
  native_word     text   NOT NULL,
  sentence        text   NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exlog_full_idx
  ON exercise_sentence_log (user_id, vocabulary_id, exercise_kind, direction, COALESCE(goal_word,''), COALESCE(native_word,''), created_at DESC);
CREATE INDEX IF NOT EXISTS exlog_by_vocab_idx
  ON exercise_sentence_log (user_id, vocabulary_id, exercise_kind, direction, created_at DESC);
CREATE INDEX IF NOT EXISTS exlog_by_user_idx
  ON exercise_sentence_log (user_id, created_at DESC);
