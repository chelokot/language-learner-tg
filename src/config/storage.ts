import type { Database } from '../types/database.js';

/**
 * Simplest key-value storage on top of Postgres JSONB.
 * Used for storing session and conversation data (using different namespaces)
 */
export class PgKVStorage<T = unknown> {
  constructor(
    private db: Database,
    private namespace = 'session',
  ) {}

  async read(key: string): Promise<T | undefined> {
    const res = await (this.db as any).query?.('SELECT value FROM bot_kv WHERE namespace=$1 AND key=$2', [
      this.namespace,
      key,
    ]);
    return res?.rows?.[0]?.value as T | undefined;
  }

  async write(key: string, value: T): Promise<void> {
    await (this.db as any).query?.(
      `INSERT INTO bot_kv(namespace, key, value)
       VALUES ($1,$2,$3)
       ON CONFLICT (namespace, key)
       DO UPDATE SET value=EXCLUDED.value, updated_at=now()`,
      [this.namespace, key, value],
    );
  }

  async delete(key: string): Promise<void> {
    await (this.db as any).query?.('DELETE FROM bot_kv WHERE namespace=$1 AND key=$2', [this.namespace, key]);
  }
}
