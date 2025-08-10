import { createConversation } from "@grammyjs/conversations";
import type { Conversation } from "@grammyjs/conversations";
import { Composer } from "grammy";
import { waitText } from "../helpers/wait-text.js";
import { checkTranslation } from "../services/exercise.js";
import {
  getCurrentVocabularyId,
  setCurrentVocabulary,
} from "../services/user.js";
import {
  createVocabulary,
  deleteVocabulary,
  getVocabulary,
  listVocabularies,
  renameVocabulary,
  Vocabulary,
} from "../services/vocabulary.js";
import {
  addWord,
  getRandomWord,
  countWordsInVocabulary,
  listWordStatsForVocabulary,
  listWordsForVocabulary,
  deleteWordsByTexts,
  updateWordAnswerStats,
} from "../services/word.js";
import type { CustomContext } from "../types/context.js";
import {
  kbExercisesForVocab,
  kbMenu,
  kbVocabularies,
  kbVocabulary,
  kbConfirmDeleteVocabulary,
} from "../ui/keyboards.js";
import { CONVERSATION_NAMES } from "./CONVERSATION_NAMES.js";
import {
  autoTranslate,
  generateSentenceWithTerm,
  inferLanguageCode,
  judgeTranslation,
} from "../services/translate.js";

export const menuController = new Composer<CustomContext>();

async function showMenu(ctx: CustomContext) {
  await ctx.reply("Menu", { reply_markup: kbMenu() });
}

async function loadCurrentVocab(
  ctx: CustomContext,
): Promise<Vocabulary | null> {
  const currentId = ctx.dbEntities.user.current_vocab_id;
  if (!currentId) return null;
  return await getVocabulary({ db: ctx.db, vocabularyId: currentId });
}

async function showVocabularies(ctx: CustomContext) {
  const vocabs = await listVocabularies({
    db: ctx.db,
    ownerId: ctx.dbEntities.user.user_id,
  });
  const currentId = ctx.dbEntities.user.current_vocab_id;
  const current = currentId
    ? vocabs.find((v) => v.id === currentId)
    : undefined;
  const currentLabel = current
    ? `${current.name} (${(current.native_code || current.native_language).toUpperCase()}→${(current.goal_code || current.goal_language).toUpperCase()})`
    : "none";
  await ctx.reply(
    `Vocabularies${vocabs.length ? `\nCurrent: ${currentLabel}` : ""}`,
    {
      reply_markup: kbVocabularies(vocabs),
    },
  );
}

async function showVocabulary(ctx: CustomContext, id: number) {
  const vocab = await getVocabulary({ db: ctx.db, vocabularyId: id });
  if (!vocab) return;

  const total = await countWordsInVocabulary({ db: ctx.db, vocabularyId: id });
  const stats = await listWordStatsForVocabulary({
    db: ctx.db,
    vocabularyId: id,
  });

  const top = [...stats]
    .sort((a, b) => b.score - a.score || a.front.localeCompare(b.front))
    .slice(0, 5);

  const bottom = [...stats]
    .sort((a, b) => a.score - b.score || a.front.localeCompare(b.front))
    .slice(0, 5);

  const fmt = (w: (typeof stats)[number], i: number) =>
    `${i}. ${w.front}/${w.back} - ${w.correct} correct, ${w.mistakes} mistakes`;

  const pair = `${vocab.native_language} → ${vocab.goal_language}`;
  const lines: string[] = [
    `Vocabulary ${vocab.name} (${pair})`,
    ``,
    `Total amount of words: ${total}`,
  ];

  lines.push(
    ``,
    `Best learned words:`,
    ...top.map((w, i) => fmt(w, i + 1)),
    ``,
    `Least learned words:`,
    ...bottom.map((w, i) => fmt(w, i + 1)),
  );

  await ctx.reply(lines.join("\n"), {
    reply_markup: kbVocabulary(id),
  });
}

async function showExercises(ctx: CustomContext) {
  const vocabs = await listVocabularies({
    db: ctx.db,
    ownerId: ctx.dbEntities.user.user_id,
  });
  if (vocabs.length === 0) {
    await ctx.reply(
      "You do not have any vocabularies yet. Create your first one:",
      {
        reply_markup: kbVocabularies([]),
      },
    );
    return;
  }
  let current = await loadCurrentVocab(ctx);
  if (!current) {
    const first = vocabs[0];
    await setCurrentVocabulary({
      db: ctx.db,
      userId: ctx.dbEntities.user.user_id,
      vocabularyId: first.id,
    });
    ctx.dbEntities.user.current_vocab_id = first.id;
    current = first;
  }
  await ctx.reply(
    `Your current selected vocabulary is “${current.name}” (${current.goal_language} words). Go to /vocabs to change it.\n\nChoose translation exercise to train.\n\n“Word” = translate one word directly. “Sentence” = translate the whole sentence.\n\nFor ${current.goal_language}→${current.native_language} translation, the prompt will include at least one word from your list.\nFor ${current.native_language}→${current.goal_language} translation, your answer must include at least one word from your list.`,
    { reply_markup: kbExercisesForVocab(current) },
  );
}

/** Always ACK callbacks first — this prevents flakiness in telegram-test-api. */
async function ack(ctx: CustomContext) {
  try {
    await ctx.answerCallbackQuery();
  } catch {
    // ignore (e.g., when already answered)
  }
}

menuController.command("menu", showMenu);
menuController.callbackQuery("menu", async (ctx) => {
  await ack(ctx);
  await showMenu(ctx);
});
menuController.callbackQuery("vocabularies", async (ctx) => {
  await ack(ctx);
  await showVocabularies(ctx);
});
menuController.callbackQuery("exercises", async (ctx) => {
  await ack(ctx);
  await showExercises(ctx);
});
menuController.callbackQuery("back_to_vocabularies", async (ctx) => {
  await ack(ctx);
  await showVocabularies(ctx);
});
menuController.callbackQuery(/open_vocab:(\d+)/, async (ctx) => {
  await ack(ctx);
  await showVocabulary(ctx, Number(ctx.match[1]));
});
menuController.callbackQuery("create_vocab", async (ctx) => {
  await ack(ctx);
  await ctx.conversation.enter(CONVERSATION_NAMES.createVocabulary);
});
menuController.callbackQuery(/add_word:(\d+)/, async (ctx) => {
  await ack(ctx);
  await ctx.conversation.enter(
    CONVERSATION_NAMES.addWord,
    Number(ctx.match[1]),
  );
});
menuController.callbackQuery(/rename_vocab:(\d+)/, async (ctx) => {
  await ack(ctx);
  await ctx.conversation.enter(
    CONVERSATION_NAMES.renameVocabulary,
    Number(ctx.match[1]),
  );
});

menuController.callbackQuery(/delete_words:(\d+)/, async (ctx) => {
  await ack(ctx);
  await ctx.conversation.enter(
    CONVERSATION_NAMES.deleteWords,
    Number(ctx.match[1]),
  );
});

menuController.callbackQuery(/delete_vocab_confirm:(\d+)/, async (ctx) => {
  await ack(ctx);
  const id = Number(ctx.match[1]);
  await ctx.reply(
    `Are you sure you want to delete this vocabulary? This cannot be undone.`,
    { reply_markup: kbConfirmDeleteVocabulary(id) },
  );
});

menuController.callbackQuery(/delete_vocab:(\d+)/, async (ctx) => {
  await ack(ctx);
  await deleteVocabulary({
    db: ctx.db,
    vocabularyId: Number(ctx.match[1]),
    ownerId: ctx.dbEntities.user.user_id,
  });
  await showVocabularies(ctx);
});

menuController.callbackQuery(/select_vocab:(\d+)/, async (ctx) => {
  await ack(ctx);
  await setCurrentVocabulary({
    db: ctx.db,
    userId: ctx.dbEntities.user.user_id,
    vocabularyId: Number(ctx.match[1]),
  });
  ctx.dbEntities.user.current_vocab_id = Number(ctx.match[1]);
  await ctx.answerCallbackQuery("Selected");
  await showVocabularies(ctx);
});
menuController.callbackQuery(
  /exercise:(word|sentence):(gn|ng)/,
  async (ctx) => {
    await ack(ctx);
    await ctx.conversation.enter(
      CONVERSATION_NAMES.exercise,
      ctx.match![1],
      ctx.match![2],
    );
  },
);

export async function createVocabularyConversation(
  conversation: Conversation<CustomContext, CustomContext>,
  ctx: CustomContext,
) {
  await ctx.reply(
    "Enter the name of the language you are learning \\(Goal language\\), for example `English`:",
    { parse_mode: "MarkdownV2" },
  );
  const goalLanguage = await waitText(conversation);
  await ctx.reply(
    "Enter the name of your language used for translations \\(Native language\\), for example `Russian`:",
    { parse_mode: "MarkdownV2" },
  );
  const nativeLanguage = await waitText(conversation);
  await ctx.reply(
    "Now enter a name for this vocabulary, for example `c1 preparation`:",
    { parse_mode: "MarkdownV2" },
  );
  const name = await waitText(conversation);

  const [goalCode, nativeCode] = await Promise.all([
    inferLanguageCode(goalLanguage),
    inferLanguageCode(nativeLanguage),
  ]);

  const vocab = await createVocabulary({
    db: ctx.db,
    ownerId: ctx.dbEntities.user.user_id,
    name,
    goalLanguage,
    nativeLanguage,
    goalCode,
    nativeCode,
  });

  if (!ctx.dbEntities.user.current_vocab_id) {
    await setCurrentVocabulary({
      db: ctx.db,
      userId: ctx.dbEntities.user.user_id,
      vocabularyId: vocab.id,
    });
    ctx.dbEntities.user.current_vocab_id = vocab.id;
  }

  await ctx.reply(
    `Created vocabulary “${vocab.name}” (${vocab.native_language} → ${vocab.goal_language}). It is now selected. Selected vocabulary is used for all exercises. Now you can add words to it.`,
  );
  await showVocabulary(ctx, vocab.id);
}

export async function renameVocabularyConversation(
  conversation: Conversation<CustomContext, CustomContext>,
  ctx: CustomContext,
  vocabularyId: number,
) {
  await ctx.reply("Send new vocabulary name");
  const name = await waitText(conversation);

  const vocab = await renameVocabulary({
    db: ctx.db,
    vocabularyId,
    ownerId: ctx.dbEntities.user.user_id,
    name,
  });
  await ctx.reply(`Renamed to ${vocab.name}`);
  await showVocabulary(ctx, vocabularyId);
}

export async function addWordConversation(
  conversation: Conversation<CustomContext, CustomContext>,
  ctx: CustomContext,
  vocabularyId: number,
) {
  const vocab = await getVocabulary({ db: ctx.db, vocabularyId });
  if (!vocab) {
    await ctx.reply("Vocabulary not found.");
    return;
  }
  const g = vocab.goal_language;
  const n = vocab.native_language;
  let lastWordId: number | null = null;

  while (true) {
    await ctx.reply(`Type next word in ${g}. Send /stop to finish.`);
    const front = await waitText(conversation);
    if (front === "/stop") break;

    await ctx.reply(
      `Type its translation in ${n}, or tap /auto to translate automatically.`,
    );
    let back = await waitText(conversation);

    if (back === "/auto") {
      const translated = await autoTranslate(front, g, n);
      if (translated) {
        const saved = await addWord({
          db: ctx.db,
          vocabularyId,
          front,
          back: translated,
        });
        lastWordId = saved.id;
        await ctx.reply(`Saved “${front}” → “${translated}”. Reply /fix to change the translation.

Now enter the next ${g} word, or /stop to finish.`);
        const maybeFix = await waitText(conversation);
        if (maybeFix === "/fix" && lastWordId) {
          await ctx.reply(`Enter the correct translation in ${n}:`);
          back = await waitText(conversation);
          if (back !== "/stop") {
            await ctx.db.query("UPDATE word SET back=$2 WHERE id=$1", [
              lastWordId,
              back,
            ]);
            await ctx.reply(`Updated: “${front}” → “${back}”.`);
          } else {
            break;
          }
        } else if (maybeFix === "/stop") {
          break;
        }
        continue;
      } else {
        await ctx.reply(
          "Auto-translation is not available. Please enter the translation manually.",
        );
        back = await waitText(conversation);
        if (back === "/stop") break;
      }
    } else if (back === "/stop") {
      break;
    }

    const saved = await addWord({ db: ctx.db, vocabularyId, front, back });
    lastWordId = saved.id;
    await ctx.reply(
      `Saved “${front}” → “${back}”. Enter next ${g} word, or /stop to finish.`,
    );
  }
  await showMenu(ctx);
}

export async function exerciseConversation(
  conversation: Conversation<CustomContext, CustomContext>,
  ctx: CustomContext,
  kind: "word" | "sentence",
  dir: "gn" | "ng",
) {
  const vocabId = ctx.dbEntities.user.current_vocab_id;
  if (!vocabId) {
    await ctx.reply("Select a vocabulary first");
    return;
  }
  const vocab = await getVocabulary({ db: ctx.db, vocabularyId: vocabId });
  if (!vocab) {
    await ctx.reply("Vocabulary not found");
    return;
  }
  const g = vocab.goal_language;
  const n = vocab.native_language;

  while (true) {
    const word = await getRandomWord({ db: ctx.db, vocabularyId: vocabId });
    if (!word) {
      await ctx.reply("This vocabulary has no words yet. Add some first.");
      break;
    }

    if (kind === "word") {
      if (dir === "gn") {
        await ctx.reply(
          `Translate this word from ${g} to ${n}:\n${word.front}`,
        );
        const answer = await waitText(conversation);
        if (answer === "/stop") {
          break;
        }
        const ok = checkTranslation(word.back, answer);
        await updateWordAnswerStats({
          db: ctx.db,
          wordId: word.id,
          correct: ok,
        });
        await ctx.reply(
          ok ? "Correct" : `Incorrect. Right answer: ${word.back}`,
        );
      } else {
        await ctx.reply(`Translate this word from ${n} to ${g}:\n${word.back}`);
        const answer = await waitText(conversation);
        if (answer === "/stop") {
          break;
        }
        const ok = checkTranslation(word.front, answer);
        await updateWordAnswerStats({
          db: ctx.db,
          wordId: word.id,
          correct: ok,
        });
        await ctx.reply(
          ok ? "Correct" : `Incorrect. Right answer: ${word.front}`,
        );
      }
    } else {
      if (dir === "gn") {
        const sentence = await generateSentenceWithTerm(g, word.front, "goal");
        await ctx.reply(
          `Translate this sentence from ${g} to ${n}:\n${sentence}`,
        );
        const answer = await waitText(conversation);
        if (answer === "/stop") {
          break;
        }
        const result = await judgeTranslation(sentence, answer, g, n);
        await updateWordAnswerStats({
          db: ctx.db,
          wordId: word.id,
          correct: result.ok,
        });
        await ctx.reply(
          result.ok
            ? `Correct. ${result.feedback}`
            : `Not quite. ${result.feedback}`,
        );
      } else {
        const sentence = await generateSentenceWithTerm(n, word.back, "native");
        await ctx.reply(
          `Translate this sentence from ${n} to ${g}:\n${sentence}\nRemember to include at least one word from your list.`,
        );
        const answer = await waitText(conversation);
        if (answer === "/stop") {
          break;
        }
        const result = await judgeTranslation(
          sentence,
          answer,
          n,
          g,
          word.front,
        );
        await updateWordAnswerStats({
          db: ctx.db,
          wordId: word.id,
          correct: result.ok,
        });
        await ctx.reply(
          result.ok
            ? `Correct. ${result.feedback}`
            : `Not quite. ${result.feedback}`,
        );
      }
    }
  }
  await showMenu(ctx);
}

export async function deleteWordsConversation(
  conversation: Conversation<CustomContext, CustomContext>,
  ctx: CustomContext,
  vocabularyId: number,
) {
  const words = await listWordsForVocabulary({ db: ctx.db, vocabularyId });
  if (words.length === 0) {
    await ctx.reply("This vocabulary has no words yet.");
    return;
  }

  const list = words.map((w) => `\`${w.front}\`/\`${w.back}\``).join("\n");
  await ctx.reply(
    [
      "Current words \\(tap to copy\\):",
      "",
      list,
      "",
      "Send the words to delete \\(by their original form or translation\\).",
      "Separate them by spaces or commas. Examples:",
      "`дом, кот,  apple`",
      "`дом кот apple`",
    ].join("\n"),
    { parse_mode: "MarkdownV2" },
  );

  const raw = await waitText(conversation);
  const tokens = raw
    .split(/[,\s]+/g)
    .map((s) => s.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    await ctx.reply("Nothing to delete.");
    await showVocabulary(ctx, vocabularyId);
    return;
  }

  const result = await deleteWordsByTexts({
    db: ctx.db,
    vocabularyId,
    tokens,
  });

  if (result.deleted.length === 0) {
    await ctx.reply("No matching words found.");
  } else {
    const deletedList = result.deleted
      .map((w) => `• ${w.front} / ${w.back}`)
      .join("\n");
    await ctx.reply(
      `Deleted ${result.deleted.length} word(s):\n${deletedList}`,
    );
  }
  await showVocabulary(ctx, vocabularyId);
}

export function setupMenu(bot: any) {
  bot.use(createConversation(createVocabularyConversation));
  bot.use(createConversation(renameVocabularyConversation));
  bot.use(createConversation(addWordConversation));
  bot.use(createConversation(exerciseConversation));
  bot.use(createConversation(deleteWordsConversation));
  bot.use(menuController);
}
