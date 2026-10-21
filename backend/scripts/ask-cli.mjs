import fs from "node:fs";
import { answerQuestion } from "../lib/ask.mjs";

const services = JSON.parse(fs.readFileSync(new URL("../data/kb.json", import.meta.url), "utf8"));
const args = process.argv.slice(2);
const questions = args.length
  ? args
  : [
      "Unsaon pag-apply ug NBI clearance?",
      "Pila ang bayad sa NBI clearance?",
      "Unsa ang kinahanglan dad-on para sa NBI clearance?",
      "Pila ang bayad sa barangay clearance?",
      "Unsaon pagkuha ug PSA birth certificate?",
      "Unsa ang panahon karon?",
    ];

for (const q of questions) {
  const { status, body } = await answerQuestion({
    question: q,
    services,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    token: process.env.CLOUDFLARE_API_TOKEN,
    model: process.env.LLM_MODEL,
  });
  console.log(`\nQ: ${q}`);
  if (status !== 200) {
    console.log(`  ERROR ${status}: ${body.error.code}`);
    continue;
  }
  if (!body.confident) {
    console.log(`  NOT SURE -> ${body.message}`);
    continue;
  }
  console.log(`  FOUND: ${body.sources[0].title} (verified ${body.sources[0].last_verified})`);
  console.log(`  ${body.answer.summary}`);
}