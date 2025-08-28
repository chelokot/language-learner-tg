--! Previous: sha1:f8c47d08e5ae191c76a85c4db3f94f0b4d4798a8
--! Hash: sha1:e0cf69fe9792a31e0216911bb97c2e11d6e025ed

-- Enter migration here
CREATE TABLE IF NOT EXISTS bot_kv (
  namespace   text        NOT NULL,
  key         text        NOT NULL,
  value       jsonb       NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (namespace, key)
);

CREATE INDEX IF NOT EXISTS bot_kv_ns_updated_idx ON bot_kv(namespace, updated_at DESC);
