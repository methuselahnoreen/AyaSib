"use client";

// Feature: ayasib-ocr-lens (Tier 1)
// Google-Lens-style flow: capture/upload -> scanning animation -> OCR -> translate to Bisaya ->
// blurred image with the Bisaya translation overlaid. Reuses the existing OCR + translate
// pipelines unchanged. Translation is a faithful transform of extracted text; nothing invented.
import { useEffect, useRef, useState } from "react";
import { interpretOcr, MAX_UPLOAD_BYTES, prepareImage, validateImage } from "@/lib/ocr";
import { OcrCancelled, OcrError, readPhoto, type OcrErrorCode } from "@/lib/ocrClient";
import { translateText } from "@/lib/client";
import { photoText as p } from "@/lib/photoStrings";
import { Icon } from "@/components/Icon";

type Phase = "idle" | "scanning" | "translating" | "result" | "error";

const errorText: Record<OcrErrorCode, string> = {
  bad_request: p.errorType,
  too_large: p.errorSize,
  busy: p.errorBusy,
  failed: p.errorGeneric,
  network: p.errorNetwork,
  timeout: p.errorTimeout,
};
const NO_RETRY: OcrErrorCode[] = ["bad_request", "too_large"];

export function PhotoLens() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [original, setOriginal] = useState("");
  const [translation, setTranslation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const lastImage = useRef<Blob | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function run(image: Blob) {
    setError(null);
    setCanRetry(false);
    setTranslation("");
    setOriginal("");
    setShowOriginal(false);
    setPhase("scanning");

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const { text, confidence } = await readPhoto(image, { signal: controller.signal });
      const verdict = interpretOcr(text, confidence);
      if (verdict.status === "empty") {
        setError(p.empty);
        setCanRetry(true);
        setPhase("error");
        return;
      }
      setOriginal(verdict.text);

      // Translate the extracted text to Cebuano. Source may be mixed EN/FIL; the model handles it.
      setPhase("translating");
      const result = await translateText(verdict.text, "en", "ceb");
      setTranslation(result.translation);
      setPhase("result");
    } catch (e) {
      if (e instanceof OcrCancelled) {
        setPhase("idle");
        return;
      }
      const code: OcrErrorCode = e instanceof OcrError ? e.code : "failed";
      setError(errorText[code]);
      setCanRetry(!NO_RETRY.includes(code));
      setPhase("error");
    } finally {
      abortRef.current = null;
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file || phase === "scanning" || phase === "translating") return;
    const check = validateImage(file);
    if (!check.ok) {
      setError(check.problem === "type" ? p.errorType : p.errorSize);
      setCanRetry(false);
      setPhase("error");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));

    const image = await prepareImage(file);
    if (image.size > MAX_UPLOAD_BYTES) {
      setError(p.errorSize);
      setCanRetry(false);
      setPhase("error");
      return;
    }
    lastImage.current = image;
    await run(image);
  }

  function pick(ref: React.RefObject<HTMLInputElement | null>) {
    if (ref.current) {
      ref.current.value = "";
      ref.current.click();
    }
  }

  function reset() {
    abortRef.current?.abort();
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setOriginal("");
    setTranslation("");
    setError(null);
    setCanRetry(false);
    setShowOriginal(false);
    lastImage.current = null;
    setPhase("idle");
  }

  const busy = phase === "scanning" || phase === "translating";

  return (
    <section aria-label={p.lensTitle} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p className="muted small" style={{ margin: 0 }}>
        {p.lensIntro}
      </p>

      {/* Stage: the image with scanning line / blur + overlay */}
      {preview && (
        <div className="lens-stage">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={`lens-img ${phase === "result" ? "blurred" : ""}`} src={preview} alt={p.previewAlt} />

          {phase === "scanning" && <span className="lens-scan" aria-hidden="true" />}

          {busy && (
            <div className="lens-status" role="status" aria-live="polite">
              <Icon name="scan" size={20} />
              {phase === "scanning" ? p.scanning : p.translating}
            </div>
          )}

          {phase === "result" && (
            <div className="lens-overlay" role="region" aria-label={p.resultTitle}>
              <strong>{p.resultTitle}</strong>
              <p className="lens-translation">{translation}</p>
              <p className="lens-note small">{p.overlayNote}</p>
            </div>
          )}
        </div>
      )}

      {/* Capture / upload buttons (hidden while busy) */}
      {phase !== "result" && (
        <div className="lens-actions">
          <button type="button" className="btn" onClick={() => pick(cameraRef)} disabled={busy}>
            <Icon name="scan" size={20} /> {p.camera}
          </button>
          <button type="button" className="btn secondary" onClick={() => pick(galleryRef)} disabled={busy}>
            <Icon name="box" size={20} /> {p.gallery}
          </button>
          <input ref={cameraRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => handleFile(e.target.files?.[0])} />
          <input ref={galleryRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleFile(e.target.files?.[0])} />
        </div>
      )}

      {busy && (
        <button type="button" className="btn secondary" onClick={() => abortRef.current?.abort()}>
          {p.cancel}
        </button>
      )}

      {phase === "error" && error && (
        <div className="notice error" role="alert">
          <span className="icon" aria-hidden="true">
            !
          </span>
          <div>{error}</div>
        </div>
      )}

      {phase === "error" && canRetry && lastImage.current && (
        <button type="button" className="btn secondary" onClick={() => lastImage.current && run(lastImage.current)}>
          {p.retry}
        </button>
      )}

      {phase === "result" && (
        <>
          <button type="button" className="btn secondary" onClick={() => setShowOriginal((v) => !v)}>
            {showOriginal ? p.hideOriginal : p.showOriginal}
          </button>
          {showOriginal && (
            <div className="card">
              <div className="card-body">
                <p className="muted small" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                  {original}
                </p>
              </div>
            </div>
          )}
          <button type="button" className="btn" onClick={reset}>
            <Icon name="refresh" size={18} /> {p.again}
          </button>
        </>
      )}
    </section>
  );
}
