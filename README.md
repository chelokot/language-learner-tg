# SBSR Telegram Bot

A spaced repetition Telegram bot built in TypeScript. The bot uses serverless functions on Vercel and stores all state in Postgres. The implementation follows a functional, test-driven workflow.

## Stack

* TypeScript
* grammY via [ts-tg-bot](https://github.com/ExposedCat/ts-tg-bot)
* Postgres (Vercel Postgres/Neon) via `@neondatabase/serverless` (Edge HTTP)
* Vitest for tests
* **OpenRouter** for auto-translation and sentence exercises

## Project structure

* `src/` – bot source code and services
* `api/` – Vercel serverless entrypoints
* `migrations/` – SQL migrations managed by Graphile Migrate
* `docs/` – design documents
* `test/` – unit and e2e tests
* `.github/workflows/` – CI configuration

## Scripts

* `npm run lint` – check formatting with Biome
* `npm run format` – format the code
* `npm test` – run unit and integration tests
* `npm run migrate` – apply pending database migrations
* `npm run test:migrations` – verify migrations run cleanly

The repository follows a strict **test-driven development** approach. Every new feature starts with a failing test which is then made to pass. See `docs/design.md` for the details of the SBSR algorithm and database structure.

## Development

1. Copy `.env.example` to `.env` and fill in the required variables.
2. `npm install`
3. `npm test`

Requirements: Node 20+, npm 10+. On Fedora: `sudo dnf install nodejs npm`.

### LLM features

If you want `/auto` translation, language code inference, and sentence exercises:

* Set `OPENROUTER_API_KEY` in `.env`.
* (Optional) set `OPENROUTER_BASE` (defaults to `https://openrouter.ai/api/v1`).

Without those variables the bot still works; it falls back to deterministic prompts and basic checks so tests remain stable.

## Deploying to Vercel

Detailed deployment instructions are available in
[docs/vercel-setup.md](docs/vercel-setup.md). The `vercel.json` file
sets the output directory to the repository root so Vercel deploys the
compiled API functions. The build process runs `npm run postdeploy`, applying pending migrations via Graphile Migrate and configuring the Telegram webhook automatically. Locale files in `src/locales` are bundled via
`vercel.json` so translations work in production.
