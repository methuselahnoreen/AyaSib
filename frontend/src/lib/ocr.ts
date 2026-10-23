// Helpers for photos of documents: checks, shrinking, and cleaning up the text that comes back.
// The text itself is read on the server. See docs/OCR-API.md and ocrClient.ts.

export const MAX_IMAGE_BYTES = 30 * 1024 * 1024; // source images are compressed before upload
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // biggest file we send (the server refuses more)
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.8;
const MIN_TEXT_LENGTH = 15;
const LOW_CONFIDENCE = 60;

export type ImageProblem = "type" | "size";

export function imageMimeType(file: { type: string; name?: string }): string | null {
  const type = file.type.toLowerCase().split(";")[0].trim();
  if (type === "image/jpg" || type === "image/pjpeg") return "image/jpeg";
  if (ALLOWED_IMAGE_TYPES.includes(type)) return type;
  if (type && type !== "application/octet-stream") return null;

  const extension = file.name?.toLowerCase().match(/\.([^.]+)$/)?.[1];
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return null;
}

export function validateImage(file: { type: string; size: number; name?: string }): { ok: true } | { ok: false; problem: ImageProblem } {
  if (!imageMimeType(file)) return { ok: false, problem: "type" };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, problem: "size" };
  return { ok: true };
}

/** Scales (width, height) down so the longer side is at most `max`. Never scales up. */
export function fitWithin(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

async function loadImage(file: Blob): Promise<{ image: CanvasImageSource; width: number; height: number; cleanup: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { image: bitmap, width: bitmap.width, height: bitmap.height, cleanup: () => bitmap.close() };
    } catch {
      // Fall back to HTMLImageElement for browsers that cannot decode this image with createImageBitmap.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return {
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      cleanup: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the image"))), "image/jpeg", quality);
  });
}

/** Resizes and compresses large photos before upload, including browsers without createImageBitmap. */
export async function prepareImage(file: Blob, maxSide = MAX_SIDE): Promise<Blob> {
  const source = file as Blob & { name?: string };
  const fallback = () => {
    const type = imageMimeType(source);
    return type && file.type !== type ? new Blob([file], { type }) : file;
  };
  if (typeof document === "undefined") return fallback();
  let decoded: Awaited<ReturnType<typeof loadImage>> | undefined;
  try {
    decoded = await loadImage(file);
    let best: Blob | null = null;
    for (const scale of [1, 0.8, 0.64, 0.5]) {
      const { width, height } = fitWithin(decoded.width, decoded.height, Math.max(1, Math.floor(maxSide * scale)));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return best ?? fallback();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(decoded.image, 0, 0, width, height);
      const blob = await canvasBlob(canvas, JPEG_QUALITY);
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= MAX_UPLOAD_BYTES) return blob;
    }
    return best ?? fallback();
  } catch {
    return fallback();
  } finally {
    decoded?.cleanup();
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