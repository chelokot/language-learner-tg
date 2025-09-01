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

## Optional: Ultra‑fast webhook via Edge

If you want the fastest possible webhook acknowledgment, you can enable the Edge forwarder:

- Route: `api/bot-edge.ts` (Edge Runtime) immediately ACKs the webhook and forwards the update to the Node handler at `/api/bot`.
- Set environment variable `WEBHOOK_PATH` to `/api/bot-edge` to register the Edge route as the webhook URL during deploy.
- Optionally, set `WEBHOOK_FORWARD_URL` (base) and `WEBHOOK_FORWARD_PATH` (path, default `/api/bot`) to control where the Edge route forwards updates.

Recommended setup:

- Production env vars:
  - `WEBHOOK_PATH=/api/bot-edge`
  - `TOKEN`, `DATABASE_URL`, `WEBHOOK_URL` as usual
- Preview env vars:
  - `WEBHOOK_PATH=/api/bot-edge`
  - `TOKEN` (staging), `DATABASE_URL` (staging)

This preserves DB work in Node (serverless) while minimizing webhook latency on Edge.
