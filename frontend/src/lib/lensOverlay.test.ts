import { describe, expect, it } from "vitest";
import { linesToText, pairByMarker, splitTranslation, toOverlayLines, type RawLine } from "./lensOverlay";

describe("lensOverlay.toOverlayLines", () => {
  const img = { w: 1000, h: 500 };

  it("normalizes boxes to fractions of the image", () => {
    const lines: RawLine[] = [{ text: "Barangay Clearance", bbox: { x0: 100, y0: 50, x1: 600, y1: 100 }, confidence: 90 }];
    const [o] = toOverlayLines(lines, img.w, img.h);
    expect(o.left).toBeCloseTo(0.1);
    expect(o.top).toBeCloseTo(0.1);
    expect(o.width).toBeCloseTo(0.5);
    expect(o.height).toBeCloseTo(0.1);
    expect(o.text).toBe("Barangay Clearance");
  });

  it("drops empty, too-short, low-confidence, and invalid-box lines", () => {
    const lines: RawLine[] = [
      { text: "  ", bbox: { x0: 0, y0: 0, x1: 10, y1: 10 }, confidence: 99 }, // empty
      { text: "x", bbox: { x0: 0, y0: 0, x1: 10, y1: 10 }, confidence: 99 }, // too short
      { text: "low conf", bbox: { x0: 0, y0: 0, x1: 10, y1: 10 }, confidence: 10 }, // low conf
      { text: "bad box", bbox: { x0: 50, y0: 50, x1: 40, y1: 40 }, confidence: 99 }, // x1<x0
      { text: "keep me", bbox: { x0: 0, y0: 0, x1: 100, y1: 40 }, confidence: 80 },
    ];
    const out = toOverlayLines(lines, img.w, img.h);
    expect(out.map((o) => o.text)).toEqual(["keep me"]);
  });

  it("returns [] for invalid image dimensions", () => {
    expect(toOverlayLines([{ text: "hi there", bbox: { x0: 0, y0: 0, x1: 10, y1: 10 } }], 0, 0)).toEqual([]);
  });

  it("clamps boxes that exceed the image bounds to 0..1", () => {
    const lines: RawLine[] = [{ text: "overflow line", bbox: { x0: -20, y0: -10, x1: 2000, y1: 1000 }, confidence: 90 }];
    const [o] = toOverlayLines(lines, img.w, img.h);
    expect(o.left).toBe(0);
    expect(o.top).toBe(0);
    expect(o.width).toBe(1);
    expect(o.height).toBe(1);
  });
});

describe("lensOverlay translation alignment", () => {
  it("linesToText joins in order", () => {
    const lines = toOverlayLines(
      [
        { text: "Line one", bbox: { x0: 0, y0: 0, x1: 100, y1: 20 }, confidence: 90 },
        { text: "Line two", bbox: { x0: 0, y0: 30, x1: 100, y1: 50 }, confidence: 90 },
      ],
      200,
      200,
    );
    expect(linesToText(lines)).toBe("Line one\nLine two");
  });

  it("splitTranslation aligns to the original count", () => {
    expect(splitTranslation("Usa\nDuha", 2)).toEqual(["Usa", "Duha"]);
    // too few -> pad with empty
    expect(splitTranslation("Usa", 2)).toEqual(["Usa", ""]);
    // too many -> truncate
    expect(splitTranslation("Usa\nDuha\nTulo", 2)).toEqual(["Usa", "Duha"]);
    // blank lines ignored
    expect(splitTranslation("Usa\n\n\nDuha", 2)).toEqual(["Usa", "Duha"]);
  });
});

describe("lensOverlay.pairByMarker", () => {
  const orig = ["LAST NAME", "FIRST NAME", "MIDDLE NAME"];

  it("pairs each original line with its marked translation", () => {
    const translated = "#1# Apelyido\n#2# Pangalan\n#3# Tunga nga ngalan";
    expect(pairByMarker(orig, translated)).toEqual([
      { orig: "LAST NAME", ceb: "Apelyido" },
      { orig: "FIRST NAME", ceb: "Pangalan" },
      { orig: "MIDDLE NAME", ceb: "Tunga nga ngalan" },
    ]);
  });

  it("tolerates whitespace inside and around markers and reflowed lines", () => {
    const translated = "# 1 # Apelyido # 2 #  Pangalan\n#3#\nTunga nga ngalan";
    expect(pairByMarker(orig, translated)).toEqual([
      { orig: "LAST NAME", ceb: "Apelyido" },
      { orig: "FIRST NAME", ceb: "Pangalan" },
      { orig: "MIDDLE NAME", ceb: "Tunga nga ngalan" },
    ]);
  });

  it("leaves a line's Bisaya empty when its marker is missing (partial result still aligns)", () => {
    const translated = "#1# Apelyido\n#3# Tunga nga ngalan";
    expect(pairByMarker(orig, translated)).toEqual([
      { orig: "LAST NAME", ceb: "Apelyido" },
      { orig: "FIRST NAME", ceb: "" },
      { orig: "MIDDLE NAME", ceb: "Tunga nga ngalan" },
    ]);
  });

  it("handles markers returned out of order", () => {
    const translated = "#2# Pangalan\n#1# Apelyido\n#3# Tunga nga ngalan";
    expect(pairByMarker(orig, translated).map((p) => p.ceb)).toEqual(["Apelyido", "Pangalan", "Tunga nga ngalan"]);
  });
});
