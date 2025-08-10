export const CONVERSATION_NAMES = {
  createVocabulary: "createVocabularyConversation",
  renameVocabulary: "renameVocabularyConversation",
  addWord: "addWordConversation",
  deleteWords: "deleteWordsConversation",
  exercise: "exerciseConversation",
} as const;

export type ConversationName = keyof typeof CONVERSATION_NAMES;

/**
 * Use only these constants when entering conversations.
 * Example:
 *   ctx.conversation.enter(CONVERSATION_NAMES.createVocabulary)
 */
export function getConversationName(
  name: ConversationName,
): (typeof CONVERSATION_NAMES)[ConversationName] {
  return CONVERSATION_NAMES[name];
}
