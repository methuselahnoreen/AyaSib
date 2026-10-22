import { describe, expect, it, vi } from "vitest";
import { MAX_TEXT_CHARS, OcrCancelled, OcrError, readPhoto } from "./ocrClient";

const image = new Blob(["fake image bytes"], { type: "image/jpeg" });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const fetchReturning = (res: Response | (() => Response)) =>
  vi.fn().mockImplementation(async () => (typeof res === "function" ? res() : res)) as unknown as typeof fetch;

/** A fetch that never answers, but stops when it is cancelled. */
const hangingFetch = (() =>
  vi.fn().mockImplementation(
    (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      }),
  )) as unknown as () => typeof fetch;

async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (e) {
    if (e instanceof OcrError) return e.code;
    throw e;
  }
  return "no error";
}

describe("readPhoto (real server)", () => {
  it("posts the image as multipart form data to /api/ocr", async () => {
    const f = fetchReturning(json({ text: "Hello notice", confidence: 87 }));
    const result = await readPhoto(image, { fetchImpl: f, mock: null });
    expect(result).toEqual({ text: "Hello notice", confidence: 87 });
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/ocr");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("image")).toBeInstanceOf(Blob);
  });

  it("allows a missing confidence", async () => {
    const result = await readPhoto(image, { fetchImpl: fetchReturning(json({ text: "abc" })), mock: null });
    expect(result.confidence).toBeUndefined();
  });

  it("cuts text longer than the limit", async () => {
    const long = "a".repeat(MAX_TEXT_CHARS + 500);
    const result = await readPhoto(image, { fetchImpl: fetchReturning(json({ text: long })), mock: null });
    expect(result.text).toHaveLength(MAX_TEXT_CHARS);
  });

  it("uses the error code from the server", async () => {
    const f = fetchReturning(json({ error: { code: "busy", message: "x" } }, 500));
    expect(await codeOf(readPhoto(image, { fetchImpl: f, mock: null }))).toBe("busy");
  });

  it("falls back to the status number when there is no usable body", async () => {
    const status = async (n: number) => codeOf(readPhoto(image, { fetchImpl: fetchReturning(() => new Response("oops", { status: n })), mock: null }));
    expect(await status(400)).toBe("bad_request");
    expect(await status(413)).toBe("too_large");
    expect(await status(429)).toBe("busy");
    expect(await status(500)).toBe("failed");
    expect(await status(503)).toBe("failed");
  });

  it("fails when the reply is not valid JSON or has no text", async () => {
    expect(await codeOf(readPhoto(image, { fetchImpl: fetchReturning(new Response("not json")), mock: null }))).toBe("failed");
    expect(await codeOf(readPhoto(image, { fetchImpl: fetchReturning(json({ nothing: 1 })), mock: null }))).toBe("failed");
  });

  it("reports a network failure", async () => {
    const f = vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) as unknown as typeof fetch;
    expect(await codeOf(readPhoto(image, { fetchImpl: f, mock: null }))).toBe("network");
  });

  it("reports a timeout", async () => {
    expect(await codeOf(readPhoto(image, { fetchImpl: hangingFetch(), mock: null, timeoutMs: 20 }))).toBe("timeout");
  });

  it("can be cancelled by the user", async () => {
    const controller = new AbortController();
    const promise = readPhoto(image, { fetchImpl: hangingFetch(), mock: null, signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(OcrCancelled);
  });

  it("does nothing if already cancelled", async () => {
    const f = fetchReturning(json({ text: "x" }));
    const controller = new AbortController();
    controller.abort();
    await expect(readPhoto(image, { fetchImpl: f, mock: null, signal: controller.signal })).rejects.toBeInstanceOf(OcrCancelled);
    expect(f).not.toHaveBeenCalled();
  });
});

describe("readPhoto (mock mode)", () => {
  const f = fetchReturning(json({ text: "should not be used" }));

  it("returns canned text without calling the server", async () => {
    const result = await readPhoto(image, { fetchImpl: f, mock: "success", mockDelayMs: 0 });
    expect(result.text).toContain("Barangay Clearance");
    expect(result.confidence).toBeGreaterThanOrEqual(60);
    expect(f).not.toHaveBeenCalled();
  });

  it("can pretend to be low confidence, empty, busy or failed", async () => {
    expect((await readPhoto(image, { mock: "low", mockDelayMs: 0 })).confidence).toBeLessThan(60);
    expect((await readPhoto(image, { mock: "empty", mockDelayMs: 0 })).text).toBe("");
    expect(await codeOf(readPhoto(image, { mock: "busy", mockDelayMs: 0 }))).toBe("busy");
    expect(await codeOf(readPhoto(image, { mock: "failed", mockDelayMs: 0 }))).toBe("failed");
  });

  it("can be cancelled while waiting", async () => {
    const controller = new AbortController();
    const promise = readPhoto(image, { mock: "success", mockDelayMs: 5000, signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(OcrCancelled);
  });
});