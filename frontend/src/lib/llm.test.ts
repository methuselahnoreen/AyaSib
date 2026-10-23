import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callLLM, DEFAULT_MODEL, LlmError } from "./llm";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const cfOk = (text: string) => json({ success: true, result: { response: text } });

beforeEach(() => {
  process.env.CLOUDFLARE_ACCOUNT_ID = "acct-123";
  process.env.CLOUDFLARE_API_TOKEN = "secret-token-xyz";
  delete process.env.LLM_MODEL;
});
afterEach(() => vi.unstubAllGlobals());

describe("callLLM (Cloudflare Workers AI, open-source model)", () => {
  it("fails clearly when credentials are missing", async () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    await expect(callLLM({ user: "u", fetchImpl: vi.fn() })).rejects.toThrow("Cloudflare credentials are not configured");
  });

  it("posts to the Cloudflare endpoint with the default model and a Bearer token", async () => {
    const f = vi.fn().mockResolvedValue(cfOk("hello"));
    expect(await callLLM({ system: "s", user: "u", fetchImpl: f })).toBe("hello");
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(`https://api.cloudflare.com/client/v4/accounts/acct-123/ai/run/${DEFAULT_MODEL}`);
    expect(init.headers.Authorization).toBe("Bearer secret-token-xyz");
  });

  it("uses LLM_MODEL when set", async () => {
    process.env.LLM_MODEL = "@cf/openai/gpt-oss-120b";
    const f = vi.fn().mockResolvedValue(cfOk("ok"));
    await callLLM({ user: "u", fetchImpl: f });
    expect(f.mock.calls[0][0]).toContain("@cf/openai/gpt-oss-120b");
  });

  it("stringifies a non-string response object (Cloudflare quirk)", async () => {
    const f = vi.fn().mockResolvedValue(json({ success: true, result: { response: { service_id: "x" } } }));
    expect(await callLLM({ user: "u", fetchImpl: f })).toBe('{"service_id":"x"}');
  });

  it("treats a failed call as an LlmError and never leaks the token", async () => {
    const f = vi.fn().mockResolvedValue(json({ success: false }, 500));
    await expect(callLLM({ user: "u", fetchImpl: f })).rejects.toBeInstanceOf(LlmError);
    await callLLM({ user: "u", fetchImpl: f }).catch((e: Error) => expect(e.message).not.toContain("secret-token-xyz"));
  });

  it("treats a persistently empty reply as an error, after retrying once", async () => {
    // A fresh Response per call (a Response body can only be read once).
    const f = vi.fn().mockImplementation(async () => cfOk("   "));
    await expect(callLLM({ user: "u", fetchImpl: f })).rejects.toThrow("empty reply");
    expect(f).toHaveBeenCalledTimes(2); // one retry on the transient empty reply
  });

  it("recovers on the retry when the first reply is empty", async () => {
    const f = vi.fn().mockImplementationOnce(async () => cfOk("   ")).mockImplementationOnce(async () => cfOk("recovered"));
    expect(await callLLM({ user: "u", fetchImpl: f })).toBe("recovered");
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 4xx (client) error", async () => {
    const f = vi.fn().mockImplementation(async () => json({ success: false }, 400));
    await expect(callLLM({ user: "u", fetchImpl: f })).rejects.toBeInstanceOf(LlmError);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("builds messages from the system/user convenience pair", async () => {
    const f = vi.fn().mockResolvedValue(cfOk("ok"));
    await callLLM({ system: "SYS", user: "USR", fetchImpl: f });
    const sent = JSON.parse(f.mock.calls[0][1].body);
    expect(sent.messages).toEqual([
      { role: "system", content: "SYS" },
      { role: "user", content: "USR" },
    ]);
    expect(sent.temperature).toBe(0);
  });
});
