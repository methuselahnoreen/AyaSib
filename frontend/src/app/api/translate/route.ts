import glossaryData from "@/data/glossary.json";
import { findGlossaryTerms, termsUsed } from "@/lib/glossary";
import { apiError, clientIp, failure, LIMITS, rateLimit, readJson, readText } from "@/lib/http";
import { callLLM } from "@/lib/llm";
import { buildTranslatePrompt, isLang } from "@/lib/translate";
import type { GlossaryEntry } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const glossary = glossaryData as GlossaryEntry[];

export async function POST(req: Request) {
  if (!rateLimit(`translate:${clientIp(req)}`)) return apiError("rate_limited", "Too many requests");
  const body = await readJson(req);
  if (!body.ok) return body.response;
  const t = readText(body.value.text, "text", LIMITS.text);
  if (!t.ok) return t.response;
  const { from, to } = body.value;
  if (!isLang(from) || !isLang(to) || from === to) {
    return apiError("invalid_request", "from and to must be different values of en, fil or ceb");
  }

  try {
    const terms = findGlossaryTerms(t.text, from, to, glossary);
    const { system, user } = buildTranslatePrompt(t.text, from, to, terms);
    const translation = (await callLLM({ system, user, maxTokens: 2000 })).trim();
    return Response.json({ translation, glossary_terms_used: termsUsed(terms, translation) });
  } catch (e) {
    return failure(e);
  }
}
