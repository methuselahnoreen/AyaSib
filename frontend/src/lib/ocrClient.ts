// Sends a photo to POST /api/ocr and returns the text. Contract: docs/OCR-API.md.
// With NEXT_PUBLIC_MOCK_API=true it returns canned results and never calls the server.
// NEXT_PUBLIC_MOCK_OCR picks the canned result: success (default), low, empty, busy, or failed.

export const OCR_ENDPOINT = "/api/ocr";
export const OCR_TIMEOUT_MS = 30_000;
export const MAX_TEXT_CHARS = 8000;

export type OcrErrorCode = "bad_request" | "too_large" | "busy" | "failed" | "network" | "timeout";

export class OcrError extends Error {
  constructor(public code: OcrErrorCode) {
    super(`OCR failed: ${code}`);
  }
}
export class OcrCancelled extends Error {}

export interface OcrResult {
  text: string;
  /** 0 to 100. Missing when the server has no score. */
  confidence?: number;
}

type MockScenario = "success" | "low" | "empty" | "busy" | "failed";

/** Reads the mock setting. Returns null when the real server should be used. */
export function mockScenario(): MockScenario | null {
  if (process.env.NEXT_PUBLIC_MOCK_API !== "true") return null;
  const s = process.env.NEXT_PUBLIC_MOCK_OCR;
  return s === "low" || s === "empty" || s === "busy" || s === "failed" ? s : "success";
}

const MOCK_TEXT =
  "REPUBLIC OF THE PHILIPPINES\nBarangay Clearance\n\nThis is to certify that the person named below is a resident of this barangay and has no pending case on record.\n\nValid for six (6) months from the date of issue.";

const CODES: ReadonlySet<string> = new Set(["bad_request", "too_large", "busy", "failed"]);

function codeFromStatus(status: number): OcrErrorCode {
  if (status === 400 || status === 415 || status === 422) return "bad_request";
  if (status === 413) return "too_large";
  if (status === 429) return "busy";
  return "failed";
}

async function codeFromResponse(res: Response): Promise<OcrErrorCode> {
  try {
    const body = (await res.json()) as { error?: { code?: unknown } };
    const code = body?.error?.code;
    if (typeof code === "string" && CODES.has(code)) return code as OcrErrorCode;
  } catch {
    // not JSON: fall back to the status number
  }
  return codeFromStatus(res.status);
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new OcrCancelled());
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new OcrCancelled());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

interface ReadOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Replaced in tests. */
  fetchImpl?: typeof fetch;
  /** Replaced in tests. Defaults to the environment setting. */
  mock?: MockScenario | null;
  mockDelayMs?: number;
}

export async function readPhoto(image: Blob, options: ReadOptions = {}): Promise<OcrResult> {
  const { signal, timeoutMs = OCR_TIMEOUT_MS, fetchImpl = fetch, mock = mockScenario(), mockDelayMs = 1200 } = options;
  if (signal?.aborted) throw new OcrCancelled();

  if (mock) {
    await wait(mockDelayMs, signal);
    if (mock === "busy" || mock === "failed") throw new OcrError(mock);
    if (mock === "empty") return { text: "", confidence: 0 };
    if (mock === "low") return { text: MOCK_TEXT, confidence: 42 };
    return { text: MOCK_TEXT, confidence: 91 };
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const form = new FormData();
    form.append("image", image, "photo.jpg");
    const res = await fetchImpl(OCR_ENDPOINT, { method: "POST", body: form, signal: controller.signal });
    if (!res.ok) throw new OcrError(await codeFromResponse(res));

    let body: { text?: unknown; confidence?: unknown };
    try {
      body = await res.json();
    } catch (e) {
      if (controller.signal.aborted) throw e;
      throw new OcrError("failed");
    }
    if (typeof body?.text !== "string") throw new OcrError("failed");
    const c = body.confidence;
    return {
      text: body.text.slice(0, MAX_TEXT_CHARS),
      confidence: typeof c === "number" && Number.isFinite(c) ? c : undefined,
    };
  } catch (e) {
    if (e instanceof OcrError) throw e;
    if (signal?.aborted) throw new OcrCancelled();
    if (timedOut) throw new OcrError("timeout");
    throw new OcrError("network");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}