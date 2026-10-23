import fs from "node:fs";
import { answerQuestion } from "../lib/ask.mjs";

const services = JSON.parse(fs.readFileSync(new URL("../data/kb.json", import.meta.url), "utf8"));

const args = process.argv.slice(2);
const questions = args.length
  ? args
  : [
      "Unsaon pag-apply ug NBI clearance?",
      "Pila ang bayad?",
      "Unsa ang kinahanglan dad-on?",
      "Unsa ka dugay ni?",
      "Salamat!",
      "Kumusta",
      "Pila ang bayad sa barangay clearance?",
      "Pila ang bayad sa PSA birth certificate?",
    ];

const isFilled = (v) => (Array.isArray(v) ? v.length > 0 : v != null && v !== "");

// Carry the resolved service forward so a bare follow-up keeps the same topic.
let context;

for (const q of questions) {
  const { status, body } = await answerQuestion({
    question: q,
    context,
    services,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    token: process.env.CLOUDFLARE_API_TOKEN,
    model: process.env.LLM_MODEL,
  });

  console.log(`\nQ: ${q}`);

  if (status !== 200) {
    console.log(`  ERROR ${status}: ${body.error.code} - ${body.error.message}`);
    continue;
  }

  console.log(`  type: ${body.type}${body.intent ? `  intent: ${body.intent}` : ""}${body.service_id ? `  service: ${body.service_id}` : ""}`);

  if (body.answer?.summary) console.log(`  summary: ${body.answer.summary}`);
  if (body.type === "not_sure") console.log(`  message: ${body.message}`);

  const a = body.answer;
  if (a) {
    if (isFilled(a.requirements)) {
      console.log("  requirements:");
      for (const r of a.requirements) console.log(`    - ${r}`);
      if (a.requirements_note) console.log(`    note: ${a.requirements_note}`);
    }
    if (isFilled(a.steps)) {
      console.log("  steps:");
      for (const step of a.steps) console.log(`    - ${step}`);
    }
    if (isFilled(a.office)) console.log(`  office: ${a.office}`);
    if (isFilled(a.fee)) console.log(`  fee: ${a.fee}`);
    if (isFilled(a.processing_time)) console.log(`  processing_time: ${a.processing_time}`);
  }

  if (body.suggestions?.length) {
    console.log("  suggestions:");
    for (const sug of body.suggestions) console.log(`    - [${sug.intent}] ${sug.label}`);
  }

  // Remember the topic only when a service was actually resolved.
  context = body.service_id ? { service_id: body.service_id } : context;
}
