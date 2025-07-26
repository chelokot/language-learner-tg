import { Composer, InlineKeyboard } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import { listWordBases, createWordBase, deleteWordBase, renameWordBase } from '../services/word-base.js';
import { addWord, getRandomWord } from '../services/word.js';
import { checkTranslation } from '../services/exercise.js';
import type { CustomContext } from '../types/context.js';

export const menuController = new Composer<CustomContext>();

async function showBases(ctx: CustomContext) {
  const bases = await listWordBases({ db: ctx.db, ownerId: ctx.dbEntities.user.user_id });
  const kb = new InlineKeyboard();
  for (const base of bases) {
    kb.text(base.name, `open_base:${base.id}`).row();
  }
  kb.text('Create base', 'create_base');
  await ctx.reply('Word bases:', { reply_markup: kb });
}

async function showBase(ctx: CustomContext, baseId: number) {
  const kb = new InlineKeyboard()
    .text('Add word', `add_word:${baseId}`)
    .row()
    .text('Rename base', `rename_base:${baseId}`)
    .row()
    .text('Delete base', `delete_base:${baseId}`)
    .row()
    .text('Exercise', `exercise:${baseId}`)
    .row()
    .text('Back', 'back_to_bases');
  await ctx.reply(`Base ${baseId}`, { reply_markup: kb });
}

menuController.command('menu', showBases);
menuController.callbackQuery('back_to_bases', showBases);
menuController.callbackQuery(/open_base:(\d+)/, ctx => showBase(ctx, Number(ctx.match[1])));
menuController.callbackQuery('create_base', ctx => ctx.conversation.enter('createBase'));
menuController.callbackQuery(/add_word:(\d+)/, ctx => ctx.conversation.enter('addWord', Number(ctx.match[1])));
menuController.callbackQuery(/rename_base:(\d+)/, ctx => ctx.conversation.enter('renameBase', Number(ctx.match[1])));
menuController.callbackQuery(/delete_base:(\d+)/, async ctx => {
  await deleteWordBase({ db: ctx.db, baseId: Number(ctx.match[1]), ownerId: ctx.dbEntities.user.user_id });
  await ctx.answerCallbackQuery();
  await showBases(ctx);
});
menuController.callbackQuery(/exercise:(\d+)/, ctx => ctx.conversation.enter('exercise', Number(ctx.match[1])));

export async function createBaseConversation(conversation: any, ctx: CustomContext) {
  await ctx.reply('Send base name');
  const { message } = await conversation.wait();
  const base = await createWordBase({ db: ctx.db, ownerId: ctx.dbEntities.user.user_id, name: message.text ?? '' });
  await ctx.reply(`Created base ${base.name}`);
  await showBases(ctx);
}

export async function renameBaseConversation(conversation: any, ctx: CustomContext, baseId: number) {
  await ctx.reply('Send new base name');
  const { message } = await conversation.wait();
  const base = await renameWordBase({
    db: ctx.db,
    baseId,
    ownerId: ctx.dbEntities.user.user_id,
    name: message.text ?? '',
  });
  await ctx.reply(`Renamed to ${base.name}`);
  await showBase(ctx, baseId);
}

export async function addWordConversation(conversation: any, ctx: CustomContext, baseId: number) {
  await ctx.reply('Front text');
  const front = (await conversation.wait()).message.text ?? '';
  await ctx.reply('Back text');
  const back = (await conversation.wait()).message.text ?? '';
  await addWord({ db: ctx.db, baseId, front, back });
  await ctx.reply('Word added');
  await showBase(ctx, baseId);
}

export async function exerciseConversation(conversation: any, ctx: CustomContext, baseId: number) {
  const word = await getRandomWord({ db: ctx.db, baseId });
  if (!word) {
    await ctx.reply('No words');
    return;
  }
  await ctx.reply(`Translate: ${word.front}`);
  const answer = (await conversation.wait()).message.text ?? '';
  const ok = checkTranslation(word.back, answer);
  await ctx.reply(ok ? 'Correct' : `Incorrect. Right answer: ${word.back}`);
}

export function setupMenu(bot: any) {
  bot.use(createConversation(createBaseConversation));
  bot.use(createConversation(renameBaseConversation));
  bot.use(createConversation(addWordConversation));
  bot.use(createConversation(exerciseConversation));
  bot.use(menuController);
}
