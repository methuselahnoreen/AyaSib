// Server-side OCR. Reads text from a document photo using Cloudflare Workers AI (vision model).
// Keys are read from the environment and never leave the server. Only this file knows about the provider.

export class OcrServerError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 25_000;

// Open-weights vision model on Workers AI: Mistral Small 3.1 (Apache 2.0, no base-model licence tail).
// Override with OCR_MODEL to use any other Workers AI vision model that takes the chat `messages` format.
const DEFAULT_MODEL = "@cf/mistralai/mistral-small-3.1-24b-instruct";

const OCR_PROMPT =
  "Transcribe all visible text from this document image exactly as written, preserving line breaks and order. " +
  "Do not translate, summarize, explain, or add any commentary. If there is no readable text, reply with nothing.";

export interface OcrReadResult {
  text: string;
  /** 0 to 100. Omitted when the model gives no score (chat vision models do not). */
  confidence?: number;
}

function toDataUrl(image: Uint8Array, mime: string): string {
  const base64 = Buffer.from(image).toString("base64");
  return `data:${mime};base64,${base64}`;
}

/**
 * Sends the image to Cloudflare Workers AI and returns the transcribed text.
 * Requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in the environment.
 */
export async function readImage(image: Uint8Array, mime = "image/jpeg"): Promise<OcrReadResult> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) throw new OcrServerError("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set");

  const model = process.env.OCR_MODEL || DEFAULT_MODEL;
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      // Chat vision format: a text instruction plus the image as a data URL.
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: OCR_PROMPT },
              { type: "image_url", image_url: { url: toDataUrl(image, mime) } },
            ],
          },
        ],
        max_tokens: 1024,
        temperature: 0,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      // Surface the status so the route can map it (429 -> busy, 413 -> too large, etc.).
      throw new OcrServerError(`Workers AI request failed with status ${res.status}`, res.status);
    }

    const data = (await res.json()) as { result?: { response?: unknown } };
    const raw = data?.result?.response;
    if (typeof raw !== "string") throw new OcrServerError("Workers AI returned no text");
    return { text: raw };
  } catch (e) {
    if (e instanceof OcrServerError) throw e;
    if (e instanceof Error && e.name === "AbortError") throw new OcrServerError("OCR request timed out");
    throw new OcrServerError("OCR request failed");
  } finally {
    clearTimeout(timer);
  }
}
