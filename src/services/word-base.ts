import type { Database } from '../types/database.js';

export interface WordBase {
  id: number;
  owner_id: number;
  name: string;
}

export async function createWordBase(args: { db: Database; ownerId: number; name: string }): Promise<WordBase> {
  const result = await args.db.query<WordBase>(
    'INSERT INTO word_base (owner_id, name) VALUES ($1, $2) RETURNING id, owner_id, name',
    [args.ownerId, args.name],
  );
  return result.rows[0];
}

export async function deleteWordBase(args: { db: Database; baseId: number; ownerId: number }): Promise<void> {
  await args.db.query('DELETE FROM word_base WHERE id=$1 AND owner_id=$2', [args.baseId, args.ownerId]);
}

export async function renameWordBase(args: {
  db: Database;
  baseId: number;
  ownerId: number;
  name: string;
}): Promise<WordBase> {
  const result = await args.db.query<WordBase>(
    'UPDATE word_base SET name=$2 WHERE id=$1 AND owner_id=$3 RETURNING id, owner_id, name',
    [args.baseId, args.name, args.ownerId],
  );
  return result.rows[0];
}

export async function listWordBases(args: { db: Database; ownerId: number }): Promise<WordBase[]> {
  const result = await args.db.query<WordBase>('SELECT id, owner_id, name FROM word_base WHERE owner_id=$1', [
    args.ownerId,
  ]);
  return result.rows;
}
