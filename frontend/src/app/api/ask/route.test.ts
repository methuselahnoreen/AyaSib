import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const entry = {
  id: "nbi-clearance",
  name_en: "NBI Clearance",
  name_ceb: "NBI Clearance",
  locality: "Cebu City",
  requirements: ["Valid ID"],
  fee: "PHP 130",
  office: "NBI Cebu",
  processing_time: "1 to 3 days",
  source_url: "https://example.gov.ph/nbi",
  last_verified: "2026-10-14",
  notes: "",
};

const kbMock = vi.hoisted(() => ({ kb: [] as unknown[] }));
vi.mock("@/lib/kb", () => kbMock);

import { POST } from "./route";

const call = (body: unknown, ip = "1.1.1.1") =>
  POST(new Request("http://x/api/ask", { method: "POST", headers: { "x-forwarded-for": ip }, body: JSON.stringify(body) }));

const modelReply = (text: string) => new Response(JSON.stringify({ content: [{ type: "text", text }] }), { status: 200 });

beforeEach(() => {
  process.env.LLM_API_KEY = "test-key";
  process.env.LLM_PROVIDER = "anthropic";
  kbMock.kb = [entry];
});
afterEach(() => vi.unstubAllGlobals());

describe("POST /api/ask", () => {
  it("returns a grounded answer using the model's wording and the KB's facts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      modelReply('{"service_id":"nbi-clearance","summary":"Mag-apply online.","requirements":["Valid ID"],"fee":"PHP 1"}'),
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await call({ question: "Unsaon pag-apply ug NBI?" }, "2.2.2.2");
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.confident).toBe(true);
    expect(data.answer.fee).toBe("PHP 130");
    expect(data.sources[0].last_verified).toBe("2026-10-14");
    // the API key is sent to the provider only, as a header
    expect(fetchMock.mock.calls[0][1].headers["x-api-key"]).toBe("test-key");
  });

  it("returns confident:false when the model finds no matching service", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(modelReply('{"service_id":null,"summary":"","requirements":[]}')));
    const data = await (await call({ question: "Unsaon pag-apply ug passport?" }, "3.3.3.3")).json();
    expect(data.confident).toBe(false);
    expect(data.answer).toBeNull();
  });

  it("never calls the model when the knowledge base is empty", async () => {
    kbMock.kb = [];
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const data = await (await call({ question: "anything" }, "4.4.4.4")).json();
    expect(data.confident).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps a provider failure to upstream_error without leaking details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 500 })));
    const res = await call({ question: "hello" }, "5.5.5.5");
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("test-key");
  });

  it("answers a repeated question from the cache without calling the model again", async () => {
    const fetchMock = vi.fn().mockResolvedValue(modelReply('{"service_id":"nbi-clearance","summary":"ok","requirements":["Valid ID"]}'));
    vi.stubGlobal("fetch", fetchMock);
    await call({ question: "Cache  Test question" }, "7.7.7.7");
    const second = await (await call({ question: "cache test QUESTION" }, "7.7.7.8")).json();
    expect(second.confident).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("validates input", async () => {
    expect((await call({}, "6.6.6.6")).status).toBe(400);
    expect((await call({ question: "x".repeat(2001) }, "6.6.6.7")).status).toBe(413);
  });

  it("rate limits after 20 requests per minute", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => modelReply('{"service_id":null}')));
    let last = 200;
    for (let i = 0; i < 21; i++) last = (await call({ question: "hi" }, "9.9.9.9")).status;
    expect(last).toBe(429);
  });
});
