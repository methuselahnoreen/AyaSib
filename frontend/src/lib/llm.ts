export class LlmError extends Error {}

interface LlmRequest {
  system: string;
  user: string;
  maxTokens?: number;
}

/**
 * Server-side call to the LLM provider (Anthropic Messages API). The key is read from the environment
 * and never leaves the server. To use another provider, replace only this function.
 */
export async function callLLM({ system, user, maxTokens = 1000 }: LlmRequest): Promise<string> {
  const key = process.env.LLM_API_KEY;
  if (!key) throw new LlmError("LLM_API_KEY is not set");
  const model = process.env.LLM_MODEL || "claude-sonnet-5-5";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
      signal: controller.signal,
    });
    if (!res.ok) throw new LlmError(`LLM request failed with status ${res.status}`);
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("");
    if (!text.trim()) throw new LlmError("LLM returned an empty reply");
    return text;
  } catch (e) {
    if (e instanceof LlmError) throw e;
    throw new LlmError(e instanceof Error && e.name === "AbortError" ? "LLM request timed out" : "LLM request failed");
  } finally {
    clearTimeout(timer);
  }
}
