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
      const norm = sql.replace(/\s+/g, ' ').trim();
      // --- users
      if (sql.startsWith("INSERT INTO app_user")) {
        return {
          rows: [
            { user_id: params[0], name: params[1], current_vocab_id: current },
          ],
        };
      }
      if (sql.startsWith("UPDATE app_user SET current_vocab_id")) {
        current = params[1];
        return { rows: [] };
      }
      if (sql.startsWith("SELECT current_vocab_id FROM app_user")) {
        return { rows: [{ current_vocab_id: current }] };
      }

      // --- vocabularies
      if (
        sql.startsWith(
          "INSERT INTO vocabulary (owner_id, name, goal_language, native_language, goal_code, native_code, level)",
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
          level: params[6],
        };
        vocabs.push(vocab);
        return { rows: [vocab] };
      }
      if (
        sql.startsWith(
          "SELECT id, owner_id, name, goal_language, native_language, goal_code, native_code, level FROM vocabulary WHERE id=$1",
        )
      ) {
        const v = vocabs.find((v) => v.id === params[0]);
        return { rows: v ? [v] : [] };
      }
      if (
        sql.startsWith(
          "SELECT id, owner_id, name, goal_language, native_language, goal_code, native_code, level FROM vocabulary WHERE owner_id=$1",
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

      // --- words: count
      if (
        sql.startsWith("SELECT COUNT(*)") &&
        sql.includes("FROM word") &&
        sql.includes("vocabulary_id=$1")
      ) {
        const count = words.filter((w) => w.vocabulary_id === params[0]).length;
        return { rows: [{ count: String(count) }] };
      }

      // --- words: addWord SELECT for existence
      if (
        sql.startsWith("SELECT id, vocabulary_id, goal, native") &&
        sql.includes("FROM word") &&
        sql.includes("vocabulary_id=$1") &&
        sql.includes("LOWER(goal)=LOWER($2)") &&
        sql.includes("LOWER(native)=LOWER($3)")
      ) {
        const vocabularyId = params[0];
        const goal = params[1].toLowerCase();
        const native = params[2].toLowerCase();
        const found = words.find(
          (w) =>
            w.vocabulary_id === vocabularyId &&
            (w.goal?.toLowerCase() ?? w.goal?.toLowerCase()) === goal &&
            (w.native?.toLowerCase() ?? w.native?.toLowerCase()) === native,
        );
        if (found) {
          return {
            rows: [
              {
                id: found.id,
                vocabulary_id: found.vocabulary_id,
                goal: found.goal ?? found.goal,
                native: found.native ?? found.native,
              },
            ],
          };
        }
        return { rows: [] };
      }

      if (sql.startsWith("INSERT INTO word")) {
        const word = {
          id: wordId++,
          vocabulary_id: params[0],
          goal: params[1],
          native: params[2],
          score: 0,
          correct_count: 0,
          wrong_count: 0,
        };
        words.push(word);
        return { rows: [word] };
      }

      // --- words: update back
      if (sql.startsWith("UPDATE word SET native=")) {
        const w = words.find((w) => w.id === params[0]);
        if (w) w.native = params[1];
        return { rows: [] };
      }

      // --- words: update stats (updateWordAnswerStats)
      if (
        sql.startsWith("UPDATE word") &&
        sql.includes("correct_count") &&
        sql.includes("wrong_count") &&
        sql.includes("score")
      ) {
        const wordIdParam = params[0];
        const correct = !!params[1];
        const w = words.find((w) => w.id === wordIdParam);
        if (w) {
          w.correct_count = (w.correct_count ?? 0) + (correct ? 1 : 0);
          w.wrong_count = (w.wrong_count ?? 0) + (correct ? 0 : 1);
          const nextScore = (w.score ?? 0) + (correct ? 1 : -1);
          w.score = Math.max(1, nextScore);
        }
        return { rows: [] };
      }

      // --- words: priority-ordered candidates for exercise (new selection)
      if (
        norm.startsWith("SELECT") &&
        norm.includes("FROM word") &&
        norm.includes("WHERE vocabulary_id=$1") &&
        norm.includes("ORDER BY priority DESC")
      ) {
        const vsId = params[0];
        const limit = params[1] ?? 10;
        const pool = words.filter((w) => w.vocabulary_id === vsId);
        // Sort by simple priority: mistakes first, then lower score
        const sorted = pool.sort(
          (a, b) =>
            ((b.wrong_count ?? 0) - (b.correct_count ?? 0)) -
              ((a.wrong_count ?? 0) - (a.correct_count ?? 0)) ||
            (a.score ?? 0) - (b.score ?? 0)
        );
        return { rows: sorted.slice(0, limit) };
      }

      // --- words: random pick for exercise (legacy)
      if (
        sql.startsWith(
          "SELECT id, vocabulary_id, goal, native FROM word WHERE vocabulary_id=$1 ORDER BY random() LIMIT 1",
        )
      ) {
        const w = words.find((word) => word.vocabulary_id === params[0]);
        return { rows: w ? [w] : [] };
      }

      // --- words: stats selection with COALESCE(...) AS ...
      if (
        sql.startsWith("SELECT id, goal, native") &&
        sql.includes("FROM word") &&
        sql.includes("vocabulary_id=$1") &&
        sql.includes("COALESCE(score")
      ) {
        const vsId = params[0];
        const rows = words
          .filter((w) => w.vocabulary_id === vsId)
          .map((w) => ({
            id: w.id,
            goal: w.goal,
            native: w.native,
            score: w.score ?? 0,
            correct_count: w.correct_count ?? 0,
            wrong_count: w.wrong_count ?? 0,
          }));
        return { rows };
      }

      // --- words: simple select by vocabulary (fallback, listWordsForVocabulary)
      if (
        sql.startsWith(
          "SELECT id, goal, native FROM word WHERE vocabulary_id=$1",
        )
      ) {
        const vsId = params[0];
        const rows = words
          .filter((w) => w.vocabulary_id === vsId)
          .map(({ id, goal, native }) => ({ id, goal, native }));
        return { rows };
      }

      // --- words: alphabetical list (used by delete words UI)
      if (
        sql.startsWith("SELECT id, goal, native") &&
        sql.includes("FROM word") &&
        sql.includes("ORDER BY LOWER(goal) ASC")
      ) {
        const vsId = params[0];
        const rows = words
          .filter((w) => w.vocabulary_id === vsId)
          .map(({ id, goal, native }) => ({ id, goal, native }))
          .sort(
            (a, b) =>
              a.goal.toLowerCase().localeCompare(b.goal.toLowerCase()) ||
              a.native.toLowerCase().localeCompare(b.native.toLowerCase()),
          );
        return { rows };
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
    bot = await createBot(createMemoryDb(), {
      preMiddlewares: [createLogMiddleware(logger)],
    });
    bot.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it("creates vocabulary with languages, adds word and performs exercise", async () => {
    const client = server.getClient("test-token");

    console.log('[STEP] /start');
    await client.sendCommand(client.makeCommand("/start"));
    logger.logUser("/start");
    await server.waitBotMessage();
    let updates = await client.getUpdates();

    console.log('[STEP] /menu');
    await client.sendCommand(client.makeCommand("/menu"));
    logger.logUser("/menu");
    await server.waitBotMessage();
    updates = await client.getUpdates();
    const menuUpdate = updates.result[0].message!;
    const menuMsgId = menuUpdate.message_id;

    console.log('[STEP] tap Vocabularies');
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

    console.log('[STEP] tap Create vocabulary');
    await client.sendCallback(
      client.makeCallbackQuery("create_vocab", {
        message: { message_id: listMsgId },
      }),
    );
    logger.logUser("tap Create vocabulary");
    await server.waitBotMessage();
    await client.getUpdates();

    console.log('[STEP] English');
    await client.sendMessage(client.makeMessage("English"));
    logger.logUser("English");
    await server.waitBotMessage();
    await client.getUpdates();

    console.log('[STEP] Russian');
    await client.sendMessage(client.makeMessage("Russian"));
    logger.logUser("Russian");
    await server.waitBotMessage();
    await client.getUpdates();

    console.log('[STEP] c1 preparation');
    await client.sendMessage(client.makeMessage("c1 preparation"));
    logger.logUser("c1 preparation");
    await server.waitBotMessage();
    await client.getUpdates();

    console.log('[STEP] c1');
    await client.sendMessage(client.makeMessage("c1"));
    logger.logUser("c1");
    await server.waitBotMessage();
    updates = await client.getUpdates();
    const vocabUpdate = updates.result.at(-1)!.message!;
    const vocabMsgId = vocabUpdate.message_id;

    console.log('[STEP] tap Add word');
    await client.sendCallback(
      client.makeCallbackQuery("add_word:1", {
        message: { message_id: vocabMsgId },
      }),
    );
    logger.logUser("tap Add word");
    await server.waitBotMessage();
    await client.getUpdates();

    console.log('[STEP] hello');
    await client.sendMessage(client.makeMessage("hello"));
    logger.logUser("hello");
    await server.waitBotMessage();
    await client.getUpdates();

    console.log('[STEP] привет');
    await client.sendMessage(client.makeMessage("привет"));
    logger.logUser("привет");
    await server.waitBotMessage();
    await client.getUpdates();

    console.log('[STEP] stop adding words');
    await client.sendMessage(client.makeMessage("/stop"));
    logger.logUser("/stop");
    await server.waitBotMessage();
    updates = await client.getUpdates();
    const menu2 = updates.result.at(-1)!.message!;
    const menu2MsgId = menu2.message_id;

    console.log('[STEP] tap Exercises');
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

    console.log('[STEP] tap Word EN→RU');
    await client.sendCallback(
      client.makeCallbackQuery("exercise:word:gn", {
        message: { message_id: exMsgId },
      }),
    );
    logger.logUser("tap Word EN→RU");
    await server.waitBotMessage();
    await client.getUpdates();

    console.log('[STEP] answer correct');
    await client.sendMessage(client.makeMessage("привет"));
    logger.logUser("привет");
    await server.waitBotMessage();
    await client.getUpdates();

    console.log('[STEP] answer wrong');
    await client.sendMessage(client.makeMessage("wrong"));
    logger.logUser("wrong");
    await server.waitBotMessage();
    await client.getUpdates();

    console.log('[STEP] stop exercise');
    await client.sendMessage(client.makeMessage("/stop"));
    logger.logUser("/stop");
    await server.waitBotMessage();
    updates = await client.getUpdates();
    const menuUpdate2 = updates.result[0].message!;
    const menuMsgId2 = menuUpdate2.message_id;

    console.log('[STEP] tap Vocabularies 2');
    await client.sendCallback(
      client.makeCallbackQuery("vocabularies", {
        message: { message_id: menuMsgId2 },
      }),
    );
    logger.logUser("tap Vocabularies");
    await server.waitBotMessage();
    updates = await client.getUpdates();
    const listUpdate2 = updates.result.at(-1)!.message!;
    const listMsgId2 = listUpdate2.message_id;

    console.log('[STEP] open vocab again');
    await client.sendCallback(
      client.makeCallbackQuery("open_vocab:1", {
        message: { message_id: listMsgId2 },
      }),
    );
    logger.logUser("tap c1 preparation");
    await server.waitBotMessage();
    updates = await client.getUpdates();
    const vocabUpdate2 = updates.result.at(-1)!.message!;
    const vocabMsgId2 = vocabUpdate2.message_id;

    const events = logger.getEvents();
    generatePdf(events, "test/e2e/reports/user-story.pdf");
    saveJson(events, "test/e2e/reports/user-story.json");
    const expected = JSON.parse(
      fs.readFileSync("test/e2e/expected/user-story.json", "utf8"),
    );
    expect(hasConsecutiveUserMessages(events)).toBe(false);
    expect(events).toEqual(expected);
  }, 70000);
});
