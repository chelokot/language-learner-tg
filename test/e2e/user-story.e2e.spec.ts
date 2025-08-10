import { describe, it, beforeEach, afterEach, expect } from "vitest";
import TelegramServer from "telegram-test-api";
import { createBot } from "../../src/config/bot.js";
import type { CustomContext } from "../../src/types/context.js";
import type { Database } from "../../src/types/database.js";
import { Bot } from "grammy";
import {
  ChatLogger,
  generatePdf,
  saveJson,
  createLogMiddleware,
  hasConsecutiveUserMessages,
} from "../helpers/chat-logger.js";
import fs from "fs";

function createMemoryDb(): Database {
  let vocabId = 1;
  let wordId = 1;
  const vocabs: any[] = [];
  const words: any[] = [];
  let current: number | null = null;
  return {
    async query(sql: string, params: any[]) {
      if (sql.startsWith("INSERT INTO app_user")) {
        return {
          rows: [
            { user_id: params[0], name: params[1], current_vocab_id: current },
          ],
        };
      }
      if (
        sql.startsWith(
          "INSERT INTO vocabulary (owner_id, name, goal_language, native_language, goal_code, native_code)",
        )
      ) {
        const vocab = {
          id: vocabId++,
          owner_id: params[0],
          name: params[1],
          goal_language: params[2],
          native_language: params[3],
          goal_code: params[4],
          native_code: params[5],
        };
        vocabs.push(vocab);
        return { rows: [vocab] };
      }
      if (
        sql.startsWith(
          "SELECT id, owner_id, name, goal_language, native_language, goal_code, native_code FROM vocabulary WHERE id=$1",
        )
      ) {
        const v = vocabs.find((v) => v.id === params[0]);
        return { rows: v ? [v] : [] };
      }
      if (
        sql.startsWith(
          "SELECT id, owner_id, name, goal_language, native_language, goal_code, native_code FROM vocabulary WHERE owner_id=$1",
        )
      ) {
        return { rows: vocabs.filter((v) => v.owner_id === params[0]) };
      }
      if (sql.startsWith("UPDATE vocabulary SET name")) {
        const vocab = vocabs.find(
          (v) => v.id === params[0] && v.owner_id === params[2],
        );
        if (vocab) vocab.name = params[1];
        return { rows: vocab ? [vocab] : [] };
      }
      if (sql.startsWith("DELETE FROM vocabulary")) {
        const idx = vocabs.findIndex(
          (v) => v.id === params[0] && v.owner_id === params[1],
        );
        if (idx !== -1) vocabs.splice(idx, 1);
        return { rows: [] };
      }
      if (sql.startsWith("UPDATE app_user SET current_vocab_id")) {
        current = params[1];
        return { rows: [] };
      }
      if (sql.startsWith("SELECT current_vocab_id FROM app_user")) {
        return { rows: [{ current_vocab_id: current }] };
      }
      if (sql.startsWith("INSERT INTO word")) {
        const word = {
          id: wordId++,
          vocabulary_id: params[0],
          front: params[1],
          back: params[2],
        };
        words.push(word);
        return { rows: [word] };
      }
      if (sql.startsWith("UPDATE word SET back=")) {
        const w = words.find((w) => w.id === params[0]);
        if (w) w.back = params[1];
        return { rows: [] };
      }
      if (
        sql.startsWith(
          "SELECT id, vocabulary_id, front, back FROM word WHERE vocabulary_id=$1 ORDER BY random() LIMIT 1",
        )
      ) {
        const w = words.find((word) => word.vocabulary_id === params[0]);
        return { rows: w ? [w] : [] };
      }
      return { rows: [] };
    },
  } as unknown as Database;
}

describe("basic user story e2e", () => {
  let server: TelegramServer;
  let bot: Bot<CustomContext>;
  const logger = new ChatLogger();

  beforeEach(async () => {
    server = new TelegramServer({ port: 9998 });
    await server.start();
    process.env.TOKEN = "test-token";
    process.env.TELEGRAM_API_ROOT = server.config.apiURL;
    bot = createBot(createMemoryDb(), {
      preMiddlewares: [createLogMiddleware(logger)],
    });
    bot.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it("creates vocabulary with languages, adds word and performs exercise", async () => {
    const client = server.getClient("test-token");

    await client.sendCommand(client.makeCommand("/start"));
    logger.logUser("/start");
    await server.waitBotMessage();
    let updates = await client.getUpdates();

    await client.sendCommand(client.makeCommand("/menu"));
    logger.logUser("/menu");
    await server.waitBotMessage();
    updates = await client.getUpdates();
    const menuUpdate = updates.result[0].message!;
    const menuMsgId = menuUpdate.message_id;

    await client.sendCallback(
      client.makeCallbackQuery("vocabularies", {
        message: { message_id: menuMsgId },
      }),
    );
    logger.logUser("tap Vocabularies");
    await server.waitBotMessage();
    updates = await client.getUpdates();
    const listUpdate = updates.result.at(-1)!.message!;
    const listMsgId = listUpdate.message_id;

    await client.sendCallback(
      client.makeCallbackQuery("create_vocab", {
        message: { message_id: listMsgId },
      }),
    );
    logger.logUser("tap Create vocabulary");
    await server.waitBotMessage();
    await client.getUpdates();

    await client.sendMessage(client.makeMessage("English"));
    logger.logUser("English");
    await server.waitBotMessage();
    await client.getUpdates();

    await client.sendMessage(client.makeMessage("Russian"));
    logger.logUser("Russian");
    await server.waitBotMessage();
    await client.getUpdates();

    await client.sendMessage(client.makeMessage("c1 preparation"));
    logger.logUser("c1 preparation");
    await server.waitBotMessage();
    updates = await client.getUpdates();
    const vocabUpdate = updates.result.at(-1)!.message!;
    const vocabMsgId = vocabUpdate.message_id;

    await client.sendCallback(
      client.makeCallbackQuery("add_word:1", {
        message: { message_id: vocabMsgId },
      }),
    );
    logger.logUser("tap Add word");
    await server.waitBotMessage();
    await client.getUpdates();

    await client.sendMessage(client.makeMessage("hello"));
    logger.logUser("hello");
    await server.waitBotMessage();
    await client.getUpdates();

    await client.sendMessage(client.makeMessage("привет"));
    logger.logUser("привет");
    await server.waitBotMessage();
    await client.getUpdates();

    await client.sendMessage(client.makeMessage("/stop"));
    logger.logUser("/stop");
    await server.waitBotMessage();
    updates = await client.getUpdates();
    const menu2 = updates.result.at(-1)!.message!;
    const menu2MsgId = menu2.message_id;

    await client.sendCallback(
      client.makeCallbackQuery("exercises", {
        message: { message_id: menu2MsgId },
      }),
    );
    logger.logUser("tap Exercises");
    await server.waitBotMessage();
    updates = await client.getUpdates();
    const exUpdate = updates.result.at(-1)!.message!;
    const exMsgId = exUpdate.message_id;

    await client.sendCallback(
      client.makeCallbackQuery("exercise:word:gn", {
        message: { message_id: exMsgId },
      }),
    );
    logger.logUser("tap Word EN→RU");
    await server.waitBotMessage();
    await client.getUpdates();

    await client.sendMessage(client.makeMessage("привет"));
    logger.logUser("привет");
    await server.waitBotMessage();
    await client.getUpdates();

    await client.sendMessage(client.makeMessage("wrong"));
    logger.logUser("wrong");
    await server.waitBotMessage();
    await client.getUpdates();

    await client.sendMessage(client.makeMessage("/stop"));
    logger.logUser("/stop");
    await server.waitBotMessage();
    await client.getUpdates();

    const events = logger.getEvents();
    generatePdf(events, "test/e2e/reports/user-story.pdf");
    saveJson(events, "test/e2e/reports/user-story.json");
    const expected = JSON.parse(
      fs.readFileSync("test/e2e/expected/user-story.json", "utf8"),
    );
    expect(hasConsecutiveUserMessages(events)).toBe(false);
    expect(events).toEqual(expected);
  }, 40000);
});
