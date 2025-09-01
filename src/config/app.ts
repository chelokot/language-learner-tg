import { loadEnv } from '../helpers/load-env.js';
import { validateEnv } from '../helpers/validate-env.js';
import { startBot } from './bot.edge.js';
import { connectToDbEdge as connectToDb } from './database-edge.js';

export async function startApp() {
  try {
    loadEnv('../../.env');
    validateEnv(['TOKEN', 'DATABASE_URL']);
  } catch (error) {
    console.error('Error occurred while loading environment:', error);
    process.exit(1);
  }

  let database;
  try {
    database = await connectToDb();
  } catch (error) {
    console.error('Error occurred while connecting to the database:', error);
    process.exit(2);
  }

  try {
    await startBot(database);
  } catch (error) {
    console.error('Error occurred while starting the bot:', error);
    process.exit(3);
  }
}
