import { createConversation } from '@grammyjs/conversations';
import type { Conversation } from '@grammyjs/conversations';
import { Composer } from 'grammy';
import { waitText } from '../helpers/wait-text.js';
import { checkTranslation } from '../services/exercise.js';
import { getRecentSentenceExamples, saveSentenceExample } from '../services/sentence-log.js';
import { autoTranslate, generateSentenceWithTerm, inferLanguageCode, judgeTranslation } from '../services/translate.js';
import { getCurrentVocabularyId, setCurrentVocabulary } from '../services/user.js';
import {
  type Vocabulary,
  createVocabulary,
  deleteVocabulary,
  getVocabulary,
  listVocabularies,
  renameVocabulary,
} from '../services/vocabulary.js';
import {
  addWord,
  countWordsInVocabulary,
  deleteWordsByTexts,
  getRandomWord,
  listWordStatsForVocabulary,
  listWordsForVocabulary,
  updateWordAnswerStats,
} from '../services/word.js';
import type { CustomContext } from '../types/context.js';
import {
  kbConfirmDeleteVocabulary,
  kbExercisesForVocab,
  kbMenu,
  kbVocabularies,
  kbVocabulary,
} from '../ui/keyboards.js';
import { CONVERSATION_NAMES } from './CONVERSATION_NAMES.js';

export const menuController = new Composer<CustomContext>();

async function showMenu(ctx: CustomContext) {
  await ctx.reply(
    'Menu\n\nYou can create or select **vocabulary** — list of words to learn\\.\n\nYou can then choose **exercise** to train them',
    { reply_markup: kbMenu(), parse_mode: 'MarkdownV2' },
  );
}

async function loadCurrentVocab(ctx: CustomContext): Promise<Vocabulary | null> {
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
  const current = currentId ? vocabs.find(v => v.id === currentId) : undefined;
  const currentLabel = current
    ? `${current.name} (${(current.native_code || current.native_language).toUpperCase()}→${(current.goal_code || current.goal_language).toUpperCase()})`
    : 'none';
  await ctx.reply(`Vocabularies${vocabs.length ? `\nCurrent: ${currentLabel}` : ''}`, {
    reply_markup: kbVocabularies(vocabs),
  });
}

async function showVocabulary(ctx: CustomContext, id: number) {
  const vocab = await getVocabulary({ db: ctx.db, vocabularyId: id });
  if (!vocab) return;

  const total = await countWordsInVocabulary({ db: ctx.db, vocabularyId: id });
  const stats = await listWordStatsForVocabulary({
    db: ctx.db,
    vocabularyId: id,
  });

  const top = [...stats].sort((a, b) => b.score - a.score || a.goal.localeCompare(b.goal)).slice(0, 5);

  const bottom = [...stats].sort((a, b) => a.score - b.score || a.goal.localeCompare(b.goal)).slice(0, 5);

  const fmt = (w: (typeof stats)[number], i: number) =>
    `${i}. ${w.goal}/${w.native} - ${w.correct} correct, ${w.mistakes} mistakes`;

  const pair = `${vocab.native_language} → ${vocab.goal_language}`;
  const lines: string[] = [
    `Vocabulary ${vocab.name} (${pair})`,
    ``,
    `Level: ${vocab.level}`, // <-- NEW
    `Total amount of words: ${total}`,
    ``,
    `Best learned words:`,
    ...top.map((w, i) => fmt(w, i + 1)),
    ``,
    `Least learned words:`,
    ...bottom.map((w, i) => fmt(w, i + 1)),
  ];

  await ctx.reply(lines.join('\n'), {
    reply_markup: kbVocabulary(id),
  });
}

async function showExercises(ctx: CustomContext) {
  const vocabs = await listVocabularies({
    db: ctx.db,
    ownerId: ctx.dbEntities.user.user_id,
  });
  if (vocabs.length === 0) {
    await ctx.reply('You do not have any vocabularies yet. Create your first one:', {
      reply_markup: kbVocabularies([]),
    });
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
    `Your current selected vocabulary is “${current.name}” (${current.goal_language} words). Go to /vocabs to change it.\n\nChoose translation exercise to train.\n\n**“Word”** = translate one word directly.\n**“Sentence”** = translate the whole sentence.\n\n**${current.goal_language}→${current.native_language}** task includes at least one word from your list.\n**${current.native_language}→${current.goal_language}** task requires your answer to include at least one word from your list.`,
    { reply_markup: kbExercisesForVocab(current), parse_mode: 'MarkdownV2' },
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

menuController.command('menu', showMenu);
menuController.callbackQuery('menu', async ctx => {
  await ack(ctx);
  await showMenu(ctx);
});
menuController.callbackQuery('vocabularies', async ctx => {
  await ack(ctx);
  await showVocabularies(ctx);
});
menuController.callbackQuery('exercises', async ctx => {
  await ack(ctx);
  await showExercises(ctx);
});
menuController.callbackQuery('back_to_vocabularies', async ctx => {
  await ack(ctx);
  await showVocabularies(ctx);
});
menuController.callbackQuery(/open_vocab:(\d+)/, async ctx => {
  await ack(ctx);
  await showVocabulary(ctx, Number(ctx.match[1]));
});
menuController.callbackQuery('create_vocab', async ctx => {
  await ack(ctx);
  await ctx.conversation.enter(CONVERSATION_NAMES.createVocabulary);
});
menuController.callbackQuery(/add_word:(\d+)/, async ctx => {
  await ack(ctx);
  console.log('enter conversation...');
  await ctx.conversation.enter(CONVERSATION_NAMES.addWord, Number(ctx.match[1]));
});
menuController.callbackQuery(/rename_vocab:(\d+)/, async ctx => {
  await ack(ctx);
  await ctx.conversation.enter(CONVERSATION_NAMES.renameVocabulary, Number(ctx.match[1]));
});

menuController.callbackQuery(/delete_words:(\d+)/, async ctx => {
  await ack(ctx);
  await ctx.conversation.enter(CONVERSATION_NAMES.deleteWords, Number(ctx.match[1]));
});

menuController.callbackQuery(/delete_vocab_confirm:(\d+)/, async ctx => {
  await ack(ctx);
  const id = Number(ctx.match[1]);
  await ctx.reply(`Are you sure you want to delete this vocabulary? This cannot be undone.`, {
    reply_markup: kbConfirmDeleteVocabulary(id),
  });
});

menuController.callbackQuery(/delete_vocab:(\d+)/, async ctx => {
  await ack(ctx);
  await deleteVocabulary({
    db: ctx.db,
    vocabularyId: Number(ctx.match[1]),
    ownerId: ctx.dbEntities.user.user_id,
  });
  await showVocabularies(ctx);
});

menuController.callbackQuery(/select_vocab:(\d+)/, async ctx => {
  await ack(ctx);
  await setCurrentVocabulary({
    db: ctx.db,
    userId: ctx.dbEntities.user.user_id,
    vocabularyId: Number(ctx.match[1]),
  });
  ctx.dbEntities.user.current_vocab_id = Number(ctx.match[1]);
  await ctx.answerCallbackQuery('Selected');
  await showVocabularies(ctx);
});
menuController.callbackQuery(/exercise:(word|sentence):(gn|ng)/, async ctx => {
  await ack(ctx);
  await ctx.conversation.enter(CONVERSATION_NAMES.exercise, ctx.match![1], ctx.match![2]);
});

export async function createVocabularyConversation(
  conv: Conversation<CustomContext, CustomContext>,
  ctx: CustomContext,
) {
  await ctx.reply('Enter the name of the language you are learning \\(Goal language\\), for example `English`:', {
    parse_mode: 'MarkdownV2',
  });
  const goalLanguage = await waitText(conv);

  await ctx.reply(
    'Enter the name of your language used for translations \\(Native language\\), for example `Russian`:',
    { parse_mode: 'MarkdownV2' },
  );
  const nativeLanguage = await waitText(conv);

  await ctx.reply('Now enter a name for this vocabulary, for example `c1 preparation`:', { parse_mode: 'MarkdownV2' });
  const name = await waitText(conv);

  await ctx.reply(
    'What target level is this vocabulary for? Answer in any format, for example: `c1`, `intermediate`, or `I am total beginner`:',
    { parse_mode: 'MarkdownV2' },
  );
  const level = (await waitText(conv)).trim();

  const [goalCode, nativeCode] = await Promise.all([
    inferLanguageCode(goalLanguage),
    inferLanguageCode(nativeLanguage),
  ]);

  const vocab = await conv.external(() =>
    createVocabulary({
      db: ctx.db,
      ownerId: ctx.dbEntities.user.user_id,
      name,
      goalLanguage,
      nativeLanguage,
      goalCode,
      nativeCode,
      level,
    }),
  );

  if (!ctx.dbEntities.user.current_vocab_id) {
    await conv.external(() =>
      setCurrentVocabulary({
        db: ctx.db,
        userId: ctx.dbEntities.user.user_id,
        vocabularyId: vocab.id,
      }),
    );
    ctx.dbEntities.user.current_vocab_id = vocab.id;
  }

  await ctx.reply(
    `Created vocabulary “${vocab.name}” (${vocab.native_language} → ${vocab.goal_language}). It is now selected. Selected vocabulary is used for all exercises. Now you can add words to it.`,
  );
  await showVocabulary(ctx, vocab.id);
}

export async function renameVocabularyConversation(
  conv: Conversation<CustomContext, CustomContext>,
  ctx: CustomContext,
  vocabularyId: number,
) {
  await ctx.reply('Send new vocabulary name');
  const name = await waitText(conv);

  const vocab = await conv.external(() =>
    renameVocabulary({
      db: ctx.db,
      vocabularyId,
      ownerId: ctx.dbEntities.user.user_id,
      name,
    }),
  );

  await ctx.reply(`Renamed to ${vocab.name}`);
  await showVocabulary(ctx, vocabularyId);
}

export async function addWordConversation(
  conv: Conversation<CustomContext, CustomContext>,
  ctx: CustomContext,
  vocabularyId: number,
) {
  const vocab = await conv.external(() => getVocabulary({ db: ctx.db, vocabularyId }));
  if (!vocab) {
    await ctx.reply('Vocabulary not found.');
    return;
  }
  const { goal_language: goalLanguage, native_language: nativeLanguage, level } = vocab;

  await ctx.reply(`Type new word in ${goalLanguage}. Send /stop to finish.`);
  let goal = await waitText(conv);
  while (true) {
    if (goal === '/stop') break;

    await ctx.reply(`Type its translation in ${nativeLanguage}, or tap /auto to translate automatically.`);
    let native = await waitText(conv);

    if (native === '/auto') {
      const translated = await conv.external(() => autoTranslate(goal, goalLanguage, nativeLanguage, level));
      if (translated) {
        const saved = await conv.external(() => addWord({ db: ctx.db, vocabularyId, goal, native: translated }));
        await ctx.reply(
          `Saved “${goal}” → “${translated}”. Reply /fix to change the translation.\n\nNow enter the next ${goalLanguage} word, or /stop to finish.`,
        );
        goal = await waitText(conv);
        if (goal === '/fix') {
          await ctx.reply(`Enter the correct translation in ${nativeLanguage}:`);
          native = await waitText(conv);
          await conv.external(() => ctx.db.query('UPDATE word SET native=$2 WHERE id=$1', [saved.id, native]));
          await ctx.reply(`Updated: “${goal}” → “${native}”.`);
        } else if (goal === '/stop') break;
        continue;
      } else {
        await ctx.reply('Auto-translation is not available. Please enter the translation manually.');
        native = await waitText(conv);
      }
    }

    if (native === '/stop') break;

    await conv.external(() => addWord({ db: ctx.db, vocabularyId, goal, native }));
    await ctx.reply(`Saved “${goal}” → “${native}”. Enter next ${goalLanguage} word, or /stop to finish.`);
    goal = await waitText(conv);
  }

  await conv.external(() => showMenu(ctx));
}

export async function exerciseConversation(
  conv: Conversation<CustomContext, CustomContext>,
  ctx: CustomContext,
  kind: 'word' | 'sentence',
  dir: 'gn' | 'ng',
) {
  const vocabId = ctx.dbEntities.user.current_vocab_id;
  if (!vocabId) {
    await ctx.reply('Select a vocabulary first');
    return;
  }

  const vocab = await conv.external(() => getVocabulary({ db: ctx.db, vocabularyId: vocabId }));
  if (!vocab) {
    await ctx.reply('Vocabulary not found');
    return;
  }
  const { goal_language: goalLanguage, native_language: nativeLanguage, level } = vocab;

  while (true) {
    const word = await conv.external(() => getRandomWord({ db: ctx.db, vocabularyId: vocabId }));
    if (!word) {
      await ctx.reply('This vocabulary has no words yet. Add some first.');
      break;
    }

    if (kind === 'word') {
      if (dir === 'gn') {
        await ctx.reply(`Translate this word from ${goalLanguage} to ${nativeLanguage}:\n${word.goal}`);
        const answer = await waitText(conv);
        if (answer === '/stop') break;

        const ok = checkTranslation(word.native, answer);
        await conv.external(() => updateWordAnswerStats({ db: ctx.db, wordId: word.id, correct: ok }));
        await ctx.reply(ok ? 'Correct' : `Incorrect. Right answer: ${word.native}`);
      } else {
        await ctx.reply(`Translate this word from ${nativeLanguage} to ${goalLanguage}:\n${word.native}`);
        const answer = await waitText(conv);
        if (answer === '/stop') break;

        const ok = checkTranslation(word.goal, answer);
        await conv.external(() => updateWordAnswerStats({ db: ctx.db, wordId: word.id, correct: ok }));
        await ctx.reply(ok ? 'Correct' : `Incorrect. Right answer: ${word.goal}`);
      }
    } else {
      const examples = await getRecentSentenceExamples({
        db: ctx.db,
        userId: ctx.dbEntities.user.user_id,
        vocabularyId: vocabId,
        exerciseKind: 'sentence',
        direction: dir,
        goalWord: word.goal,
        nativeWord: word.native,
      });
      let sentence = '';
      if (dir === 'gn') {
        sentence = await conv.external(() =>
          generateSentenceWithTerm(goalLanguage, word.goal, 'goal', level, examples),
        );
        await ctx.reply(`Translate this sentence from ${goalLanguage} to ${nativeLanguage}:\n${sentence}`);
        const answer = await waitText(conv);
        if (answer === '/stop') break;

        const result = await conv.external(() =>
          judgeTranslation(sentence, answer, goalLanguage, nativeLanguage, word.goal, word.native, level),
        );
        await conv.external(() =>
          updateWordAnswerStats({
            db: ctx.db,
            wordId: word.id,
            correct: result.ok,
          }),
        );
        await ctx.reply(result.ok ? `Correct. ${result.feedback}` : `Not quite. ${result.feedback}`);
      } else {
        sentence = await conv.external(() =>
          generateSentenceWithTerm(nativeLanguage, word.native, 'native', level, examples),
        );
        await ctx.reply(
          `Translate this sentence from ${nativeLanguage} to ${goalLanguage}:\n${sentence}\nRemember to include at least one word from your list.`,
        );
        const answer = await waitText(conv);
        if (answer === '/stop') break;

        const result = await conv.external(() =>
          judgeTranslation(sentence, answer, nativeLanguage, goalLanguage, word.goal, word.native, level),
        );
        await conv.external(() =>
          updateWordAnswerStats({
            db: ctx.db,
            wordId: word.id,
            correct: result.ok,
          }),
        );
        await ctx.reply(result.ok ? `Correct. ${result.feedback}` : `Not quite. ${result.feedback}`);
      }
      await saveSentenceExample({
        db: ctx.db,
        userId: ctx.dbEntities.user.user_id,
        vocabularyId: vocabId,
        exerciseKind: 'sentence',
        direction: dir,
        goalWord: word.goal,
        nativeWord: word.native,
        sentence,
      });
    }
  }

  await conv.external(() => showMenu(ctx));
}

export async function deleteWordsConversation(
  conv: Conversation<CustomContext, CustomContext>,
  ctx: CustomContext,
  vocabularyId: number,
) {
  const words = await listWordsForVocabulary({ db: ctx.db, vocabularyId });
  if (words.length === 0) {
    await ctx.reply('This vocabulary has no words yet.');
    return;
  }

  const list = words.map(w => `\`${w.goal}\`/\`${w.native}\``).join('\n');
  await ctx.reply(
    [
      'Current words \\(tap to copy\\):',
      '',
      list,
      '',
      'Send the words to delete \\(by their original form or translation\\).',
      'Separate them by spaces or commas. Examples:',
      '`дом, кот,  apple`',
      '`дом кот apple`',
    ].join('\n'),
    { parse_mode: 'MarkdownV2' },
  );

  const raw = await waitText(conv);
  const tokens = raw
    .split(/[,\s]+/g)
    .map(s => s.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    await ctx.reply('Nothing to delete.');
    await showVocabulary(ctx, vocabularyId);
    return;
  }

  const result = await conv.external(() => deleteWordsByTexts({ db: ctx.db, vocabularyId, tokens }));

  if (result.deleted.length === 0) {
    await ctx.reply('No matching words found.');
  } else {
    const deletedList = result.deleted.map(w => `• ${w.goal} / ${w.native}`).join('\n');
    await ctx.reply(`Deleted ${result.deleted.length} word(s):\n${deletedList}`);
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
