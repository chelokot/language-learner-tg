import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { registerWebhook } from "../../src/scripts/deploy.js";

describe("registerWebhook — HTTP status not ok", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue("boom"),
    } as any);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("throws an error with status code", async () => {
    await expect(
      registerWebhook("TOKEN", "https://example.com"),
    ).rejects.toThrow(/500|boom/);
  });
});
