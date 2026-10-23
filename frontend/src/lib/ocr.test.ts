import { describe, expect, it } from "vitest";
import { fitWithin, imageMimeType, interpretOcr, MAX_IMAGE_BYTES, prepareImage, validateImage } from "./ocr";

describe("validateImage", () => {
  it("accepts JPEG, PNG and WebP", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validateImage({ type, size: 1000 })).toEqual({ ok: true });
    }
  });

  it("rejects other types", () => {
    expect(validateImage({ type: "application/pdf", size: 1000 })).toEqual({ ok: false, problem: "type" });
    expect(validateImage({ type: "image/gif", size: 1000 })).toEqual({ ok: false, problem: "type" });
  });

  it("recognizes desktop files with missing or generic MIME types by extension", () => {
    expect(imageMimeType({ type: "", name: "document.jpg" })).toBe("image/jpeg");
    expect(imageMimeType({ type: "application/octet-stream", name: "document.png" })).toBe("image/png");
    expect(validateImage({ type: "", name: "document.webp", size: 1000 })).toEqual({ ok: true });
    expect(imageMimeType({ type: "image/heic", name: "document.jpg" })).toBeNull();
  });

  it("sets the image MIME type from the filename when image conversion is unavailable", async () => {
    const file = Object.assign(new Blob(["image data"]), { name: "document.png" });
    expect((await prepareImage(file)).type).toBe("image/png");
  });

  it("accepts large source photos up to 30 MB for client-side compression", () => {
    expect(validateImage({ type: "image/jpeg", size: MAX_IMAGE_BYTES })).toEqual({ ok: true });
    expect(validateImage({ type: "image/jpeg", size: MAX_IMAGE_BYTES + 1 })).toEqual({ ok: false, problem: "size" });
  });
});

describe("fitWithin", () => {
  it("scales a big photo down and keeps the shape", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("never scales up", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("never returns zero", () => {
    expect(fitWithin(10000, 1, 100).height).toBe(1);
  });
});

describe("interpretOcr", () => {
  const long = "This is a notice about a barangay clearance.";

  it("treats very short text as empty", () => {
    expect(interpretOcr("  hi \n", 95)).toEqual({ status: "empty", text: "" });
    expect(interpretOcr("", 95)).toEqual({ status: "empty", text: "" });
  });

  it("marks low confidence", () => {
    expect(interpretOcr(long, 40).status).toBe("low");
  });

  it("trusts good confidence", () => {
    expect(interpretOcr(long, 90).status).toBe("ok");
  });

  it("treats a missing confidence as fine", () => {
    expect(interpretOcr(long, undefined).status).toBe("ok");
    expect(interpretOcr(long, null).status).toBe("ok");
  });

  it("tidies spaces and blank lines", () => {
    const out = interpretOcr("Line one   \r\n\r\n\r\n\r\nLine two is here", 90);
    expect(out.text).toBe("Line one\n\nLine two is here");
  });
});