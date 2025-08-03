import { fileURLToPath } from 'node:url';
import { registerWebhook, runMigrations } from './deploy.js';

async function main() {
  await runMigrations();
  const baseUrl = process.env.WEBHOOK_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  if (!process.env.TOKEN) {
    throw new Error('TOKEN is not set');
  }
  if (!baseUrl) {
    throw new Error('WEBHOOK_URL or VERCEL_URL must be set');
  }
  await registerWebhook(process.env.TOKEN, baseUrl);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
