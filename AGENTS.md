# Agent instructions

This repository hosts a Telegram bot for spaced repetition based on serverless TypeScript code.

## Workflow expectations

* **Functional style**: prefer stateless functions. Avoid classes and global state. Database is the single source of truth. Services should expose pure functions or simple factories.
* **TDD first**: every feature or bug fix starts with a failing test. Commit the test together with its implementation once it passes. Always run `npm test` before committing.
* **Test stack**: use **Vitest** for unit tests. For end‑to‑end flows use **telegram-test-api** inside docker-compose. All tests must be runnable via `npm test`.
* **CI**: GitHub workflow runs `npm ci` and `npm test`.
* **Code style**: formatted with Biome (`npm run format`). Keep the codebase in ES modules and TypeScript. Node 20 or later.
* **Docs**: maintain design documents in `docs/` describing architecture and database schema. Update README when public APIs or setup steps change.

These rules are mandatory for every change in this repository.
