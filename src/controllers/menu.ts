import { Composer, InlineKeyboard } from "grammy";
import { createConversation } from "@grammyjs/conversations";
import type { Conversation } from "@grammyjs/conversations";
import { CONVERSATION_NAMES } from "./CONVERSATION_NAMES.js";
import {
  listWordBases,
  createWordBase,
  deleteWordBase,
  renameWordBase,
} from "../services/word-base.js";
import { addWord, getRandomWord } from "../services/word.js";
import { checkTranslation } from "../services/exercise.js";
import type { CustomContext } from "../types/context.js";
import { waitText } from "../helpers/wait-text.js";
import { kbBase, kbBases } from "../ui/keyboards.js";

export const menuController = new Composer<CustomContext>();

async function showBases(ctx: CustomContext) {
  const bases = await listWordBases({
    db: ctx.db,
    ownerId: ctx.dbEntities.user.user_id,
  });
  await ctx.reply("Word bases:", { reply_markup: kbBases(bases) });
}

async function showBase(ctx: CustomContext, baseId: number) {
  await ctx.reply(`Base ${baseId}`, { reply_markup: kbBase(baseId) });
}

menuController.command("menu", showBases);
menuController.callbackQuery("back_to_bases", showBases);
menuController.callbackQuery(/open_base:(\d+)/, (ctx) =>
  showBase(ctx, Number(ctx.match[1])),
);
menuController.callbackQuery("create_base", (ctx) =>
  ctx.conversation.enter(CONVERSATION_NAMES.createBase),
);
menuController.callbackQuery(/add_word:(\d+)/, (ctx) =>
  ctx.conversation.enter(CONVERSATION_NAMES.addWord, Number(ctx.match[1])),
);
menuController.callbackQuery(/rename_base:(\d+)/, (ctx) =>
  ctx.conversation.enter(CONVERSATION_NAMES.renameBase, Number(ctx.match[1])),
);
menuController.callbackQuery(/delete_base:(\d+)/, async (ctx) => {
  await deleteWordBase({
    db: ctx.db,
    baseId: Number(ctx.match[1]),
    ownerId: ctx.dbEntities.user.user_id,
  });
  await ctx.answerCallbackQuery();
  await showBases(ctx);
});
menuController.callbackQuery(/exercise:(\d+)/, (ctx) =>
  ctx.conversation.enter(CONVERSATION_NAMES.exercise, Number(ctx.match[1])),
);

export async function createBaseConversation(
  conversation: Conversation<CustomContext, CustomContext>,
  ctx: CustomContext,
) {
  await ctx.reply("Send base name");
  const name = await waitText(conversation);

  const base = await createWordBase({
    db: ctx.db,
    ownerId: ctx.dbEntities.user.user_id,
    name,
  });
  await ctx.reply(`Created base ${base.name}`);
  await showBases(ctx);
}

export async function renameBaseConversation(
  conversation: Conversation<CustomContext, CustomContext>,
  ctx: CustomContext,
  baseId: number,
) {
  await ctx.reply("Send new base name");
  const name = await waitText(conversation);

  const base = await renameWordBase({
    db: ctx.db,
    baseId,
    ownerId: ctx.dbEntities.user.user_id,
    name,
  });
  await ctx.reply(`Renamed to ${base.name}`);
  await showBase(ctx, baseId);
}

export async function addWordConversation(
  conversation: Conversation<CustomContext, CustomContext>,
  ctx: CustomContext,
  baseId: number,
) {
  await ctx.reply("Front text");
  const front = await waitText(conversation);
  await ctx.reply("Back text");
  const back = await waitText(conversation);

  await addWord({ db: ctx.db, baseId, front, back });
  await ctx.reply("Word added");
  await showBase(ctx, baseId);
}

export async function exerciseConversation(
  conversation: Conversation<CustomContext, CustomContext>,
  ctx: CustomContext,
  baseId: number,
) {
  const word = await getRandomWord({ db: ctx.db, baseId });
  if (!word) {
    await ctx.reply("No words");
    return;
  }
  await ctx.reply(`Translate: ${word.front}`);
  const answer = await waitText(conversation);
  const ok = checkTranslation(word.back, answer);
  await ctx.reply(ok ? "Correct" : `Incorrect. Right answer: ${word.back}`);
}

export function setupMenu(bot: any) {
  bot.use(createConversation(createBaseConversation));
  bot.use(createConversation(renameBaseConversation));
  bot.use(createConversation(addWordConversation));
  bot.use(createConversation(exerciseConversation));
  bot.use(menuController);
}
