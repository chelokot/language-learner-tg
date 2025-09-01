# Deploying to Vercel

Follow these steps to run the bot on Vercel.

1. Push this repository to GitHub.
2. In the Vercel dashboard choose **New Project** and import the repo.
3. During setup add a Postgres database (Storage -> Add Database -> Postgres). Vercel
   will create the database and populate the `DATABASE_URL` environment variable.
4. Keep the default build command and output settings. The included `vercel.json`
   sets the output directory to the repository root so the compiled `api/` functions
   are deployed correctly and bundles the locale files from `src/locales`.
5. Add the environment variable `TOKEN` with the token provided by BotFather.
   The HTTP function defined in `api/bot.ts` will handle Telegram updates.
6. Deploy the project. The build step runs `npm run postdeploy` which applies pending migrations using Graphile Migrate and configures the Telegram webhook using `WEBHOOK_URL` or `VERCEL_URL`.
7. Start chatting with your bot.

## Ultra‑fast webhook on Edge (full Edge runtime)

This project provides a full Edge handler at `api/bot-edge.ts` that runs grammY directly on Edge:

- Uses `webhookCallback(bot, 'std/http')` for the Fetch API.
- DB access via Neon HTTP driver (`@neondatabase/serverless`).
- I18n repository is bundled in code (no filesystem access on Edge).

To enable and force Edge:

1. `vercel.json` already pins the function to Edge:
   `"functions": { "api/bot-edge.ts": { "runtime": "edge", "regions": ["fra1","arn1"], "maxDuration": 10 } }`.
2. Ensure `DATABASE_URL` is compatible with Neon HTTP (Vercel Postgres works, as it is Neon under the hood).
3. Set `TOKEN` in both Production and Preview. The deploy script auto‑registers the webhook to `https://${VERCEL_URL}/api/bot-edge`.

If you prefer to stay on Node functions, omit `WEBHOOK_PATH` or set it to `/api/bot`.
