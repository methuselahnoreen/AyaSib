# Implementation Plan — AyaSib Frontend Redesign

## Overview

A strictly additive, presentation-layer redesign of the existing Next.js App Router app. New pure logic is limited to a services-directory filter and a `clearStates` store helper; everything else is styling, component composition, and additive strings. No API, KB, AI-routing, or domain-logic changes. The mascot is the existing `logo.svg`, reused as-is — never regenerated.

Implementation language: TypeScript under Vitest. New feature tests tagged `// Feature: ayasib-frontend-redesign`. The regression gate (full Vitest + typecheck + lint + build + KB validation + byte-identical `kb.json`) must stay green.

**Approval gate:** This plan is written for review. Do not start coding until the Spec (requirements + design + tasks) is explicitly approved and the four Open Questions in design.md are answered.

## Tasks

- [x] 1. Design tokens, typography, and base stylesheet
  - [x] 1.1 Rework `globals.css` `:root` to the new palette CSS variables and re-point existing class names (`.btn`, `.card`, `.notice`, `.chip`, `.list`, `.input`, `.shell`, `.bar`) to them; keep mobile-first `.shell` (640px) and the `prefers-reduced-motion` block
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 10.6_
  - [x] 1.2 Wire `next/font` for Inter/DM Sans (body) and a `--font-display` face (licensed Roca Two if provided, else documented fallback) in `layout.tsx`; do not touch the logo image
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 1.3 Restyle Splash/favicon treatment to the tokens; keep behavior and reduced-motion
    - _Requirements: 3.5, 10.6_

- [x] 2. Shared chrome: navigation, language selector, Aya guide
  - [x] 2.1 `TopNav.tsx` — Home / Government Services / How It Works / Ask AyaSib; accessible, aria-current, 44×44, wraps on mobile
    - _Requirements: 4.1, 10.1, 10.2, 10.3_
  - [x] 2.2 `LanguageSelector.tsx` — accessible en/fil/ceb control, scoped per the approved answer to Open Q3 (default: Translate default pair); no faked UI i18n
    - _Requirements: 4.2, 10.3, 9.2_
  - [x] 2.3 `AyaGuide.tsx` — renders the existing logo asset at sizes with an optional Cebuano speech bubble; the ONLY mascot surface; decorative image marked aria-hidden, bubble text real
    - _Requirements: 3.1, 3.2, 3.4_
  - [x] 2.4 Edit `Shell.tsx` to optionally mount `TopNav` + `LanguageSelector`; preserve back-link/logo/sr-only title
    - _Requirements: 4.1, 8.4, 11.1_

- [x] 3. Services directory logic (new pure module) + tests
  - [x] 3.1 `lib/servicesDirectory.ts` — `filterServices(kb, query, category?)` and `deriveCategories(kb)`; reads only existing KB fields; stable order; invents nothing
    - _Requirements: 6.2, 6.4, 11.5_
  - [x] 3.2 `servicesDirectory.test.ts` — unit + fast-check properties (empty query ⇒ all; no-match ⇒ empty; matches only existing fields; categories distinct/derived-only). Tag `// Feature: ayasib-frontend-redesign, Property N`
    - _Requirements: 6.2, 6.3, 6.4, 12.1_

- [x] 4. Government services directory screen
  - [x] 4.1 `ServiceCard.tsx` — KB-sourced card (title = name_ceb||name_en, locality, link to `/andam/{id}`)
    - _Requirements: 6.1, 6.2_
  - [x] 4.2 `ServiceSearch.tsx` + `app/services/page.tsx` — prominent search, accessible category filters, results grid, accessible empty/no-results state; only KB services
    - _Requirements: 6.1, 6.2, 6.3, 10.1, 10.3, 10.5_

- [x] 5. Home page redesign
  - [x] 5.1 Hero: logo, "Andam Na?" display heading, supporting Cebuano line, `AyaGuide` with welcome bubble, optional "Aya sib the day!" secondary; search field "Unsa nga serbisyo ang imong gipangita?" + "Pangutana" as the most prominent action
    - _Requirements: 4.3, 4.4, 4.8, 4.9, 3.4_
  - [x] 5.2 Suggested questions from KB services only; searchable service cards (reuse `ServiceCard`/`ServiceSearch`)
    - _Requirements: 4.5, 4.6, 6.2_
  - [x] 5.3 "How it works" (Pangutana → Sabta → Andama) + trust section (official sources, verification dates); `FooterLinks.tsx` with real links only
    - _Requirements: 4.7, 4.10, 9.1_
  - [x] 5.4 Route the home search into `/ask?q=...`; keep nav wired
    - _Requirements: 4.4, 5.6_

- [x] 6. How It Works surface
  - [x] 6.1 Per approved Open Q4: a home section anchor and/or a light `app/how-it-works/page.tsx` reusing the same content; nav links to it
    - _Requirements: 4.1, 4.7_

- [x] 7. Ask + answer experience
  - [x] 7.1 Edit `ask/page.tsx` to read `?q=` and prefill/submit; keep `askQuestion`/`AskResponse` and refusal rendering unchanged
    - _Requirements: 5.4, 5.6, 11.3_
  - [x] 7.2 Rework `AnswerCard.tsx` into labelled sections (summary/requirements/steps/office/fee/time, each only when present); source + freshness; action row (checklist/explain/translate) with service id resolved from KB read-only (hide action if unresolved); at most one restrained Aya line
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 9.1, 9.5_

- [x] 8. Readiness view polish (guest, device-only)
  - [x] 8.1 Add `clearStates(id)` to `readinessStore.ts` (additive) + unit test (removes only that id; safe when storage unavailable)
    - _Requirements: 7.6, 12.1_
  - [x] 8.2 Edit `ReadinessChecklist.tsx`: three labelled state controls ("Naa na nako"/"Kinahanglan pa"/"Dili ko sigurado") as accessible radiogroup; progress bar + text counts; next action; encouraging microcopy (no eligibility claims); `AyaGuide` header; "Start over" with confirm; state announced to AT, not color-only
    - _Requirements: 7.1, 7.2, 7.3, 7.6, 7.7, 7.8, 7.9, 10.4, 10.5_
  - [x] 8.3 Edit `app/andam/[id]/page.tsx` to compose the restyled view; add the device-only sync-limitation note; keep missing-entry graceful fallback and `FreshnessNotice`/`NavigationBlock`/`ReportControl` as-is
    - _Requirements: 7.4, 7.5, 9.1, 9.3, 11.3_

- [x] 9. Checkpoint — core surfaces styled and wired
  - Run Vitest + typecheck + lint; confirm home, services, ask, andam render with no 360px overflow; ask the user if questions arise.
  - _Requirements: 12.1, 12.2, 12.5_

- [x] 10. Existing tools polish (behavior preserved)
  - [x] 10.1 Explain page: clear input/output, loading, error, retry; distinguish extracted vs. AI explanation; restrained Aya
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [x] 10.2 Translate page: clear from/to, result, glossary display, loading/error/retry; language selector consistent
    - _Requirements: 8.1, 8.2, 8.4, 4.2_
  - [x] 10.3 Basaha/OCR page (`PhotoReader`): clear capture/paste, visible OCR vs. explanation distinction, loading/error/retry
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 11. Accessibility & responsive hardening
  - [x] 11.1 Audit all screens at 360/768/desktop: no horizontal overflow, 44×44 targets, ≥16px text, visible focus, semantic headings, labelled inputs, color-independent status, reduced-motion
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 12.5_
  - [x] 11.2 Centralize all new Cebuano strings in `strings.ts` (additive); verify natural wording
    - _Requirements: 10.7, 11.6, 11.7_

- [x] 12. Regression gate (mandatory)
  - Run full Vitest suite; `tsc --noEmit`; `next lint`; `next build`; `validate-kb.mjs`; confirm both `kb.json` byte-identical; run eval where credentials exist, else document the credential gate
  - Confirm Ask/Explain/Translate/OCR/refusal and all API contracts unchanged
  - _Requirements: 11.2, 11.3, 11.6, 12.1, 12.2, 12.3, 12.4_

- [x] 13. Final checkpoint & asset documentation
  - Confirm all tests pass; produce a short note listing any documented-missing assets (e.g. transparent Aya crop, licensed Roca Two) for human approval — none generated
  - _Requirements: 2.2, 3.3, 12.1_

## Notes

- **Mascot:** Aya = existing `logo.svg`, reused as-is. No generation, recolor, or re-pose. Missing assets are documented, not created.
- **Non-invention:** every service/fact/category is KB-derived; empty states over fabrication.
- **Preserved untouched:** API routes, `kb.json`, `ask.ts`, `freshness.ts`, `readiness.ts`, `navigation.ts`, `githubReport.ts`, AI routing, validation pipeline, eval harness.
- **Approval required** before any code change; the four design Open Questions should be answered first.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "3.1"] },
    { "id": 2, "tasks": ["3.2", "4.1", "4.2"] },
    { "id": 3, "tasks": ["5.1", "5.2", "5.3", "5.4", "6.1", "7.1", "8.1"] },
    { "id": 4, "tasks": ["7.2", "8.2", "8.3"] },
    { "id": 5, "tasks": ["9"] },
    { "id": 6, "tasks": ["10.1", "10.2", "10.3", "11.1", "11.2"] },
    { "id": 7, "tasks": ["12", "13"] }
  ]
}
```
