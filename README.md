# SBSR Telegram Bot

A spaced repetition Telegram bot built in TypeScript. The bot uses serverless functions on Vercel and stores all state in Postgres.  The implementation follows a functional, test‑driven workflow.

## Stack

- TypeScript
- grammY via [ts-tg-bot](https://github.com/ExposedCat/ts-tg-bot)
- Vercel Postgres via `@vercel/postgres`
- Vitest for tests

## Project structure

- `src/` – bot source code and services
- `docs/` – design documents
- `test/` – unit tests
- `.github/workflows/` – CI configuration

## Scripts

- `npm run lint` – check formatting with Biome
- `npm run format` – format the code
- `npm test` – run unit tests

The repository follows a strict **test‑driven development** approach.  Every new feature starts with a failing test which is then made to pass.  See `docs/design.md` for the details of the SBSR algorithm and database structure.

## Development

1. Copy `.env.example` to `.env` and fill in the required variables.
2. `npm install`
3. `npm test`

The optional `WEBHOOK_URL` environment variable can override `VERCEL_URL` when
setting up the Telegram webhook.

See [docs/design.md](docs/design.md) for architectural details.

## Deploying to Vercel

Detailed deployment instructions are available in
[docs/vercel-setup.md](docs/vercel-setup.md). The `vercel.json` file
sets the output directory to the repository root so Vercel deploys the
compiled API functions. The build process runs `npm run postdeploy`
which prepares the database schema and configures the Telegram webhook
automatically. Locale files in `src/locales` are bundled via
`vercel.json` so translations work in production.
