import { buildExplainPrompt, EXPLAIN_SYSTEM, parseExplain } from "@/lib/explain";
import { apiError, clientIp, failure, LIMITS, rateLimit, readJson, readText } from "@/lib/http";
import { callLLM } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30; // seconds; leaves room for a retry on a busy model

export async function POST(req: Request) {
  if (!rateLimit(`explain:${clientIp(req)}`)) return apiError("rate_limited", "Too many requests");
  const body = await readJson(req);
  if (!body.ok) return body.response;
  const t = readText(body.value.text, "text", LIMITS.text);
  if (!t.ok) return t.response;

  try {
    const raw = await callLLM({ system: EXPLAIN_SYSTEM, user: buildExplainPrompt(t.text), maxTokens: 1200 });
    const parsed = parseExplain(raw);
    if (!parsed) return apiError("upstream_error", "The language model returned an unreadable reply");
    return Response.json(parsed);
  } catch (e) {
    return failure(e);
  }
}
