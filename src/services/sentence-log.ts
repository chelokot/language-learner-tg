import type { Database } from '../types/database.js';

export type SentenceLogRow = {
  id: number;
  user_id: number;
  vocabulary_id: number;
  exercise_kind: 'sentence' | 'word';
  direction: 'gn' | 'ng';
  goal_word: string | null;
  native_word: string | null;
  sentence: string;
  created_at: string;
};

export async function saveSentenceExample(args: {
  db: Database;
  userId: number;
  vocabularyId: number;
  exerciseKind: 'sentence';
  direction: 'gn' | 'ng';
  goalWord?: string | null;
  nativeWord?: string | null;
  sentence: string;
}): Promise<void> {
  await args.db.query(
    `INSERT INTO exercise_sentence_log
     (user_id, vocabulary_id, exercise_kind, direction, goal_word, native_word, sentence)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      args.userId,
      args.vocabularyId,
      args.exerciseKind,
      args.direction,
      args.goalWord ?? null,
      args.nativeWord ?? null,
      args.sentence,
    ],
  );
}

export async function getRecentSentenceExamples(args: {
  db: Database;
  userId: number;
  vocabularyId: number;
  exerciseKind: 'sentence';
  direction: 'gn' | 'ng';
  goalWord?: string | null;
  nativeWord?: string | null;
  limit?: number;
}): Promise<string[]> {
  const LIM = Math.max(1, Math.min(200, args.limit ?? 50));

  const exact = await args.db.query<{ sentence: string }>(
    `SELECT sentence
       FROM exercise_sentence_log
      WHERE user_id=$1
        AND vocabulary_id=$2
        AND exercise_kind=$3
        AND direction=$4
        AND COALESCE(goal_word,'') = COALESCE($5,'')
        AND COALESCE(native_word,'') = COALESCE($6,'')
      ORDER BY created_at DESC
      LIMIT $7`,
    [
      args.userId,
      args.vocabularyId,
      args.exerciseKind,
      args.direction,
      args.goalWord ?? null,
      args.nativeWord ?? null,
      LIM,
    ],
  );
  const out: string[] = exact.rows.map(r => r.sentence);
  if (out.length >= LIM) return out;

  const rest1 = await args.db.query<{ sentence: string }>(
    `SELECT sentence
       FROM exercise_sentence_log
      WHERE user_id=$1
        AND vocabulary_id=$2
        AND exercise_kind=$3
        AND direction=$4
      ORDER BY created_at DESC
      LIMIT $5`,
    [args.userId, args.vocabularyId, args.exerciseKind, args.direction, LIM],
  );
  for (const r of rest1.rows) {
    if (out.length >= LIM) break;
    if (!out.includes(r.sentence)) out.push(r.sentence);
  }
  if (out.length >= LIM) return out;

  const rest2 = await args.db.query<{ sentence: string }>(
    `SELECT sentence
       FROM exercise_sentence_log
      WHERE user_id=$1
      ORDER BY created_at DESC
      LIMIT $2`,
    [args.userId, LIM],
  );
  for (const r of rest2.rows) {
    if (out.length >= LIM) break;
    if (!out.includes(r.sentence)) out.push(r.sentence);
  }
  return out.slice(0, LIM);
}
