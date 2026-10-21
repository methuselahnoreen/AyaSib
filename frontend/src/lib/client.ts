import { t } from "./strings";
import type { AskResponse, ExplainResponse, Lang, TranslateResponse } from "./types";

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new ApiError("network_error", 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error?.code ?? "internal_error", res.status);
  return data as T;
}

export const askQuestion = (question: string) => post<AskResponse>("/api/ask", { question });
export const explainText = (text: string) => post<ExplainResponse>("/api/explain", { text });
export const translateText = (text: string, from: Lang, to: Lang) => post<TranslateResponse>("/api/translate", { text, from, to });

/** Friendly Cebuano message for an API error. Technical details are never shown to the user. */
export function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === "rate_limited") return t.errors.rateLimited;
    if (e.code === "payload_too_large") return t.errors.tooLong;
  }
  return t.errors.generic;
}
