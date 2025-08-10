import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/services/llm.js", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  const { LlmUnavailableError } = actual;
  return {
    LlmUnavailableError,
    chat: vi.fn().mockRejectedValue(new LlmUnavailableError("no llm")),
  };
});

import { inferLanguageCode } from "../../src/services/translate.js";

describe("inferLanguageCode (LLM unavailable -> fallback)", () => {
  beforeEach(() => {
    delete process.env.OPENROUTER_API_KEY;
  });

  it.each([
    ["french", "FR"],
    ["French", "FR"],
    ["italian", "IT"],
    ["polish", "PL"],
    ["portuguese", "PT"],
    ["dutch", "NL"],
    ["japanese", "JA"],
    ["chinese", "ZH"],
    ["korean", "KO"],
  ])('maps "%s" -> %s', async (name, expected) => {
    await expect(inferLanguageCode(name)).resolves.toBe(expected);
  });

  it("unknown language -> first 3 latin letters in upper (Elvish -> ELV)", async () => {
    await expect(inferLanguageCode("Elvish")).resolves.toBe("ELV");
  });

  it("string without latin letters -> XX", async () => {
    await expect(inferLanguageCode("中文")).resolves.toBe("XX");
  });

  it("complex case with hyphen -> PTB (pt-BR)", async () => {
    await expect(inferLanguageCode("pt-BR")).resolves.toBe("PTB");
  });
});
