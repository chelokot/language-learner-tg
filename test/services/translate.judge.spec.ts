import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/services/llm.js", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  const { LlmUnavailableError } = actual;
  return {
    LlmUnavailableError,
    chat: vi.fn().mockRejectedValue(new LlmUnavailableError("no llm")),
  };
});

import { judgeTranslation } from "../../src/services/translate.js";

describe("judgeTranslation (heuristic without LLM)", () => {
  it("fails if mustContain is required but missing in the answer", async () => {
    const res = await judgeTranslation(
      "source",
      "answer without term",
      "en",
      "ru",
      "hello",
    );
    expect(res.ok).toBe(false);
    expect(res.feedback).toMatch(/must include/i);
  });

  it("rejects an empty answer", async () => {
    const res = await judgeTranslation("Hello", "   ", "en", "ru");
    expect(res.ok).toBe(false);
  });

  it("rejects an answer that is identical to the source", async () => {
    const res = await judgeTranslation("Hello", "Hello", "en", "ru");
    expect(res.ok).toBe(false);
  });

  it("accepts a non-empty answer that is different from the source", async () => {
    const res = await judgeTranslation("Hello", "Привет", "en", "ru");
    expect(res.ok).toBe(true);
    expect(res.feedback).toBeTruthy();
  });
});
