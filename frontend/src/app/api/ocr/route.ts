import { apiError, clientIp, rateLimit } from "@/lib/http";
import { ALLOWED_IMAGE_TYPES } from "@/lib/ocr";
import { OcrServerError, readImage } from "@/lib/ocrServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30; // seconds; vision models can be slow on a cold start

// Biggest upload we accept. Matches MAX_UPLOAD_BYTES on the client (the client shrinks photos before sending).
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request) {
  if (!rateLimit(`ocr:${clientIp(req)}`)) return apiError("rate_limited", "Too many requests");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError("invalid_request", "Body must be multipart form data with an image field");
  }

  const image = form.get("image");
  if (!(image instanceof Blob)) return apiError("invalid_request", "An image file is required");
  if (image.size === 0) return apiError("invalid_request", "The image file is empty");
  if (image.size > MAX_UPLOAD_BYTES) return apiError("payload_too_large", "The image is larger than 4 MB");
  if (image.type && !ALLOWED_IMAGE_TYPES.includes(image.type)) {
    return apiError("unsupported_media_type", "Use a JPG, PNG or WebP image");
  }

  try {
    const bytes = new Uint8Array(await image.arrayBuffer());
    const { text, confidence } = await readImage(bytes, image.type || "image/jpeg");
    return Response.json({ text, confidence });
  } catch (e) {
    console.error("[api/ocr]", e instanceof Error ? e.message : "unknown error");
    if (e instanceof OcrServerError && e.status === 429) return apiError("rate_limited", "The OCR service is busy");
    if (e instanceof OcrServerError && e.status === 413) return apiError("payload_too_large", "The image is too large");
    return apiError("upstream_error", "The OCR service failed");
  }
}
