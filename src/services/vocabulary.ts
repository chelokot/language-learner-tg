import type { Database } from '../types/database.js';

export interface Vocabulary {
  id: number;
  owner_id: number;
  name: string;
  goal_language: string;
  native_language: string;
  goal_code: string;
  native_code: string;
  level: string;
}

export async function createVocabulary(args: {
  db: Database;
  ownerId: number;
  name: string;
  goalLanguage: string;
  nativeLanguage: string;
  goalCode: string;
  nativeCode: string;
  level: string;
}): Promise<Vocabulary> {
  const result = await args.db.query<Vocabulary>(
    'INSERT INTO vocabulary (owner_id, name, goal_language, native_language, goal_code, native_code, level) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, owner_id, name, goal_language, native_language, goal_code, native_code, level',
    [args.ownerId, args.name, args.goalLanguage, args.nativeLanguage, args.goalCode, args.nativeCode, args.level],
  );
  console.log(result, args);
  return result.rows[0];
}

export async function deleteVocabulary(args: {
  vocabularyId: number;
  ownerId: number;
  db: Database;
}): Promise<void> {
  await args.db.query('DELETE FROM vocabulary WHERE id=$1 AND owner_id=$2', [args.vocabularyId, args.ownerId]);
}

export async function renameVocabulary(args: {
  db: Database;
  vocabularyId: number;
  ownerId: number;
  name: string;
}): Promise<Vocabulary> {
  const result = await args.db.query<Vocabulary>(
    'UPDATE vocabulary SET name=$2 WHERE id=$1 AND owner_id=$3 RETURNING id, owner_id, name, goal_language, native_language, goal_code, native_code',
    [args.vocabularyId, args.name, args.ownerId],
  );
  return result.rows[0];
}

export async function listVocabularies(args: {
  db: Database;
  ownerId: number;
}): Promise<Vocabulary[]> {
  const result = await args.db.query<Vocabulary>(
    'SELECT id, owner_id, name, goal_language, native_language, goal_code, native_code, level FROM vocabulary WHERE owner_id=$1',
    [args.ownerId],
  );
  return result.rows;
}

export async function getVocabulary(args: {
  db: Database;
  vocabularyId: number;
}): Promise<Vocabulary | null> {
  const result = await args.db.query<Vocabulary>(
    'SELECT id, owner_id, name, goal_language, native_language, goal_code, native_code, level FROM vocabulary WHERE id=$1',
    [args.vocabularyId],
  );
  return result.rows[0] ?? null;
}
