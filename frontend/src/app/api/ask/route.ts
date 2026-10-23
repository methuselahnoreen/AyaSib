import { assembleAnswer, buildAskMessages, findExplicitServiceId, isClearlyOutOfScope, notConfident, parseServiceId, socialResponse } from "@/lib/ask";
import { TtlCache } from "@/lib/cache";
import { apiError, clientIp, failure, LIMITS, rateLimit, readJson, readText } from "@/lib/http";
import { kb } from "@/lib/kb";
import { callLLM } from "@/lib/llm";
import { serverText } from "@/lib/strings";
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

  const social = socialResponse(q.text);
  if (social) return Response.json(social);

  // Optional conversation context (for example the previous question), used only to resolve
  // follow-ups like "pila ang bayad niini?". It is never shown to the user and does not add facts.
  const context = typeof body.value.context === "string" ? body.value.context.slice(0, LIMITS.question).trim() : "";

  if (isClearlyOutOfScope(q.text, context)) return Response.json(notConfident(serverText.outOfScope));

  // Nothing in the knowledge base means nothing to ground an answer on, so never call the model.
  if (kb.length === 0) return Response.json(notConfident());

  const explicitServiceId = findExplicitServiceId(q.text, kb);
  if (explicitServiceId) return Response.json(assembleAnswer(kb, explicitServiceId));

  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const cacheKey = context ? `${norm(context)} >> ${norm(q.text)}` : norm(q.text);
  const cached = cache.get(cacheKey);
  if (cached) return Response.json(cached);

  try {
    const raw = await callLLM({ messages: buildAskMessages(kb, q.text, context), maxTokens: 800 });
    const serviceId = parseServiceId(raw, kb);
    const answer = serviceId ? assembleAnswer(kb, serviceId) : notConfident();
    cache.set(cacheKey, answer);
    return Response.json(answer);
  } catch (e) {
    return failure(e);
  }
}
