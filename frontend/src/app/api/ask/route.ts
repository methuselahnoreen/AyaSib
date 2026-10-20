import { assembleAnswer, buildAskPrompt, notConfident, parseAsk } from "@/lib/ask";
import { apiError, clientIp, failure, LIMITS, rateLimit, readJson, readText } from "@/lib/http";
import { kb } from "@/lib/kb";
import { callLLM } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!rateLimit(`ask:${clientIp(req)}`)) return apiError("rate_limited", "Too many requests");
  const body = await readJson(req);
  if (!body.ok) return body.response;
  const q = readText(body.value.question, "question", LIMITS.question);
  if (!q.ok) return q.response;

  // Nothing in the knowledge base means nothing to ground an answer on, so never call the model.
  if (kb.length === 0) return Response.json(notConfident());

  try {
    const { system, user } = buildAskPrompt(kb, q.text);
    const raw = await callLLM({ system, user, maxTokens: 800 });
    return Response.json(assembleAnswer(kb, parseAsk(raw)));
  } catch (e) {
    return failure(e);
  }
}
