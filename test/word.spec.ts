import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addWord, deleteWord, editWord, listWords } from '../src/services/word.js';
import type { Database } from '../src/types/database.js';

describe('word service', () => {
  let db: Database;

  beforeEach(() => {
    db = { query: vi.fn() } as unknown as Database;
  });

  it('adds a word', async () => {
    (db.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [{ id: 1, vocabulary_id: 2, front: 'a', back: 'b' }] });
    const word = await addWord({ db, vocabularyId: 2, front: 'a', back: 'b' });
    expect(db.query).toHaveBeenCalledWith(
      'INSERT INTO word (vocabulary_id, front, back) VALUES ($1, $2, $3) RETURNING id, vocabulary_id, front, back',
      [2, 'a', 'b'],
    );
    expect(word).toEqual({ id: 1, vocabulary_id: 2, front: 'a', back: 'b' });
  });

  it('deletes a word', async () => {
    await deleteWord({ db, wordId: 3 });
    expect(db.query).toHaveBeenCalledWith('DELETE FROM word WHERE id=$1', [3]);
  });

  it('edits a word', async () => {
    (db.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [{ id: 3, vocabulary_id: 2, front: 'c', back: 'd' }] });
    const word = await editWord({ db, wordId: 3, front: 'c', back: 'd' });
    expect(db.query).toHaveBeenCalledWith(
      'UPDATE word SET front=$2, back=$3 WHERE id=$1 RETURNING id, vocabulary_id, front, back',
      [3, 'c', 'd'],
    );
    expect(word).toEqual({ id: 3, vocabulary_id: 2, front: 'c', back: 'd' });
  });

  it('lists words', async () => {
    (db.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [{ id: 1, vocabulary_id: 2, front: 'a', back: 'b' }] });
    const words = await listWords({ db, vocabularyId: 2 });
    expect(db.query).toHaveBeenCalledWith('SELECT id, vocabulary_id, front, back FROM word WHERE vocabulary_id=$1', [2]);
    expect(words).toEqual([{ id: 1, vocabulary_id: 2, front: 'a', back: 'b' }]);
  });
});
