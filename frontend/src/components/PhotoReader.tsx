"use client";

import { useEffect, useRef, useState } from "react";
import { interpretOcr, MAX_UPLOAD_BYTES, prepareImage, validateImage } from "@/lib/ocr";
import { OcrCancelled, OcrError, readPhoto, type OcrErrorCode } from "@/lib/ocrClient";
import { photoText as p } from "@/lib/photoString";
import styles from "./PhotoReader.module.css";

type Message = { kind: "info" | "error"; text: string } | null;

const errorText: Record<OcrErrorCode, string> = {
  bad_request: p.errorType,
  too_large: p.errorSize,
  busy: p.errorBusy,
  failed: p.errorGeneric,
  network: p.errorNetwork,
  timeout: p.errorTimeout,
};
// Trying the same photo again cannot fix these two.
const NO_RETRY: OcrErrorCode[] = ["bad_request", "too_large"];

/** Lets the user photograph or pick a document, has the server read the text, and hands it to `onText`. */
export function PhotoReader({ onText }: { onText: (text: string) => void }) {
  const [reading, setReading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [canRetry, setCanRetry] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastImage = useRef<Blob | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Stop any running request when the page closes, and free the preview image.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function send(image: Blob) {
    setMessage(null);
    setCanRetry(false);
    setReading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const { text, confidence } = await readPhoto(image, { signal: controller.signal });
      const verdict = interpretOcr(text, confidence);
      if (verdict.status === "empty") {
        setMessage({ kind: "error", text: p.empty });
      } else {
        onText(verdict.text);
        setMessage({ kind: verdict.status === "low" ? "error" : "info", text: verdict.status === "low" ? p.low : p.done });
      }
    } catch (e) {
      if (!(e instanceof OcrCancelled)) {
        const code: OcrErrorCode = e instanceof OcrError ? e.code : "failed";
        setMessage({ kind: "error", text: errorText[code] });
        setCanRetry(!NO_RETRY.includes(code));
      }
    } finally {
      setReading(false);
      abortRef.current = null;
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file || reading) return;
    const check = validateImage(file);
    if (!check.ok) {
      setMessage({ kind: "error", text: check.problem === "type" ? p.errorType : p.errorSize });
      setCanRetry(false);
      return;
    }

    setPreview(URL.createObjectURL(file));
    setMessage(null);
    setReading(true); // also covers the short time spent shrinking the photo
    const image = await prepareImage(file);
    if (image.size > MAX_UPLOAD_BYTES) {
      setReading(false);
      setMessage({ kind: "error", text: p.errorSize });
      setCanRetry(false);
      return;
    }
    lastImage.current = image;
    await send(image);
  }

  function pick(ref: React.RefObject<HTMLInputElement | null>) {
    if (ref.current) {
      ref.current.value = ""; // lets the same photo be chosen again
      ref.current.click();
    }
  }

  return (
    <section className={styles.box} aria-label={p.title}>
      <strong>{p.title}</strong>
      <p className="small muted" style={{ margin: 0 }}>
        {p.privacy}
      </p>

      <div className={styles.actions}>
        <button type="button" className="btn secondary" onClick={() => pick(cameraRef)} disabled={reading}>
          {p.camera}
        </button>
        <button type="button" className="btn secondary" onClick={() => pick(galleryRef)} disabled={reading}>
          {p.gallery}
        </button>
        <input ref={cameraRef} className={styles.hidden} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => handleFile(e.target.files?.[0])} />
        <input ref={galleryRef} className={styles.hidden} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>

      {preview && (
        <div className={styles.preview}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.thumb} src={preview} alt={p.previewAlt} />
          {!reading && (
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setPreview(null);
                setMessage(null);
                setCanRetry(false);
                lastImage.current = null;
              }}
            >
              {p.remove}
            </button>
          )}
        </div>
      )}

      {reading && (
        <div aria-live="polite">
          <div>{p.reading}</div>
          <progress className={styles.progress} aria-label={p.reading} />
          <button type="button" className="btn secondary" onClick={() => abortRef.current?.abort()}>
            {p.cancel}
          </button>
        </div>
      )}

      {message && (
        <div className={`notice ${message.kind === "error" ? "error" : ""}`} role={message.kind === "error" ? "alert" : "status"}>
          <span className="icon" aria-hidden="true">
            {message.kind === "error" ? "!" : "i"}
          </span>
          <div>{message.text}</div>
        </div>
      )}

      {canRetry && !reading && lastImage.current && (
        <button type="button" className="btn secondary" onClick={() => lastImage.current && send(lastImage.current)}>
          {p.retry}
        </button>
      )}
    </section>
  );
}