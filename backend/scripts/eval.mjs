import fs from "node:fs";
import { answerQuestion } from "../lib/ask.mjs";

// Load the built KB and the eval set.
const services = JSON.parse(fs.readFileSync(new URL("../data/kb.json", import.meta.url), "utf8"));
const questions = JSON.parse(fs.readFileSync(new URL("../../eval/questions.json", import.meta.url), "utf8"));

// The API response does not carry the service id, only the source title.
// Build a title -> id map so we can recover which service was chosen.
const titleToId = new Map(services.map((s) => [s.source_title, s.id]));

// Turn one answerQuestion result into the service id it resolved to,
// or null for a "not sure" answer. Errors are returned as a special marker.
function resolveId({ status, body }) {
  if (status !== 200) return { error: body?.error?.code ?? `status ${status}` };
  if (!body.confident) return { id: null };
  const title = body.sources?.[0]?.title;
  return { id: titleToId.get(title) ?? `unknown(${title ?? "no title"})` };
}

const label = (v) => (v === null ? "null (not sure)" : v);

let pass = 0;
let fail = 0;
const failures = [];

for (const item of questions) {
  const result = await answerQuestion({
    question: item.question,
    services,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    token: process.env.CLOUDFLARE_API_TOKEN,
    model: process.env.LLM_MODEL,
  });

  const resolved = resolveId(result);
  const expected = item.expected ?? null;

  let ok = false;
  let got;
  if (resolved.error) {
    got = `ERROR ${resolved.error}`;
  } else {
    got = resolved.id;
    ok = got === expected;
  }

  if (ok) {
    pass += 1;
    console.log(`PASS  ${item.question}`);
    console.log(`        -> ${label(got)}`);
  } else {
    fail += 1;
    console.log(`FAIL  ${item.question}`);
    console.log(`        expected ${label(expected)}`);
    console.log(`        got      ${label(got)}`);
    failures.push({ question: item.question, expected: label(expected), got: label(got) });
  }
}

const total = questions.length;
const rate = total === 0 ? 0 : Math.round((pass / total) * 100);

console.log(`\n${pass} of ${total} passed (${rate}%)`);

if (failures.length > 0) {
  console.log("\nFailures:");
  for (const f of failures) {
    console.log(`  - "${f.question}"  expected ${f.expected}, got ${f.got}`);
  }
}

// Non-zero exit when anything failed, so CI or a human notices.
process.exit(fail > 0 ? 1 : 0);
