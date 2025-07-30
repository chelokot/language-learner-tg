import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWordBase, deleteWordBase, renameWordBase, listWordBases } from '../src/services/word-base.js';
import type { Database } from '../src/types/database.js';

describe('word base service', () => {
  let db: Database;

  beforeEach(() => {
    db = { query: vi.fn() } as unknown as Database;
  });

  it('creates a word base', async () => {
    (db.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [{ id: 1, owner_id: 10, name: 'base' }] });
    const base = await createWordBase({ db, ownerId: 10, name: 'base' });
    expect(db.query).toHaveBeenCalledWith(
      'INSERT INTO word_base (owner_id, name) VALUES ($1, $2) RETURNING id, owner_id, name',
      [10, 'base'],
    );
    expect(base).toEqual({ id: 1, owner_id: 10, name: 'base' });
  });

  it('deletes a word base', async () => {
    await deleteWordBase({ db, baseId: 2, ownerId: 10 });
    expect(db.query).toHaveBeenCalledWith('DELETE FROM word_base WHERE id=$1 AND owner_id=$2', [2, 10]);
  });

  it('renames a word base', async () => {
    (db.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [{ id: 3, owner_id: 10, name: 'new' }] });
    const base = await renameWordBase({ db, baseId: 3, ownerId: 10, name: 'new' });
    expect(db.query).toHaveBeenCalledWith(
      'UPDATE word_base SET name=$2 WHERE id=$1 AND owner_id=$3 RETURNING id, owner_id, name',
      [3, 'new', 10],
    );
    expect(base).toEqual({ id: 3, owner_id: 10, name: 'new' });
  });

  it('lists word bases', async () => {
    (db.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [{ id: 1, owner_id: 10, name: 'base' }] });
    const bases = await listWordBases({ db, ownerId: 10 });
    expect(db.query).toHaveBeenCalledWith('SELECT id, owner_id, name FROM word_base WHERE owner_id=$1', [10]);
    expect(bases).toEqual([{ id: 1, owner_id: 10, name: 'base' }]);
  });
});
