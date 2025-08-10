import { describe, it, expect, vi } from "vitest";
import { createReplyWithTextFunc } from "../../src/services/context.js";

describe("createReplyWithTextFunc", () => {
  it("sets HTML parse_mode, disables preview and passes extra", async () => {
    const t = vi.fn().mockImplementation((key: string) => `__${key}__`);
    const reply = vi.fn().mockResolvedValue({});
    const ctx: any = { i18n: { t }, reply };

    const text = createReplyWithTextFunc(ctx);
    await text("greeting", { name: "Ada" }, { reply_to_message_id: 42 });

    expect(t).toHaveBeenCalledWith("greeting", { name: "Ada" });
    expect(reply).toHaveBeenCalledTimes(1);
    const [sentText, extra] = reply.mock.calls[0];
    expect(sentText).toBe("__greeting__");
    expect(extra.parse_mode).toBe("HTML");
    expect(extra.link_preview_options).toEqual({ is_disabled: true });
    expect(extra.reply_to_message_id).toBe(42);
  });
});
