export const CONVERSATION_NAMES = {
  createBase: 'createBaseConversation',
  renameBase: 'renameBaseConversation',
  addWord: 'addWordConversation',
  exercise: 'exerciseConversation',
} as const;

export type ConversationName = keyof typeof CONVERSATION_NAMES;

/**
 * Получить зарегистрированное имя разговора по ключу.
 * Используйте только эти значения для ctx.conversation.enter!
 *
 * Пример:
 *   ctx.conversation.enter(CONVERSATION_NAMES.createBase)
 */
export function getConversationName(name: ConversationName): (typeof CONVERSATION_NAMES)[ConversationName] {
  return CONVERSATION_NAMES[name];
}
