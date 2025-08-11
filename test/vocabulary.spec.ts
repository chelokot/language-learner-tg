import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createVocabulary,
  deleteVocabulary,
  renameVocabulary,
  listVocabularies,
} from "../src/services/vocabulary.js";
import type { Database } from "../src/types/database.js";

describe("vocabulary service", () => {
  let db: Database;

  beforeEach(() => {
    db = { query: vi.fn() } as unknown as Database;
  });

  it("creates a vocabulary with languages", async () => {
    (db.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      rows: [
        {
          id: 1,
          owner_id: 10,
          name: "base",
          goal_language: "English",
          native_language: "Russian",
          goal_code: "EN",
          native_code: "RU",
        },
      ],
    });
    const base = await createVocabulary({
      db,
      ownerId: 10,
      name: "base",
      goalLanguage: "English",
      nativeLanguage: "Russian",
      goalCode: "EN",
      nativeCode: "RU",
      level: "c1",
    });
    expect(db.query).toHaveBeenCalledWith(
      "INSERT INTO vocabulary (owner_id, name, goal_language, native_language, goal_code, native_code, level) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, owner_id, name, goal_language, native_language, goal_code, native_code, level",
      [10, "base", "English", "Russian", "EN", "RU", "c1"],
    );
    expect(base).toEqual({
      id: 1,
      owner_id: 10,
      name: "base",
      goal_language: "English",
      native_language: "Russian",
      goal_code: "EN",
      native_code: "RU",
    });
  });

  it("deletes a vocabulary", async () => {
    await deleteVocabulary({ db, vocabularyId: 2, ownerId: 10 });
    expect(db.query).toHaveBeenCalledWith(
      "DELETE FROM vocabulary WHERE id=$1 AND owner_id=$2",
      [2, 10],
    );
  });

  it("renames a vocabulary", async () => {
    (db.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      rows: [
        {
          id: 3,
          owner_id: 10,
          name: "new",
          goal_language: "English",
          native_language: "Russian",
          goal_code: "EN",
          native_code: "RU",
        },
      ],
    });
    const base = await renameVocabulary({
      db,
      vocabularyId: 3,
      ownerId: 10,
      name: "new",
    });
    expect(db.query).toHaveBeenCalledWith(
      "UPDATE vocabulary SET name=$2 WHERE id=$1 AND owner_id=$3 RETURNING id, owner_id, name, goal_language, native_language, goal_code, native_code",
      [3, "new", 10],
    );
    expect(base).toEqual({
      id: 3,
      owner_id: 10,
      name: "new",
      goal_language: "English",
      native_language: "Russian",
      goal_code: "EN",
      native_code: "RU",
    });
  });

  it("lists vocabularies", async () => {
    (db.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      rows: [
        {
          id: 1,
          owner_id: 10,
          name: "base",
          goal_language: "English",
          native_language: "Russian",
          goal_code: "EN",
          native_code: "RU",
        },
      ],
    });
    const bases = await listVocabularies({ db, ownerId: 10 });
    expect(db.query).toHaveBeenCalledWith(
      "SELECT id, owner_id, name, goal_language, native_language, goal_code, native_code, level FROM vocabulary WHERE owner_id=$1",
      [10],
    );
    expect(bases).toEqual([
      {
        id: 1,
        owner_id: 10,
        name: "base",
        goal_language: "English",
        native_language: "Russian",
        goal_code: "EN",
        native_code: "RU",
      },
    ]);
  });
});
