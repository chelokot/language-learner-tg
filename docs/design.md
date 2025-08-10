# State-Based Spaced Repetition Bot

This document describes the architecture of the **State-Based Spaced Repetition (SBSR)** Telegram bot. The bot is a purely functional data-flow running on Vercel serverless functions. All state lives in Postgres; the bot itself remains stateless between invocations. End users interact with the bot over Telegram and control the pace by pressing the **Next** button after each answer. No time-based scheduling is involved—only the numerical position counter stored in the database.

## Goals

* A Telegram bot that trains vocabulary via serverless functions on Vercel.
* Stateless execution: order of cards is stored in Postgres; clients request the next card by sending a command.
* Every user can maintain multiple vocabularies and exercises. Data is isolated per `telegram_id`.

## Tech stack

| Layer          | Choice                                                                              |
| -------------- | ----------------------------------------------------------------------------------- |
| Runtime        | Vercel Functions (Node 20)                                                          |
| Bot framework  | [ts-tg-bot template](https://github.com/ExposedCat/ts-tg-bot) with grammY           |
| Database       | Vercel Postgres via `@vercel/postgres`                                              |
| LLM            | OpenRouter API (for auto-translation, language code inference, sentence generation) |

All code is written in TypeScript with ES modules.

## Database schema

```sql
CREATE TABLE app_user (
  user_id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  current_vocab_id INTEGER REFERENCES vocabulary(id)
);

CREATE TABLE chat (
  chat_id BIGINT PRIMARY KEY,
  title TEXT NOT NULL
);

CREATE TABLE vocabulary (
  id SERIAL PRIMARY KEY,
  owner_id BIGINT REFERENCES app_user(user_id),
  name TEXT NOT NULL,
  goal_language TEXT NOT NULL,      -- e.g. "English"
  native_language TEXT NOT NULL,    -- e.g. "Ukrainian"
  goal_code TEXT,                   -- short code e.g. "EN"
  native_code TEXT                  -- short code e.g. "UK"
);

CREATE TABLE word (
  id SERIAL PRIMARY KEY,
  vocabulary_id INTEGER REFERENCES vocabulary(id),
  goal TEXT NOT NULL,               -- term in Goal language
  native TEXT NOT NULL              -- translation in Native language
);

CREATE TABLE exercise_state (
  id SERIAL PRIMARY KEY,
  vocabulary_id INTEGER REFERENCES vocabulary(id),
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

All UI copy should prefer the actual language names/codes (e.g. “English→Ukrainian”) over generic “Goal/Native”.

## SBSR algorithm

1. The client requests `/next`.
2. The server looks up a row in `score` where `next_slot` equals the user's `position`.
3. If such row exists, that word is returned. Otherwise a new word from the base is inserted into `score` with `score=1` and `next_slot=position`.
4. After an answer arrives, `score` is updated. `updateScore` multiplies or divides by `multiplier` (default 1.5) and clamps at 1.
5. `calcNextSlot` computes `floor(position + score)` and shifts upward until no collision.
6. The user's `position` field is increased by one regardless of correctness.

## LLM usage
* **Auto-translation** when a user taps `/auto`.
* **Language code inference** (short codes like EN/RU/UK) during vocabulary creation, with heuristics fallback if no API key is configured.
* **Sentence generation & judging** for sentence exercises. If the API key is missing, we fall back to deterministic templates and basic checks so tests remain reliable.

## Testing approach
* Unit tests with **Vitest** cover pure functions and helpers.
* Integration tests use **telegram-test-api**; the e2e script avoids reliance on external LLMs.
* Every feature starts with a failing test committed separately to demonstrate TDD.
* CI runs `npm test` on every push and pull request.

## Development process

1. Write a failing test that describes the desired behaviour. Commit it.
2. Implement the minimal code in a separate commit until the test turns green.
3. Prefer pure functions and immutable data. All state manipulations flow through the database.
4. Run `npm test` before every commit.

See [../AGENTS.md](../AGENTS.md) for contributor guidelines.
