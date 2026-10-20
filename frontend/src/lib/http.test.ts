import { describe, expect, it } from "vitest";
import { apiError, rateLimit, readJson, readText } from "./http";

describe("rateLimit", () => {
  it("allows up to the limit then blocks, then recovers after the window", () => {
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) expect(rateLimit("t1", 3, 1000, now + i)).toBe(true);
    expect(rateLimit("t1", 3, 1000, now + 10)).toBe(false);
    expect(rateLimit("t1", 3, 1000, now + 5000)).toBe(true);
  });
  it("keeps separate counts per key", () => {
    expect(rateLimit("a", 1, 1000, 1)).toBe(true);
    expect(rateLimit("b", 1, 1000, 1)).toBe(true);
    expect(rateLimit("a", 1, 1000, 2)).toBe(false);
  });
});

describe("apiError", () => {
  it("uses the contract status codes and shape", async () => {
    const r = apiError("rate_limited", "x");
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ error: { code: "rate_limited", message: "x" } });
    expect(apiError("payload_too_large", "x").status).toBe(413);
    expect(apiError("upstream_error", "x").status).toBe(502);
  });
});

describe("readText", () => {
  it("rejects missing, empty and oversized text", () => {
    expect(readText(undefined, "q", 5).ok).toBe(false);
    expect(readText("   ", "q", 5).ok).toBe(false);
    expect(readText("123456", "q", 5).ok).toBe(false);
  });
  it("trims valid text", () => {
    const r = readText("  hi ", "q", 5);
    expect(r.ok && r.text).toBe("hi");
  });
});

describe("readJson", () => {
  const req = (body: string) => new Request("http://x/api", { method: "POST", body });
  it("accepts a JSON object", async () => {
    const r = await readJson(req('{"a":1}'));
    expect(r.ok).toBe(true);
  });
  it("rejects arrays, junk and oversized bodies", async () => {
    expect((await readJson(req("[1]"))).ok).toBe(false);
    expect((await readJson(req("not json"))).ok).toBe(false);
    const big = await readJson(req(JSON.stringify({ q: "x".repeat(25_000) })));
    expect(big.ok).toBe(false);
    if (!big.ok) expect(big.response.status).toBe(413);
  });
});
