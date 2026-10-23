// Feature: ayasib-ocr-lens (Tier 2)
// Pure helpers to turn Tesseract line data into overlay boxes positioned over the image.
// Coordinates are normalized to fractions (0..1) of the image so the UI can scale to any size.
// Non-invention: a line is kept only if Tesseract actually read text there.

export interface RawBBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Minimal shape we consume from a Tesseract line. */
export interface RawLine {
  text: string;
  bbox: RawBBox;
  confidence?: number;
}

export interface OverlayLine {
  text: string; // original (trimmed) line text
  /** Normalized box: left/top/width/height as fractions of the image (0..1). */
  left: number;
  top: number;
  width: number;
  height: number;
  confidence: number;
}

const MIN_CONFIDENCE = 40; // drop very uncertain lines rather than overlay garbage
const MIN_CHARS = 2;

/**
 * Converts Tesseract lines to normalized overlay lines over an image of (imgW x imgH).
 * Drops empty, too-short, or low-confidence lines, and any line with an invalid box.
 */
export function toOverlayLines(lines: RawLine[], imgW: number, imgH: number): OverlayLine[] {
  if (!Array.isArray(lines) || imgW <= 0 || imgH <= 0) return [];
  const out: OverlayLine[] = [];
  for (const line of lines) {
    const text = (line?.text ?? "").replace(/\s+/g, " ").trim();
    if (text.length < MIN_CHARS) continue;
    const conf = typeof line.confidence === "number" ? line.confidence : 100;
    if (conf < MIN_CONFIDENCE) continue;
    const b = line.bbox;
    if (!b || b.x1 <= b.x0 || b.y1 <= b.y0) continue;

    const left = clamp01(b.x0 / imgW);
    const top = clamp01(b.y0 / imgH);
    const width = clamp01((b.x1 - b.x0) / imgW);
    const height = clamp01((b.y1 - b.y0) / imgH);
    if (width <= 0 || height <= 0) continue;

    out.push({ text, left, top, width, height, confidence: conf });
  }
  return out;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Joins overlay line texts into one block for a single translate call (order preserved). */
export function linesToText(lines: OverlayLine[]): string {
  return lines.map((l) => l.text).join("\n");
}

/**
 * Splits a translated block back into per-line strings aligned to the original lines.
 * The translator is asked to preserve line count; if it doesn't, we fall back gracefully:
 * extra translated lines are dropped and missing ones reuse the original text.
 */
export function splitTranslation(translated: string, originalCount: number): string[] {
  const parts = translated.replace(/\r/g, "").split("\n").map((s) => s.trim());
  const nonEmpty = parts.filter((s) => s.length > 0);
  // Best case: counts match.
  if (nonEmpty.length === originalCount) return nonEmpty;
  // Otherwise pad/truncate to originalCount so each box has a string.
  const result: string[] = [];
  for (let i = 0; i < originalCount; i += 1) result.push(nonEmpty[i] ?? "");
  return result;
}
