# State-Based Spaced Repetition Bot

This document describes the architecture of the **State‑Based Spaced Repetition (SBSR)** Telegram bot.  The bot is a purely functional data‑flow running on Vercel serverless functions.  All state lives in Postgres; the bot itself remains stateless between invocations.  End users interact with the bot over Telegram and control the pace by pressing the **Next** button after each answer.  No time‑based scheduling is involved—only the numerical position counter stored in the database.

## Goals

* A Telegram bot that trains vocabulary via serverless functions on Vercel.
* Stateless execution: order of cards is stored in Postgres; clients request the next card by sending a command.
* Every user can maintain multiple word bases and exercises. Data is isolated per `telegram_id`.

## Tech stack

| Layer            | Choice                                   |
|------------------|-------------------------------------------|
| Runtime          | Vercel Functions (Node 20)               |
| Bot framework    | [ts-tg-bot template](https://github.com/ExposedCat/ts-tg-bot) with grammY |
| Database         | Vercel Postgres via `@vercel/postgres`   |

All code is written in TypeScript with ES modules.

## Database schema

```sql
CREATE TABLE app_user (
  user_id BIGINT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE chat (
  chat_id BIGINT PRIMARY KEY,
  title TEXT NOT NULL
);

CREATE TABLE word_base (
  id SERIAL PRIMARY KEY,
  owner_id BIGINT REFERENCES app_user(user_id),
  name TEXT NOT NULL
);

CREATE TABLE word (
  id SERIAL PRIMARY KEY,
  base_id INTEGER REFERENCES word_base(id),
  front TEXT NOT NULL,
  back TEXT NOT NULL
);

CREATE TABLE exercise_state (
  id SERIAL PRIMARY KEY,
  base_id INTEGER REFERENCES word_base(id),
  user_id BIGINT REFERENCES app_user(user_id),
  position INTEGER DEFAULT 0,
  multiplier REAL DEFAULT 1.5
);

CREATE TABLE score (
  state_id INTEGER REFERENCES exercise_state(id),
  word_id INTEGER REFERENCES word(id),
  score REAL DEFAULT 1,
  next_slot INTEGER DEFAULT 0,
  PRIMARY KEY(state_id, word_id)
);
```

## SBSR algorithm

1. The client requests `/next`.
2. The server looks up a row in `score` where `next_slot` equals the user's `position`.
3. If such row exists, that word is returned. Otherwise a new word from the base is inserted into `score` with `score=1` and `next_slot=position`.
4. After an answer arrives, `score` is updated. `updateScore` multiplies or divides by `multiplier` (default 1.5) and clamps at 1.
5. `calcNextSlot` computes `floor(position + score)` and shifts upward until no collision.
6. The user's `position` field is increased by one regardless of correctness.

No time-based scheduling is used: `position` is the only counter.  The helper functions `updateScore` and `calcNextSlot` are implemented in `src/services/sbsr.ts` and covered by unit tests.

## Testing approach

* Unit tests with **Vitest** cover pure functions and helpers.
* Integration tests use **telegram-test-api** with Postgres and Redis containers.
* Every feature starts with a failing test committed separately to demonstrate TDD.
* CI runs `npm test` on every push and pull request.

## Development process

1. Write a failing test that describes the desired behaviour. Commit it.
2. Implement the minimal code in a separate commit until the test turns green.
3. Prefer pure functions and immutable data. All state manipulations flow through the database.
4. Run `npm test` before every commit.

See [../AGENTS.md](../AGENTS.md) for contributor guidelines.
