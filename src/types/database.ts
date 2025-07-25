import type { VercelPool } from '@vercel/postgres';

export interface User {
  user_id: number;
  name: string;
}

export interface Chat {
  chat_id: number;
  title: string;
}

export type Database = VercelPool;
