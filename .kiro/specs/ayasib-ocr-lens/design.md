# Design — Basaha OCR "Lens" (Tier 1)

## Overview

A live scan-and-translate flow for the OCR tab (`/basaha`): the user captures a photo with the
camera or picks one from the gallery; the app shows a **scanning animation**, reads the text
(existing `/api/ocr`), **translates it to Cebuano** (existing `/api/translate`), and shows the
result as a **Bisaya overlay panel over a blurred version of the image**.

This is **Tier 1**: the translation is shown as a clean overlay band/panel, NOT positioned
word-by-word over the original text. True in-place per-phrase overlay (Tier 2) needs an OCR
engine that returns bounding boxes (Tesseract.js) and is deferred.

## Constraints honored
- **Additive.** New component + strings; reuses existing OCR/translate pipelines and contracts.
- **No new infra / no new secret.** Uses the existing Cloudflare Workers AI OCR and the
  existing translate route. Camera needs HTTPS (already live on Vercel).
- **Non-invention.** Translation is a faithful transform of *extracted* text. If OCR finds no
  text, we say so — we never invent text or a translation.
- **Privacy.** The photo is sent to the server only to read text (same as today); nothing is stored.

## Flow / states

```
idle ──(capture | upload)──▶ captured(image)
captured ──▶ scanning (CSS line animation over the image)
scanning ──(OCR ok, text found)──▶ translating ──▶ result(blurred image + Bisaya panel)
scanning ──(OCR empty)──▶ error("no text")        (retry)
scanning ──(OCR error)──▶ error(mapped message)   (retry, unless bad_request/too_large)
result ──(reset)──▶ idle
```

## Reuse (no changes to these)
- `lib/ocr.ts`: `validateImage`, `prepareImage`, `interpretOcr`, size limits.
- `lib/ocrClient.ts`: `readPhoto()` → `/api/ocr` (text + confidence).
- `lib/client.ts`: `translateText(text, "en", "ceb")` → `/api/translate`.
  Source language is unknown in practice; we translate **to** Cebuano and let the model handle
  mixed English/Filipino source (its prompt already supports all three). Default `from = "en"`.

## New: `components/PhotoLens.tsx` (client)
- Camera input (`capture="environment"`) + gallery input (same accept types as today).
- Shows the captured image full-width; overlays the scanning line during `scanning`.
- On OCR success: calls translate, then renders the **blurred image** with a scrollable
  Bisaya panel on top, plus a toggle to view the **original extracted text**.
- Reuses the Cebuano error mapping and retry logic from the current PhotoReader.
- Accessible: `aria-live` status, labelled buttons ≥44px, scanning animation respects
  `prefers-reduced-motion` (no motion → static tint, same states).

## New strings (in `photoStrings.ts`, additive)
`scanning`, `translating`, `resultTitle`, `showOriginal`, `hideOriginal`, `again`, `overlayNote`.

## CSS (globals.css, additive)
`.lens-stage` (image container), `.lens-img`, `.lens-scan` (animated line via keyframes
`lens-sweep`), `.lens-img.blurred`, `.lens-overlay` (translated panel), reduced-motion block.

## Route
`app/basaha/page.tsx` renders `PhotoLens` (keeps the Shell + tab bar). The old `PhotoReader`
stays in the tree, unused, as a reference/fallback.

## Testing
- Reuse existing `ocr.test.ts` / `ocrClient.test.ts` (unchanged).
- Manual: capture + gallery on a phone over the live HTTPS URL; empty/too-large/busy paths;
  reduced-motion; translation shows Bisaya.

## Tier 2 (IMPLEMENTED)
Added `tesseract.js` v5 (in-browser OCR, returns per-line bounding boxes, MIT, no new secret).
- `lib/tesseractClient.ts` — lazy `import("tesseract.js")` (heavy core/model load only on first scan;
  fetched from CDN at runtime, nothing extra to host). The only file importing tesseract.js.
- `lib/lensOverlay.ts` (pure, tested) — normalizes line boxes to 0..1 fractions; drops empty/
  short/low-confidence/invalid lines; joins lines for one translate call; realigns the translated
  block back to per-line strings.
- `PhotoLens` tries the **overlay path first** (Tesseract -> per-line translate -> positioned
  boxes over the blurred image). If it finds no usable lines (or errors), it **falls back
  automatically to the Tier 1 cloud panel**, so the user never gets a worse result than Tier 1.
- A view toggle (Hubad sa litrato / Lista nga hubad) appears only when overlays exist.

Known limits (inherent to free in-browser OCR): English-trained model, weaker on handwriting/
low light/skew; alignment is approximate. Non-invention holds: a box is shown only where
Tesseract actually read text.
