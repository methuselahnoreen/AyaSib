// Helpers for photos of documents: checks, shrinking, and cleaning up the text that comes back.
// The text itself is read on the server. See docs/OCR-API.md and ocrClient.ts.

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // biggest photo we accept from the user
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // biggest file we send (the server refuses more)
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.8;
const MIN_TEXT_LENGTH = 15;
const LOW_CONFIDENCE = 60;

export type ImageProblem = "type" | "size";

export function validateImage(file: { type: string; size: number }): { ok: true } | { ok: false; problem: ImageProblem } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return { ok: false, problem: "type" };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, problem: "size" };
  return { ok: true };
}

/** Scales (width, height) down so the longer side is at most `max`. Never scales up. */
export function fitWithin(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * Shrinks a big phone photo and saves it as JPEG, so the upload stays small on slow networks.
 * Falls back to the original file if the browser cannot do it.
 */
export async function prepareImage(file: Blob, maxSide = MAX_SIDE): Promise<Blob> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#ffffff"; // JPEG has no transparency
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", JPEG_QUALITY));
  } catch {
    return file;
  }
}

export type OcrVerdict = { status: "ok" | "low" | "empty"; text: string };

/** Cleans the text from the server and says whether it can be trusted. A missing confidence counts as fine. */
export function interpretOcr(text: string, confidence?: number | null): OcrVerdict {
  const cleaned = text
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (cleaned.length < MIN_TEXT_LENGTH) return { status: "empty", text: "" };
  return { status: typeof confidence === "number" && confidence < LOW_CONFIDENCE ? "low" : "ok", text: cleaned };
}