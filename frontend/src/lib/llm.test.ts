import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callLLM, LlmError } from "./llm";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  process.env.LLM_API_KEY = "secret-key-123";
  delete process.env.LLM_PROVIDER;
  delete process.env.LLM_MODEL;
  delete process.env.LLM_FALLBACK_MODELS;
  process.env.LLM_RETRY_DELAY_MS = "0";
});
afterEach(() => vi.unstubAllGlobals());

describe("callLLM", () => {
  it("fails clearly when no key is set", async () => {
    delete process.env.LLM_API_KEY;
    await expect(callLLM({ system: "s", user: "u" })).rejects.toThrow("LLM_API_KEY is not set");
  });

  it("rejects an unknown provider", async () => {
    process.env.LLM_PROVIDER = "nope";
    await expect(callLLM({ system: "s", user: "u" })).rejects.toBeInstanceOf(LlmError);
  });

  it("calls Anthropic by default with the key in a header", async () => {
    const f = vi.fn().mockResolvedValue(json({ content: [{ type: "text", text: "hello" }] }));
    vi.stubGlobal("fetch", f);
    expect(await callLLM({ system: "s", user: "u" })).toBe("hello");
    expect(f.mock.calls[0][0]).toBe("https://api.anthropic.com/v1/messages");
    expect(f.mock.calls[0][1].headers["x-api-key"]).toBe("secret-key-123");
  });

  it("calls Gemini with the model in the URL and the key in a header, not the URL", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.LLM_MODEL = "models/gemini-test-flash";
    const f = vi.fn().mockResolvedValue(json({ candidates: [{ content: { parts: [{ text: "a" }, { text: "b" }] } }] }));
    vi.stubGlobal("fetch", f);
    expect(await callLLM({ system: "sys", user: "usr" })).toBe("ab");
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-test-flash:generateContent");
    expect(url).not.toContain("secret-key-123");
    expect(init.headers["x-goog-api-key"]).toBe("secret-key-123");
    const sent = JSON.parse(init.body);
    expect(sent.systemInstruction.parts[0].text).toBe("sys");
    expect(sent.contents[0].parts[0].text).toBe("usr");
  });

  it("requires LLM_MODEL for Gemini", async () => {
    process.env.LLM_PROVIDER = "gemini";
    await expect(callLLM({ system: "s", user: "u" })).rejects.toThrow("LLM_MODEL is not set");
  });

  it("treats a blocked or empty Gemini reply as an error", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.LLM_MODEL = "m";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ promptFeedback: { blockReason: "OTHER" } })));
    await expect(callLLM({ system: "s", user: "u" })).rejects.toBeInstanceOf(LlmError);
  });

  it("never includes the key in error messages", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.LLM_MODEL = "m";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 429)));
    await expect(callLLM({ system: "s", user: "u" })).rejects.toThrow("status 429");
    await callLLM({ system: "s", user: "u" }).catch((e: Error) => expect(e.message).not.toContain("secret-key-123"));
  });

  describe("gemini retries and fallback", () => {
    const ok = () => json({ candidates: [{ content: { parts: [{ text: "ok" }] } }] });
    beforeEach(() => {
      process.env.LLM_PROVIDER = "gemini";
      process.env.LLM_MODEL = "primary";
    });

    it("retries once on a 503 and then succeeds", async () => {
      const f = vi.fn().mockResolvedValueOnce(json({}, 503)).mockResolvedValueOnce(ok());
      vi.stubGlobal("fetch", f);
      expect(await callLLM({ system: "s", user: "u" })).toBe("ok");
      expect(f).toHaveBeenCalledTimes(2);
      expect(f.mock.calls[1][0]).toContain("/models/primary:");
    });

    it("falls back to the next model when the first stays overloaded", async () => {
      process.env.LLM_FALLBACK_MODELS = "models/backup-one, backup-two";
      const f = vi.fn().mockResolvedValueOnce(json({}, 503)).mockResolvedValueOnce(json({}, 503)).mockResolvedValueOnce(ok());
      vi.stubGlobal("fetch", f);
      expect(await callLLM({ system: "s", user: "u" })).toBe("ok");
      expect(f).toHaveBeenCalledTimes(3);
      expect(f.mock.calls[2][0]).toContain("/models/backup-one:");
    });

    it("moves to the fallback right away on a 404 (wrong model name)", async () => {
      process.env.LLM_FALLBACK_MODELS = "backup";
      const f = vi.fn().mockResolvedValueOnce(json({}, 404)).mockResolvedValueOnce(ok());
      vi.stubGlobal("fetch", f);
      expect(await callLLM({ system: "s", user: "u" })).toBe("ok");
      expect(f).toHaveBeenCalledTimes(2);
    });

    it("does not retry a non-temporary error when there is no fallback", async () => {
      const f = vi.fn().mockResolvedValue(json({}, 403));
      vi.stubGlobal("fetch", f);
      await expect(callLLM({ system: "s", user: "u" })).rejects.toThrow("status 403");
      expect(f).toHaveBeenCalledTimes(1);
    });

    it("throws the last error when every model fails", async () => {
      process.env.LLM_FALLBACK_MODELS = "backup";
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 503)));
      await expect(callLLM({ system: "s", user: "u" })).rejects.toBeInstanceOf(LlmError);
    });
  });
});
