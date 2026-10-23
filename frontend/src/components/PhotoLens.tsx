"use client";

// Feature: ayasib-ocr-lens (Tier 1 + Tier 2)
// Capture/upload -> scan -> translate to Bisaya. Two views:
//  - Overlay (Tier 2): Tesseract.js reads per-line boxes in the browser; each line is translated
//    and positioned over a blurred image (live scan-and-overlay).
//  - List/panel (Tier 1): cloud OCR (/api/ocr) + one translation, shown as a panel. Reliable
//    fallback used automatically if the overlay finds no usable text.
// Non-invention: every shown phrase is a translation of text actually read from the image.
import { useCallback, useEffect, useRef, useState } from "react";
import { interpretOcr, MAX_UPLOAD_BYTES, prepareImage, validateImage } from "@/lib/ocr";
import { OcrCancelled, OcrError, readPhoto, type OcrErrorCode } from "@/lib/ocrClient";
import { translateText } from "@/lib/client";
import { linesToText, splitTranslation, toOverlayLines, type OverlayLine } from "@/lib/lensOverlay";
import { recognizeLines } from "@/lib/tesseractClient";
import { photoText as p } from "@/lib/photoStrings";
import { Icon } from "@/components/Icon";

type Phase = "idle" | "scanning" | "translating" | "result" | "error";
type View = "overlay" | "panel";

interface Overlay extends OverlayLine {
  ceb: string;
}

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
  const [status, setStatus] = useState<string>("");
  const [preview, setPreview] = useState<string | null>(null);
  const [view, setView] = useState<View>("overlay");
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [panelText, setPanelText] = useState("");
  const [original, setOriginal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const lastImage = useRef<Blob | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const closeCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }, []);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );
  useEffect(() => {
    const video = videoRef.current;
    if (!cameraOpen || !video || !streamRef.current) return;
    video.srcObject = streamRef.current;
    void video.play().catch(() => {
      setError(p.cameraUnavailable);
      setPhase("error");
      closeCamera();
    });
  }, [cameraOpen, closeCamera]);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Tier 1 cloud path: /api/ocr -> one translation -> panel text. Used as the reliable baseline.
  async function cloudPanel(image: Blob, signal: AbortSignal): Promise<boolean> {
    const { text, confidence } = await readPhoto(image, { signal });
    const verdict = interpretOcr(text, confidence);
    if (verdict.status === "empty") {
      setError(p.empty);
      setCanRetry(true);
      setPhase("error");
      return false;
    }
    setOriginal(verdict.text);
    setPhase("translating");
    setStatus(p.translating);
    const result = await translateText(verdict.text, "en", "ceb");
    setPanelText(result.translation);
    return true;
  }

  // Tier 2 overlay path: Tesseract in-browser boxes -> per-line translate -> positioned overlays.
  // Returns true if it produced usable overlays; false means "fall back to the panel".
  // Runs in the background AFTER the panel is shown. Never touches phase/status (so it can't
  // disturb the visible panel). recognizeLines has its own timeout, so this cannot hang.
  async function overlayPath(image: Blob): Promise<boolean> {
    try {
      const { lines, width, height } = await recognizeLines(image);
      const base = toOverlayLines(lines, width, height);
      if (base.length === 0) return false;

      const joined = linesToText(base);
      const result = await translateText(joined, "en", "ceb");
      const ceb = splitTranslation(result.translation, base.length);
      setOverlays(base.map((b, i) => ({ ...b, ceb: ceb[i] || b.text })));
      return true;
    } catch {
      return false; // any Tesseract/translate failure -> keep the panel
    }
  }

  async function run(image: Blob) {
    setError(null);
    setCanRetry(false);
    setOverlays([]);
    setPanelText("");
    setOriginal("");
    setShowOriginal(false);
    setPhase("scanning");
    setStatus(p.scanning);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      // Panel-first: get the fast, reliable cloud result and show it right away. This is the
      // baseline the user always gets — no long wait, no frozen screen.
      const ok = await cloudPanel(image, controller.signal);
      if (controller.signal.aborted) {
        setPhase("idle");
        return;
      }
      if (!ok) return; // cloudPanel already set the error/empty state
      setView("panel");
      setPhase("result");

      // Overlay as a silent upgrade: try the in-browser box OCR in the background. If it produces
      // usable positioned lines, offer the overlay view. Any stall/failure is swallowed (timeout
      // inside recognizeLines guarantees it can't hang), leaving the working panel in place.
      void overlayPath(image).then((gotOverlay) => {
        if (!controller.signal.aborted && gotOverlay) setView("overlay");
      });
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

  async function openCamera() {
    const isDesktop = window.matchMedia("(pointer: fine)").matches;
    if (!isDesktop || !navigator.mediaDevices?.getUserMedia) {
      pick(cameraRef);
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      setError(null);
      setCameraOpen(true);
    } catch {
      setError(p.cameraUnavailable);
      setPhase("error");
    }
  }

  async function captureCamera() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError(p.cameraUnavailable);
      setPhase("error");
      closeCamera();
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError(p.cameraUnavailable);
      setPhase("error");
      closeCamera();
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      closeCamera();
      if (!blob) {
        setError(p.cameraUnavailable);
        setPhase("error");
        return;
      }
      await handleFile(new File([blob], "webcam-photo.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  }

  function reset() {
    abortRef.current?.abort();
    closeCamera();
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setOverlays([]);
    setPanelText("");
    setOriginal("");
    setError(null);
    setCanRetry(false);
    setShowOriginal(false);
    lastImage.current = null;
    setPhase("idle");
  }

  const busy = phase === "scanning" || phase === "translating";
  const hasOverlay = overlays.length > 0;

  return (
    <section aria-label={p.lensTitle} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p className="muted small" style={{ margin: 0 }}>
        {p.lensIntro}
      </p>

      {cameraOpen && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", borderRadius: 16 }} aria-label={p.cameraPreviewAlt} />
          <button type="button" className="btn" onClick={captureCamera}>
            {p.capture}
          </button>
          <button type="button" className="btn secondary" onClick={closeCamera}>
            {p.cancel}
          </button>
        </div>
      )}

      {preview && (
        <div className="lens-stage">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={`lens-img ${phase === "result" ? "blurred" : ""}`} src={preview} alt={p.previewAlt} />

          {phase === "scanning" && <span className="lens-scan" aria-hidden="true" />}

          {busy && (
            <div className="lens-status" role="status" aria-live="polite">
              <Icon name="scan" size={20} />
              {status}
            </div>
          )}

          {/* Tier 2: positioned translated lines over the blurred image */}
          {phase === "result" && view === "overlay" &&
            overlays.map((o, i) => (
              <span
                key={i}
                className="lens-box"
                style={{ left: `${o.left * 100}%`, top: `${o.top * 100}%`, width: `${o.width * 100}%`, minHeight: `${o.height * 100}%` }}
              >
                {o.ceb}
              </span>
            ))}

          {/* Tier 1: translation panel */}
          {phase === "result" && view === "panel" && (
            <div className="lens-overlay" role="region" aria-label={p.resultTitle}>
              <strong>{p.resultTitle}</strong>
              <p className="lens-translation">{panelText}</p>
              <p className="lens-note small">{p.overlayNote}</p>
            </div>
          )}
        </div>
      )}

      {phase !== "result" && !cameraOpen && (
        <div className="lens-actions">
          <button type="button" className="btn" onClick={openCamera} disabled={busy}>
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
          {/* View toggle: only offer overlay when we actually have positioned lines */}
          {hasOverlay && (
            <div className="filters" role="group" aria-label={p.resultTitle}>
              <button type="button" className="filter-chip" aria-pressed={view === "overlay"} onClick={() => setView("overlay")}>
                {view === "overlay" && <Icon name="check" size={16} />} {p.overlayMode}
              </button>
              <button type="button" className="filter-chip" aria-pressed={view === "panel"} onClick={() => setView("panel")}>
                {view === "panel" && <Icon name="check" size={16} />} {p.panelMode}
              </button>
            </div>
          )}

          <p className="muted small" style={{ margin: 0 }}>
            {p.overlayNote}
          </p>

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
