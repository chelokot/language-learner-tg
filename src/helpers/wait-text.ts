import type { Conversation } from '@grammyjs/conversations';
import type { CustomContext } from '../types/context.js';

/**
 * Helper function to wait for text input in conversations
 * Returns trimmed message text or empty string if message/text is undefined
 */
export async function waitText(conv: Conversation<CustomContext, CustomContext>): Promise<string> {
  const { msg } = await conv.waitFor('message:text');
  return msg.text!.trim();
}
