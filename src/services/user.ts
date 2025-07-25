import type { Database, User } from '../types/database.js';

export function buildName(firstName: string, lastName?: string) {
  return lastName ? `${firstName} ${lastName}` : firstName;
}

export async function getOrCreateUser(args: { db: Database; userId: number; name: string }): Promise<User> {
  const result = await args.db.query<User>(
    'INSERT INTO app_user (user_id, name) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name RETURNING user_id, name',
    [args.userId, args.name],
  );
  return result.rows[0];
}
