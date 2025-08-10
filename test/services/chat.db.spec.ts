import { describe, it, expect } from "vitest";
import { getOrCreateChat } from "../../src/services/chat.js";
import type { Database } from "../../src/types/database.js";

describe("getOrCreateChat", () => {
  it("calls the database with correct SQL and parameters and returns the first row", async () => {
    const calls: any[] = [];
    const db: Database = {
      query: async (sql: string, params: any[]) => {
        calls.push([sql, params]);
        return { rows: [{ chat_id: 123, title: "My Chat" }] } as any;
      },
    } as any;

    const chat = await getOrCreateChat({ db, chatId: 123, title: "My Chat" });
    expect(chat).toEqual({ chat_id: 123, title: "My Chat" });
    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toEqual([123, "My Chat"]);
    expect(typeof calls[0][0]).toBe("string");
    expect(calls[0][0]).toMatch(/INSERT INTO chat/i);
  });
});
