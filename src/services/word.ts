import type { Database } from "../types/database.js";

export type WordRow = {
  id: number;
  vocabulary_id: number;
  front: string;
  back: string;
  score?: number | null;
  correct_count?: number | null;
  wrong_count?: number | null;
};

export interface Word {
  id: number;
  vocabulary_id: number;
  front: string;
  back: string;
}

export async function countWordsInVocabulary(args: {
  db: Database;
  vocabularyId: number;
}): Promise<number> {
  const res = await args.db.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM word WHERE vocabulary_id=$1",
    [args.vocabularyId],
  );
  return Number(res.rows[0]?.count || 0);
}

export async function listWordStatsForVocabulary(args: {
  db: Database;
  vocabularyId: number;
}): Promise<
  Array<{
    id: number;
    front: string;
    back: string;
    score: number;
    correct: number;
    mistakes: number;
  }>
> {
  try {
    const res = await args.db.query<{
      id: number;
      front: string;
      back: string;
      score: number | null;
      correct_count: number | null;
      wrong_count: number | null;
    }>(
      `SELECT id, front, back,
              COALESCE(score, 0) AS score,
              COALESCE(correct_count, 0) AS correct_count,
              COALESCE(wrong_count, 0) AS wrong_count
       FROM word
       WHERE vocabulary_id=$1`,
      [args.vocabularyId],
    );
    return res.rows.map((r) => ({
      id: r.id,
      front: r.front,
      back: r.back,
      score: r.score ?? 0,
      correct: r.correct_count ?? 0,
      mistakes: r.wrong_count ?? 0,
    }));
  } catch {
    // Fallback if columns not present yet (shouldn't happen after migration)
    const res = await args.db.query<{
      id: number;
      front: string;
      back: string;
    }>(`SELECT id, front, back FROM word WHERE vocabulary_id=$1`, [
      args.vocabularyId,
    ]);
    return res.rows.map((r) => ({
      id: r.id,
      front: r.front,
      back: r.back,
      score: 0,
      correct: 0,
      mistakes: 0,
    }));
  }
}

export async function listWordsForVocabulary(args: {
  db: Database;
  vocabularyId: number;
}): Promise<Array<{ id: number; front: string; back: string }>> {
  const res = await args.db.query<{ id: number; front: string; back: string }>(
    `SELECT id, front, back
     FROM word
     WHERE vocabulary_id=$1
     ORDER BY LOWER(front) ASC, LOWER(back) ASC`,
    [args.vocabularyId],
  );
  return res.rows;
}

export async function deleteWordsByTexts(args: {
  db: Database;
  vocabularyId: number;
  tokens: string[];
}): Promise<{ deleted: Array<{ id: number; front: string; back: string }> }> {
  const tokens = Array.from(
    new Set(args.tokens.map((t) => t.trim().toLowerCase()).filter(Boolean)),
  );
  if (tokens.length === 0) return { deleted: [] };

  const res = await args.db.query<{ id: number; front: string; back: string }>(
    `DELETE FROM word
     WHERE vocabulary_id=$1
       AND (LOWER(front) = ANY($2::text[]) OR LOWER(back) = ANY($2::text[]))
     RETURNING id, front, back`,
    [args.vocabularyId, tokens],
  );

  return { deleted: res.rows };
}

export async function addWord(args: {
  db: Database;
  vocabularyId: number;
  front: string;
  back: string;
}): Promise<Word> {
  const result = await args.db.query<Word>(
    "INSERT INTO word (vocabulary_id, front, back) VALUES ($1, $2, $3) RETURNING id, vocabulary_id, front, back",
    [args.vocabularyId, args.front, args.back],
  );
  return result.rows[0];
}

export async function deleteWord(args: {
  db: Database;
  wordId: number;
}): Promise<void> {
  await args.db.query("DELETE FROM word WHERE id=$1", [args.wordId]);
}

export async function editWord(args: {
  db: Database;
  wordId: number;
  front: string;
  back: string;
}): Promise<Word> {
  const result = await args.db.query<Word>(
    "UPDATE word SET front=$2, back=$3 WHERE id=$1 RETURNING id, vocabulary_id, front, back",
    [args.wordId, args.front, args.back],
  );
  return result.rows[0];
}

export async function listWords(args: {
  db: Database;
  vocabularyId: number;
}): Promise<Word[]> {
  const result = await args.db.query<Word>(
    "SELECT id, vocabulary_id, front, back FROM word WHERE vocabulary_id=$1",
    [args.vocabularyId],
  );
  return result.rows;
}

export async function getRandomWord(args: {
  db: Database;
  vocabularyId: number;
}): Promise<Word | null> {
  const result = await args.db.query<Word>(
    "SELECT id, vocabulary_id, front, back FROM word WHERE vocabulary_id=$1 ORDER BY random() LIMIT 1",
    [args.vocabularyId],
  );
  return result.rows[0] ?? null;
}

/**
 * Increment stats after an answer and keep score >= 1.
 * If you prefer to mimic your sbsr.updateScore() logic exactly,
 * you can fetch current score and compute in TS, but this SQL is efficient and safe.
 */
export async function updateWordAnswerStats(args: {
  db: Database;
  wordId: number;
  correct: boolean;
}): Promise<void> {
  await args.db.query(
    `UPDATE word
       SET correct_count = COALESCE(correct_count, 0) + CASE WHEN $2 THEN 1 ELSE 0 END,
           wrong_count   = COALESCE(wrong_count,   0) + CASE WHEN $2 THEN 0 ELSE 1 END,
           score         = GREATEST(1, COALESCE(score, 0) + CASE WHEN $2 THEN 1 ELSE -1 END)
     WHERE id = $1`,
    [args.wordId, args.correct],
  );
}
