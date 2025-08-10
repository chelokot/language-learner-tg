import { createConversation } from '@grammyjs/conversations';
import type { Conversation } from '@grammyjs/conversations';
import { Composer } from 'grammy';
import { waitText } from '../helpers/wait-text.js';
import { checkTranslation } from '../services/exercise.js';
import { setCurrentVocabulary } from '../services/user.js';
import {
  createVocabulary,
  deleteVocabulary,
  getVocabulary,
  listVocabularies,
  renameVocabulary,
} from '../services/vocabulary.js';
import { addWord, getRandomWord } from '../services/word.js';
import type { CustomContext } from '../types/context.js';
import { kbExercises, kbMenu, kbVocabularies, kbVocabulary } from '../ui/keyboards.js';
import { CONVERSATION_NAMES } from './CONVERSATION_NAMES.js';

export const menuController = new Composer<CustomContext>();

async function showMenu(ctx: CustomContext) {
  await ctx.reply('Menu', { reply_markup: kbMenu() });
}

async function showVocabularies(ctx: CustomContext) {
  const vocabs = await listVocabularies({ db: ctx.db, ownerId: ctx.dbEntities.user.user_id });
  const currentId = ctx.dbEntities.user.current_vocab_id;
  await ctx.reply(
    `Vocabularies${currentId ? `\nCurrent: ${vocabs.find(v => v.id === currentId)?.name ?? 'none'}` : ''}`,
    {
      reply_markup: kbVocabularies(vocabs),
    },
  );
}

async function showVocabulary(ctx: CustomContext, id: number) {
  const vocab = await getVocabulary({ db: ctx.db, vocabularyId: id });
  if (!vocab) return;
  await ctx.reply(`Vocabulary ${vocab.name}`, { reply_markup: kbVocabulary(id) });
}

async function showExercises(ctx: CustomContext) {
  await ctx.reply('Choose exercise', { reply_markup: kbExercises() });
}

menuController.command('menu', showMenu);
menuController.callbackQuery('menu', showMenu);
menuController.callbackQuery('vocabularies', showVocabularies);
menuController.callbackQuery('exercises', showExercises);
menuController.callbackQuery('back_to_vocabularies', showVocabularies);
menuController.callbackQuery(/open_vocab:(\d+)/, ctx => showVocabulary(ctx, Number(ctx.match[1])));
menuController.callbackQuery('create_vocab', ctx => ctx.conversation.enter(CONVERSATION_NAMES.createVocabulary));
menuController.callbackQuery(/add_word:(\d+)/, ctx =>
  ctx.conversation.enter(CONVERSATION_NAMES.addWord, Number(ctx.match[1])),
);
menuController.callbackQuery(/rename_vocab:(\d+)/, ctx =>
  ctx.conversation.enter(CONVERSATION_NAMES.renameVocabulary, Number(ctx.match[1])),
);
menuController.callbackQuery(/delete_vocab:(\d+)/, async ctx => {
  await deleteVocabulary({ db: ctx.db, vocabularyId: Number(ctx.match[1]), ownerId: ctx.dbEntities.user.user_id });
  await ctx.answerCallbackQuery();
  await showVocabularies(ctx);
});
menuController.callbackQuery(/select_vocab:(\d+)/, async ctx => {
  await setCurrentVocabulary({ db: ctx.db, userId: ctx.dbEntities.user.user_id, vocabularyId: Number(ctx.match[1]) });
  ctx.dbEntities.user.current_vocab_id = Number(ctx.match[1]);
  await ctx.answerCallbackQuery('Selected');
  await showVocabularies(ctx);
});
menuController.callbackQuery('exercise_word', ctx => ctx.conversation.enter(CONVERSATION_NAMES.exercise));

export async function createVocabularyConversation(
  conversation: Conversation<CustomContext, CustomContext>,
  ctx: CustomContext,
) {
  await ctx.reply('Send vocabulary name');
  const name = await waitText(conversation);

  const vocab = await createVocabulary({ db: ctx.db, ownerId: ctx.dbEntities.user.user_id, name });
  await ctx.reply(`Created vocabulary ${vocab.name}`);
  await showVocabularies(ctx);
}

export async function renameVocabularyConversation(
  conversation: Conversation<CustomContext, CustomContext>,
  ctx: CustomContext,
  vocabularyId: number,
) {
  await ctx.reply('Send new vocabulary name');
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
  while (true) {
    await ctx.reply('Enter the word you are learning');
    const front = await waitText(conversation);
    if (front === '/stop') break;
    await ctx.reply('Enter the translation in your native language');
    const back = await waitText(conversation);
    if (back === '/stop') break;
    await addWord({ db: ctx.db, vocabularyId, front, back });
    await ctx.reply(
      `Word ${front} with translation ${back} added. Enter next word you are learning. /stop to finish adding new words`,
    );
  }
  await showMenu(ctx);
}

export async function exerciseConversation(
  conversation: Conversation<CustomContext, CustomContext>,
  ctx: CustomContext,
) {
  const vocabId = ctx.dbEntities.user.current_vocab_id;
  if (!vocabId) {
    await ctx.reply('Select a vocabulary first');
    return;
  }

  while (true) {
    const word = await getRandomWord({ db: ctx.db, vocabularyId: vocabId });
    if (!word) {
      await ctx.reply('No words');
      break;
    }
    await ctx.reply(`Translate: ${word.front}`);
    const answer = await waitText(conversation);
    if (answer === '/stop') {
      await ctx.reply('Stopping exercise');
      break;
    }
    const ok = checkTranslation(word.back, answer);
    await ctx.reply(ok ? 'Correct' : `Incorrect. Right answer: ${word.back}`);
  }
  await showMenu(ctx);
}

export function setupMenu(bot: any) {
  bot.use(createConversation(createVocabularyConversation));
  bot.use(createConversation(renameVocabularyConversation));
  bot.use(createConversation(addWordConversation));
  bot.use(createConversation(exerciseConversation));
  bot.use(menuController);
}
