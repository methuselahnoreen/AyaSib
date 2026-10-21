export class LlmError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

// Temporary problems worth retrying: rate limit and server-side errors (503 means "model overloaded").
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const MAX_RETRY_WINDOW_MS = 15_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface LlmRequest {
  system: string;
  user: string;
  maxTokens?: number;
}

const TIMEOUT_MS = 25_000;

/**
 * Server-side call to the LLM provider. The key is read from the environment and never leaves the server.
 * LLM_PROVIDER = "gemini" (free tier available) or "anthropic" (default). Only this file knows about providers.
 */
export async function callLLM(req: LlmRequest): Promise<string> {
  const key = process.env.LLM_API_KEY;
  if (!key) throw new LlmError("LLM_API_KEY is not set");
  const provider = (process.env.LLM_PROVIDER || "anthropic").toLowerCase();
  if (provider === "gemini") return callGemini(key, req);
  if (provider === "anthropic") return callAnthropic(key, req);
  throw new LlmError(`Unknown LLM_PROVIDER "${provider}" (use "gemini" or "anthropic")`);
}

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new LlmError(`LLM request failed with status ${res.status}`, res.status);
    return await res.json();
  } catch (e) {
    if (e instanceof LlmError) throw e;
    throw new LlmError(e instanceof Error && e.name === "AbortError" ? "LLM request timed out" : "LLM request failed");
  } finally {
    clearTimeout(timer);
  }
}

async function callAnthropic(key: string, { system, user, maxTokens = 1000 }: LlmRequest): Promise<string> {
  const model = process.env.LLM_MODEL || "claude-sonnet-5-5";
  const data = (await postJson(
    "https://api.anthropic.com/v1/messages",
    { "x-api-key": key, "anthropic-version": "2023-06-01" },
    { model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] },
  )) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("");
  if (!text.trim()) throw new LlmError("LLM returned an empty reply");
  return text;
}

/**
 * Gemini: tries LLM_MODEL first, then each model in LLM_FALLBACK_MODELS (comma separated).
 * A temporary error (429, 5xx) is retried once on the same model before moving to the next one.
 */
async function callGemini(key: string, req: LlmRequest): Promise<string> {
  const models = [process.env.LLM_MODEL, ...(process.env.LLM_FALLBACK_MODELS ?? "").split(",")]
    .map((m) => m?.trim().replace(/^models\//, ""))
    .filter((m): m is string => !!m);
  if (models.length === 0) throw new LlmError("LLM_MODEL is not set (required when LLM_PROVIDER=gemini)");

  const delay = Number(process.env.LLM_RETRY_DELAY_MS ?? 600);
  const started = Date.now();
  let last: unknown;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await geminiOnce(key, model, req);
      } catch (e) {
        last = e;
        if (Date.now() - started > MAX_RETRY_WINDOW_MS) throw e;
        const retryable = e instanceof LlmError && e.status !== undefined && RETRYABLE.has(e.status);
        if (!retryable) break; // wrong model name, bad key, empty reply: go to the next model
        if (attempt === 0) await sleep(delay);
      }
    }
  }
  throw last;
}

async function geminiOnce(key: string, model: string, { system, user, maxTokens = 1000 }: LlmRequest): Promise<string> {
  const data = (await postJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    { "x-goog-api-key": key },
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      // Some Gemini models spend part of this budget on internal reasoning, so leave headroom.
      generationConfig: { maxOutputTokens: maxTokens * 3, temperature: 0.2 },
    },
  )) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  if (!text.trim()) throw new LlmError("LLM returned an empty reply");
  return text;
}
