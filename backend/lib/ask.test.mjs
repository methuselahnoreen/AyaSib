import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { answerQuestion } from "./ask.mjs";

const previousFetch = globalThis.fetch;
const question = (text, extras = {}) =>
  answerQuestion({
    question: text,
    services: [],
    ...extras,
  });

afterEach(() => {
  globalThis.fetch = previousFetch;
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  delete process.env.CLOUDFLARE_API_TOKEN;
});

describe("answerQuestion social messages", () => {
  it("responds to greetings without Cloudflare credentials", async () => {
    const result = await question("Hi!!!");
    assert.equal(result.status, 200);
    assert.match(result.body.message, /Kumusta!/);
  });

  it("responds to farewells without Cloudflare credentials", async () => {
    const result = await question("bye");
    assert.equal(result.status, 200);
    assert.match(result.body.message, /amping/);
  });

  it("redirects unrelated questions to supported topics", async () => {
    const result = await question("Unsa ang panahon?");
    assert.equal(result.status, 200);
    assert.equal(result.body.confident, false);
    assert.match(result.body.message, /opisyal nga dokumento/);
  });

  it("keeps government-document questions in scope", async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = "test-account";
    process.env.CLOUDFLARE_API_TOKEN = "test-token";
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ success: true, result: { response: '{"service_id":null}' } }), { status: 200 });
    const result = await question("Unsaon pagkuha og passport?", {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      token: process.env.CLOUDFLARE_API_TOKEN,
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.confident, false);
    assert.match(result.body.message, /Dili ko sigurado/);
  });
});
