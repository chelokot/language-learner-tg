import type { Chat, Database } from '../types/database.js';

export async function getOrCreateChat(args: { db: Database; chatId: number; title: string }): Promise<Chat> {
  const result = await args.db.query<Chat>(
    'INSERT INTO chat (chat_id, title) VALUES ($1, $2) ON CONFLICT (chat_id) DO UPDATE SET title = EXCLUDED.title RETURNING chat_id, title',
    [args.chatId, args.title],
  );
  return result.rows[0];
}
