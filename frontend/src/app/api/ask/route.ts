import { assembleAnswer, buildAskPrompt, notConfident, parseAsk } from "@/lib/ask";
import { TtlCache } from "@/lib/cache";
import { apiError, clientIp, failure, LIMITS, rateLimit, readJson, readText } from "@/lib/http";
import { kb } from "@/lib/kb";
import { callLLM } from "@/lib/llm";
import type { AskResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30; // seconds; leaves room for a retry on a busy model

// Repeated questions are answered from memory (the KB only changes when we redeploy).
const cache = new TtlCache<AskResponse>();

export async function POST(req: Request) {
  if (!rateLimit(`ask:${clientIp(req)}`)) return apiError("rate_limited", "Too many requests");
  const body = await readJson(req);
  if (!body.ok) return body.response;
  const q = readText(body.value.question, "question", LIMITS.question);
  if (!q.ok) return q.response;

  // Nothing in the knowledge base means nothing to ground an answer on, so never call the model.
  if (kb.length === 0) return Response.json(notConfident());

  const cacheKey = q.text.toLowerCase().replace(/\s+/g, " ");
  const cached = cache.get(cacheKey);
  if (cached) return Response.json(cached);

  try {
    const { system, user } = buildAskPrompt(kb, q.text);
    const raw = await callLLM({ system, user, maxTokens: 800 });
    const answer = assembleAnswer(kb, parseAsk(raw));
    cache.set(cacheKey, answer);
    return Response.json(answer);
  } catch (e) {
    return failure(e);
  }
}
