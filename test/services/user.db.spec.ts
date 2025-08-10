import { describe, it, expect } from "vitest";
import { getCurrentVocabularyId } from "../../src/services/user.js";
import type { Database } from "../../src/types/database.js";

describe("getCurrentVocabularyId", () => {
  it("returns id from DB", async () => {
    const db: Database = {
      query: async () => ({ rows: [{ current_vocab_id: 7 }] }) as any,
    } as any;

    await expect(getCurrentVocabularyId({ db, userId: 1 })).resolves.toBe(7);
  });

  it("if there is no row — returns null", async () => {
    const db: Database = {
      query: async () => ({ rows: [] }) as any,
    } as any;

    await expect(getCurrentVocabularyId({ db, userId: 1 })).resolves.toBeNull();
  });
});
