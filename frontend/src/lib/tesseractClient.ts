"use client";

// Feature: ayasib-ocr-lens (Tier 2)
// Thin, lazy wrapper around tesseract.js (in-browser OCR, MIT, no secret). This is the ONLY file
// that imports tesseract.js, and it is imported dynamically so the ~2-4 MB core/model download
// happens only when the user actually scans — never on first page load.
import type { RawLine } from "./lensOverlay";

export interface TesseractResult {
  lines: RawLine[];
  width: number;
  height: number;
}

// Hard cap: if in-browser OCR (incl. the first-time model download) does not finish in time,
// we give up and let the caller fall back to the cloud panel — never freeze the UI.
const OCR_TIMEOUT_MS = 25_000;

export class TesseractTimeout extends Error {
  constructor() {
    super("in-browser OCR timed out");
  }
}

/**
 * Recognizes printed text in an image blob and returns line boxes + the image's natural size.
 * English model (default); good for printed forms/clearances. Throws on failure OR timeout so the
 * caller can fall back to the Tier 1 cloud panel. Requests line-level output explicitly (v5 omits
 * detailed blocks/lines by default).
 */
export async function recognizeLines(image: Blob, onProgress?: (p: number) => void): Promise<TesseractResult> {
  // Race the ENTIRE operation (worker creation + first-run model download + recognize) against a
  // single timeout, so a stalled CDN download or hung worker can never freeze the UI.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TesseractTimeout()), OCR_TIMEOUT_MS);
  });

  const work = (async (): Promise<TesseractResult> => {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng", undefined, {
      logger: (m: { status?: string; progress?: number }) => {
        if (onProgress && typeof m.progress === "number" && m.status === "recognizing text") {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });
    try {
      // v5 returns detailed `lines`/`blocks` only when asked via the recognize output options.
      const { data } = await worker.recognize(image, {}, { blocks: true });
      const lines: RawLine[] = (data.lines ?? []).map((l) => ({
        text: l.text ?? "",
        bbox: { x0: l.bbox.x0, y0: l.bbox.y0, x1: l.bbox.x1, y1: l.bbox.y1 },
        confidence: l.confidence,
      }));
      const width = (data as { imageWidth?: number }).imageWidth ?? inferSize(lines, "x");
      const height = (data as { imageHeight?: number }).imageHeight ?? inferSize(lines, "y");
      return { lines, width, height };
    } finally {
      worker.terminate().catch(() => {});
    }
  })();

  try {
    return await Promise.race([work, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Fallback: estimate image size from the largest line box edge, if the result lacks dimensions. */
function inferSize(lines: RawLine[], axis: "x" | "y"): number {
  let max = 0;
  for (const l of lines) max = Math.max(max, axis === "x" ? l.bbox.x1 : l.bbox.y1);
  return max || 1;
}
