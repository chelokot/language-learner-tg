import type { VercelPool } from '@vercel/postgres';

export interface User {
  user_id: number;
  name: string;
  current_vocab_id: number | null;
}

export interface Chat {
  chat_id: number;
  title: string;
}

export type Database = VercelPool;
