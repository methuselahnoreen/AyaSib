import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KbEntry } from "@/lib/types";

const entry: KbEntry = {
  id: "nbi-clearance",
  name_en: "NBI Clearance",
  name_ceb: "",
  locality: "Cebu City",
  who_may_avail: "Any citizen",
  scope_note: "",
  requirements: ["Valid ID"],
  requirements_note: "",
  steps: [],
  fee: "PHP 130",
  office: "NBI Cebu",
  processing_time: "1 to 3 days",
  source_title: "NBI Clearance Guide",
  source_url: "https://nbi.gov.ph/how-to-apply-nbi-clearance/",
  last_verified: "2026-10-14",
  notes: "",
  summary_ceb: "Mag-apply online una.",
  requirements_ceb: ["Valid ID"],
  requirements_note_ceb: "",
  steps_ceb: [],
  office_ceb: "NBI Cebu branch",
  fee_ceb: "PHP 130",
  processing_time_ceb: "1 hangtod 3 ka adlaw",
};

const kbMock = vi.hoisted(() => ({ kb: [] as unknown[] }));
vi.mock("@/lib/kb", () => kbMock);

import { POST } from "./route";

const call = (body: unknown, ip = "1.1.1.1") =>
  POST(new Request("http://x/api/ask", { method: "POST", headers: { "x-forwarded-for": ip }, body: JSON.stringify(body) }));

// Cloudflare Workers AI reply shape.
const modelReply = (serviceId: string | null) =>
  new Response(JSON.stringify({ success: true, result: { response: JSON.stringify({ service_id: serviceId }) } }), { status: 200 });

beforeEach(() => {
  process.env.CLOUDFLARE_ACCOUNT_ID = "acct-123";
  process.env.CLOUDFLARE_API_TOKEN = "test-token";
  kbMock.kb = [entry];
});
afterEach(() => vi.unstubAllGlobals());

describe("POST /api/ask", () => {
  it("returns a grounded answer built from the curated KB fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(modelReply("nbi-clearance"));
    vi.stubGlobal("fetch", fetchMock);
    const res = await call({ question: "Unsaon pag-apply ug NBI?" }, "2.2.2.2");
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.confident).toBe(true);
    expect(data.answer.summary).toBe(entry.summary_ceb);
    expect(data.answer.fee).toBe("PHP 130");
    expect(data.sources[0].last_verified).toBe("2026-10-14");
    // the token is sent to Cloudflare as a Bearer header, never echoed to the client
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer test-token");
  });

  it("returns confident:false when the model picks no service", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(modelReply(null)));
    const data = await (await call({ question: "Unsaon pag-apply ug passport?" }, "3.3.3.3")).json();
    expect(data.confident).toBe(false);
    expect(data.answer).toBeNull();
  });

  it("returns confident:false when the model names an id not in the KB", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(modelReply("made-up")));
    const data = await (await call({ question: "something" }, "3.3.3.9")).json();
    expect(data.confident).toBe(false);
  });

  it("answers an explicitly named service without depending on the model", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const data = await (await call({ question: "Unsaon pagkuha og NBI clearance?" }, "3.3.3.8")).json();
    expect(data.confident).toBe(true);
    expect(data.answer.summary).toBe(entry.summary_ceb);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never calls the model when the knowledge base is empty", async () => {
    kbMock.kb = [];
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const data = await (await call({ question: "anything" }, "4.4.4.4")).json();
    expect(data.confident).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps a provider failure to upstream_error without leaking the token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 500 })));
    const res = await call({ question: "hello" }, "5.5.5.5");
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("test-token");
  });

  it("answers a repeated question from the cache without calling the model again", async () => {
    const fetchMock = vi.fn().mockResolvedValue(modelReply("nbi-clearance"));
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

  it("uses prior context to resolve a short follow-up, and keeps it out of the standalone cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue(modelReply("nbi-clearance"));
    vi.stubGlobal("fetch", fetchMock);

    // Follow-up with context resolves to the service and includes the context in the prompt.
    const withCtx = await (
      await POST(
        new Request("http://x/api/ask", {
          method: "POST",
          headers: { "x-forwarded-for": "8.8.8.1" },
          body: JSON.stringify({ question: "Pila ang bayad niini?", context: "Unsaon pag-apply ug NBI?" }),
        }),
      )
    ).json();
    expect(withCtx.confident).toBe(true);
    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const userMsg = sentBody.messages.find((m: { role: string }) => m.role === "user").content;
    expect(userMsg).toContain("<context>");

    // The same bare question with no context is a different cache key, so it still refuses.
    fetchMock.mockResolvedValue(modelReply(null));
    const noCtx = await (await call({ question: "Pila ang bayad niini?" }, "8.8.8.2")).json();
    expect(noCtx.confident).toBe(false);
  });

  it("rate limits after 20 requests per minute", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => modelReply(null)));
    let last = 200;
    for (let i = 0; i < 21; i++) last = (await call({ question: "hi" }, "9.9.9.9")).status;
    expect(last).toBe(429);
  });
});
