import fs from "node:fs";

const { CLOUDFLARE_ACCOUNT_ID: id, CLOUDFLARE_API_TOKEN: token } = process.env;
if (!id || !token) throw new Error("Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN");

const MODEL = process.env.LLM_MODEL || "@cf/qwen/qwen3-30b-a3b-fp8";
const file = fs.readFileSync(new URL("../../kb/nbi-clearance.yaml", import.meta.url), "utf8");

const system =
  "Answer the question in Cebuano, using ONLY the file below. " +
  "If the file does not contain the answer, say you are not sure.\n\nFILE:\n" + file;

const questions = [
  "Pila ang bayad sa NBI clearance ug unsa ang kinahanglan dad-on?",
  "Unsaon pag-apply ug NBI clearance?",
  "Pila ang bayad sa barangay clearance?",
];

for (const q of questions) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${id}/ai/run/${MODEL}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "system", content: system }, { role: "user", content: q }],
        temperature: 0.2,
        max_tokens: 700,
      }),
    }
  );
  const data = await res.json();
  const text = data?.result?.response ?? data?.result?.choices?.[0]?.message?.content;
  console.log("\nQ:", q);
  console.log(text ? text.replace(/<think>[\s\S]*?<\/think>/g, "").trim() : JSON.stringify(data, null, 2));
}