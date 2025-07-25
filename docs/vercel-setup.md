# Deploying to Vercel

Follow these steps to run the bot on Vercel.

1. Push this repository to GitHub.
2. In the Vercel dashboard choose **New Project** and import the repo.
3. During setup add a Postgres database (Storage -> Add Database -> Postgres). Vercel
   will create the database and populate the `POSTGRES_URL` environment variable.
4. Add the environment variable `TOKEN` with the token provided by BotFather.
5. Deploy the project. After the first deployment open the database console and
   execute the SQL schema from [docs/design.md](design.md).
6. Set the Telegram webhook to point at your deployment:
   `https://<project-name>.vercel.app/api/bot`.
   Example using `curl`:
   ```bash
   curl "https://api.telegram.org/bot<token>/setWebhook?url=https://<project>.vercel.app/api/bot"
   ```
7. Start chatting with your bot.
