import type { Database } from '../types/database.js';

export interface Word {
  id: number;
  vocabulary_id: number;
  front: string;
  back: string;
}

export async function addWord(args: {
  db: Database;
  vocabularyId: number;
  front: string;
  back: string;
}): Promise<Word> {
  const result = await args.db.query<Word>(
    'INSERT INTO word (vocabulary_id, front, back) VALUES ($1, $2, $3) RETURNING id, vocabulary_id, front, back',
    [args.vocabularyId, args.front, args.back],
  );
  return result.rows[0];
}

export async function deleteWord(args: { db: Database; wordId: number }): Promise<void> {
  await args.db.query('DELETE FROM word WHERE id=$1', [args.wordId]);
}

export async function editWord(args: { db: Database; wordId: number; front: string; back: string }): Promise<Word> {
  const result = await args.db.query<Word>(
    'UPDATE word SET front=$2, back=$3 WHERE id=$1 RETURNING id, vocabulary_id, front, back',
    [args.wordId, args.front, args.back],
  );
  return result.rows[0];
}

export async function listWords(args: { db: Database; vocabularyId: number }): Promise<Word[]> {
  const result = await args.db.query<Word>('SELECT id, vocabulary_id, front, back FROM word WHERE vocabulary_id=$1', [
    args.vocabularyId,
  ]);
  return result.rows;
}

export async function getRandomWord(args: { db: Database; vocabularyId: number }): Promise<Word | null> {
  const result = await args.db.query<Word>(
    'SELECT id, vocabulary_id, front, back FROM word WHERE vocabulary_id=$1 ORDER BY random() LIMIT 1',
    [args.vocabularyId],
  );
  return result.rows[0] ?? null;
}
