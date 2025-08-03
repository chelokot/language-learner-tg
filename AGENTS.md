# Agent instructions

This repository hosts a Telegram bot for spaced repetition based on serverless TypeScript code.

## Workflow expectations

* **Functional style**: prefer stateless functions. Avoid classes and global state. Database is the single source of truth. Services should expose pure functions or simple factories.
* **TDD first**: adding every feature or bug fix MUST start with a creation of new (initially failing) test. Commit the test together with its implementation once it passes. Always run `npm test` before committing.
* **Test stack**: use **Vitest** for unit tests. For end‑to‑end flows use **telegram-test-api** inside docker-compose. All tests must be runnable via `npm test`.
* **Ensuring tests**: before finishing your results, doing commit or in other way presenting changes to user you MUST execute ALL types of tests: `npm run test:e2e`, `npm test`, `npm run mutation`, `npm run lint`, `npm run test:unit`. If any of them fails - fix your changes until all of them pass.
* **CI**: GitHub workflow runs `npm ci` and `npm test`.
* **Code style**: formatted with Biome (`npm run format`). Keep the codebase in ES modules and TypeScript. Node 20 or later.
* **Docs**: maintain design documents in `docs/` describing architecture and database schema. Update README when public APIs or setup steps change.
* **Migrations**: database schema changes MUST use Graphile Migrate. Never edit files in `migrations/committed`; create a new migration via `migrations/current.sql`, run `npm run migration:commit`, and validate with `npm run test:migrations` before committing.
* **Conversation names**: You MUST use type-safe constants from `CONVERSATION_NAMES` for all conversation names (e.g. `ctx.conversation.enter(CONVERSATION_NAMES.createBase)`).  
  Never use string literals for conversation names. Similar goes to any type-unsafe strings.
  If you see any string literal used, you MUST immediately refactor it to use the constant.  
  This rule is mandatory for all code in this repository.

These rules are mandatory for every change in this repository.
