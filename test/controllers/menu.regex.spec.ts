import { describe, it, beforeEach, afterEach, expect } from "vitest";
import TelegramServer from "telegram-test-api";
import { createBot } from "../../src/config/bot.js";
import type { Bot } from "grammy";
import type { CustomContext } from "../../src/types/context.js";
import type { Database } from "../../src/types/database.js";

function createMemoryDbWithVocab(
  vocabId: number,
  goal = "English",
  native = "Russian",
): Database {
  return {
    async query(sql: string, params: any[]) {
      if (sql.startsWith("INSERT INTO app_user")) {
        return {
          rows: [
            { user_id: params[0], name: params[1], current_vocab_id: null },
          ],
        };
      }
      if (
        sql.startsWith(
          "SELECT id, owner_id, name, goal_language, native_language",
        )
      ) {
        // by id
        return {
          rows: [
            {
              id: vocabId,
              owner_id: 1,
              name: "test-vocab",
              goal_language: goal,
              native_language: native,
              goal_code: "EN",
              native_code: "RU",
            },
          ].filter((v) => v.id === params[0]),
        };
      }
      // everything else — empty
      return { rows: [] };
    },
  } as unknown as Database;
}

describe("menu callback regex", () => {
  let server: TelegramServer;
  let bot: Bot<CustomContext>;

  beforeEach(async () => {
    server = new TelegramServer({ port: 9997 });
    await server.start();
    process.env.TOKEN = "test-token";
    process.env.TELEGRAM_API_ROOT = server.config.apiURL;

    bot = await createBot(createMemoryDbWithVocab(12));
    bot.start();
  });

  afterEach(async () => {
    await bot.stop();
    await server.stop();
  });

  it("open_vocab accepts only digits (d+), open_vocab:12 works, open_vocab:abc does not", async () => {
    const client = server.getClient("test-token");

    await client.sendCommand(client.makeCommand("/menu"));
    await server.waitBotMessage();
    const updates1 = await client.getUpdates();
    const menuMsgId = updates1.result.at(-1)!.message!.message_id;

    await client.sendCallback(
      client.makeCallbackQuery("open_vocab:12", {
        message: { message_id: menuMsgId },
      }),
    );
    await server.waitBotMessage();
    const updates2 = await client.getUpdates();
    const lastText = updates2.result.at(-1)!.message!.text!;
    expect(lastText).toMatch(/Vocabulary/i);

    const before = updates2.result.length;
    await client.sendCallback(
      client.makeCallbackQuery("open_vocab:abc", {
        message: { message_id: menuMsgId },
      }),
    );
    await expect(client.getUpdates()).rejects.toThrowError(
      /did not get new updates in 1000 ms/i,
    );
  });
});
