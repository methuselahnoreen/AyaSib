import { LlmError } from "./llm";
import type { ApiErrorCode } from "./types";

const STATUS: Record<ApiErrorCode, number> = {
  invalid_request: 400,
  payload_too_large: 413,
  unsupported_media_type: 415,
  rate_limited: 429,
  upstream_error: 502,
  internal_error: 500,
};

export const LIMITS = { question: 2000, text: 8000, body: 20_000 };

export function apiError(code: ApiErrorCode, message: string): Response {
  return Response.json({ error: { code, message } }, { status: STATUS[code] });
}

const hits = new Map<string, number[]>();

/** Simple in-memory limiter (per server instance). Returns false when the caller is over the limit. */
export function rateLimit(key: string, limit = 20, windowMs = 60_000, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  }
  return true;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

type JsonResult = { ok: true; value: Record<string, unknown> } | { ok: false; response: Response };

export async function readJson(req: Request): Promise<JsonResult> {
  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, response: apiError("invalid_request", "Could not read the request body") };
  }
  if (text.length > LIMITS.body) return { ok: false, response: apiError("payload_too_large", "Request body is too large") };
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("not an object");
    return { ok: true, value: value as Record<string, unknown> };
  } catch {
    return { ok: false, response: apiError("invalid_request", "Body must be a JSON object") };
  }
}

/** Validates a required text field. Returns the trimmed text or an error response. */
export function readText(value: unknown, field: string, max: number): { ok: true; text: string } | { ok: false; response: Response } {
  if (typeof value !== "string" || !value.trim()) return { ok: false, response: apiError("invalid_request", `${field} is required`) };
  if (value.length > max) return { ok: false, response: apiError("payload_too_large", `${field} is longer than ${max} characters`) };
  return { ok: true, text: value.trim() };
}

/** Maps any thrown error to a contract error response. Never leaks details or keys to the client. */
export function failure(e: unknown): Response {
  console.error("[api]", e instanceof Error ? e.message : "unknown error");
  if (e instanceof LlmError) return apiError("upstream_error", "The language model request failed");
  return apiError("internal_error", "Something went wrong");
}
