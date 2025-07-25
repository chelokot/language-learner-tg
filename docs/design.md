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
| Database         | Vercel Postgres + Drizzle ORM            |
| Cache / Sessions | Vercel KV (Upstash Redis)                |
| File storage     | Vercel Blob for imports                  |

All code is written in TypeScript with ES modules.

## Database schema (Drizzle ORM)

```ts
pgTable('user', {
  id: serial('id').primaryKey(),
  tgId: bigint('telegram_id').unique().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

pgTable('word_base', {
  id: serial('id').primaryKey(),
  ownerId: integer('owner_id').references('user.id'), // creator of the base
  name: text('name').notNull(),
  public: boolean('public').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

pgTable('word', {
  id: serial('id').primaryKey(),
  baseId: integer('base_id').references('word_base.id'),
  front: text('front').notNull(),
  back: text('back').notNull(),
});

pgTable('exercise', {
  id: serial('id').primaryKey(),
  baseId: integer('base_id').references('word_base.id'),
  seed: uuid('seed').defaultRandom(),  // deterministic shuffle per base
  createdAt: timestamp('created_at').defaultNow(),
});

pgTable('exercise_state', {
  id: serial('id').primaryKey(),
  exerciseId: integer('exercise_id').references('exercise.id'),
  userId: integer('user_id').references('user.id'),
  position: integer('position').default(0),
  multiplier: real('multiplier').default(1.5),  // per-user tuning
  updatedAt: timestamp('updated_at').defaultNow(),
});

pgTable('score', {
  stateId: integer('state_id').references('exercise_state.id'),
  wordId: integer('word_id').references('word.id'),
  score: real('score').default(1),
  nextSlot: integer('next_slot').default(0),
  primaryKey: (stateId, wordId),
});
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
