# Deploying to Vercel

Follow these steps to run the bot on Vercel.

1. Push this repository to GitHub.
2. In the Vercel dashboard choose **New Project** and import the repo.
3. During setup add a Postgres database (Storage -> Add Database -> Postgres). Vercel
   will create the database and populate the `DATABASE_URL` environment variable.
4. Keep the default build command and output settings. The included `vercel.json`
   sets the output directory to the repository root so the compiled `api/` functions
   are deployed correctly.
5. Add the environment variable `TOKEN` with the token provided by BotFather.
   The HTTP function defined in `api/bot.ts` will handle Telegram updates.
6. Deploy the project. The build step runs `npm run postdeploy` which
   automatically creates the database schema from `sql/schema.sql` and
   configures the Telegram webhook using `WEBHOOK_URL` or `VERCEL_URL`.
7. Start chatting with your bot.
