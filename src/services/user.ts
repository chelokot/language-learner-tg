import type { Database, User } from '../types/database.js';

export function buildName(firstName: string, lastName?: string) {
  return lastName ? `${firstName} ${lastName}` : firstName;
}

export async function getOrCreateUser(args: { db: Database; userId: number; name: string }): Promise<User> {
  const result = await args.db.query<User>(
    'INSERT INTO app_user (user_id, name) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name RETURNING user_id, name, current_vocab_id',
    [args.userId, args.name],
  );
  return result.rows[0];
}

export async function setCurrentVocabulary(args: {
  db: Database;
  userId: number;
  vocabularyId: number;
}): Promise<void> {
  await args.db.query('UPDATE app_user SET current_vocab_id=$2 WHERE user_id=$1', [args.userId, args.vocabularyId]);
}

export async function getCurrentVocabularyId(args: { db: Database; userId: number }): Promise<number | null> {
  const result = await args.db.query<{ current_vocab_id: number }>(
    'SELECT current_vocab_id FROM app_user WHERE user_id=$1',
    [args.userId],
  );
  return result.rows[0]?.current_vocab_id ?? null;
}
