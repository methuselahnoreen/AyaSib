// Server-side call to the routing model. Open-source / open-weights only.
//
// AyaSib must use an open model (competition rule). We use Cloudflare Workers AI
// with Qwen3 (Apache-2.0) by default. The model's ONLY job for Ask is to pick which
// knowledge-base service a question is about; it never writes the Cebuano shown to users.
//
// Credentials are read from the environment and never leave the server:
//   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, and optional LLM_MODEL.

export class LlmError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

export const DEFAULT_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";
const TIMEOUT_MS = 20_000;

export interface LlmMessage {
  role: "system" | "user";
  content: string;
}

interface LlmRequest {
  /** Either pass messages directly, or the system/user convenience pair below. */
  messages?: LlmMessage[];
  system?: string;
  user?: string;
  maxTokens?: number;
  /** Replaced in tests. Defaults to the real fetch. */
  fetchImpl?: typeof fetch;
}

function toMessages(req: LlmRequest): LlmMessage[] {
  if (req.messages && req.messages.length) return req.messages;
  const messages: LlmMessage[] = [];
  if (req.system) messages.push({ role: "system", content: req.system });
  messages.push({ role: "user", content: req.user ?? "" });
  return messages;
}

/**
 * Sends the routing messages to Cloudflare Workers AI and returns the raw text reply.
 * Cloudflare sometimes returns result.response as an already-parsed object rather than a
 * string, so we stringify non-string replies before handing them back to the caller.
 */
export async function callLLM(req: LlmRequest): Promise<string> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) throw new LlmError("Cloudflare credentials are not configured");

  const model = process.env.LLM_MODEL || DEFAULT_MODEL;
  const fetchImpl = req.fetchImpl ?? fetch;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: toMessages(req), temperature: 0, max_tokens: req.maxTokens ?? 800 }),
      signal: controller.signal,
    });

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      throw new LlmError(`model returned a non-JSON reply (${res.status})`, res.status);
    }

    const ok = res.ok && (data as { success?: boolean })?.success !== false;
    if (!ok) throw new LlmError(`model call failed (${res.status})`, res.status);

    const result = (data as { result?: { response?: unknown; choices?: { message?: { content?: unknown } }[] } }).result;
    const reply = result?.response ?? result?.choices?.[0]?.message?.content ?? "";
    const text = typeof reply === "string" ? reply : JSON.stringify(reply);
    if (text.trim() === "") throw new LlmError("model returned an empty reply");
    return text;
  } catch (e) {
    if (e instanceof LlmError) throw e;
    if (e instanceof Error && e.name === "AbortError") throw new LlmError("model request timed out");
    throw new LlmError("model request failed");
  } finally {
    clearTimeout(timer);
  }
}
