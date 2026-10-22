# Design Document — AyaSib Frontend Redesign

## Overview

This redesign is a **presentation-layer enhancement** of the existing AyaSib — Andam Na? app. It restyles every screen to a cohesive cream-first brand system, introduces the Aya mascot (reusing the existing logo asset only) and the brand voice, reorganizes the Ask answer and readiness experiences for clarity, and adds two new browse surfaces (a Government Services directory and a How It Works view). It touches **only the frontend presentation**: components, pages, the single stylesheet, and the centralized strings. It does not alter API routes, the KB, the validation pipeline, AI routing, or any pure domain logic.

The guiding principles are unchanged from the approved Andam-Na spec: **non-invention, preserve existing behavior and contracts, no new infrastructure, no secrets in the browser.** The mascot rule is absolute: **Aya is the existing `logo.svg`, reused as-is; never regenerated or substituted.**

### What changes vs. what is preserved

| Area | Change | Preserved |
| --- | --- | --- |
| `globals.css` | Rework tokens to the new palette + type; add directory/nav/section styles | Mobile-first `.shell`, reduced-motion block, existing class names reused where possible |
| `strings.ts` | Add additive keys (brand, nav, home, directory, checklist microcopy) | All existing keys and `serverText` |
| `Shell` | Add optional top nav + language selector slot | Back link, logo, sr-only title |
| Home `page.tsx` | New hero, search entry, suggested questions, service cards, how-it-works, trust, footer | Routes to existing `/ask` |
| Ask `ask/page.tsx` + `AnswerCard` | Sectioned answer, action buttons, restrained Aya | `askQuestion` client, `AskResponse` shape, refusal rendering |
| `/andam/[id]` + readiness components | New labels, progress, start-over, Aya header, microcopy | `readiness.ts`, `readinessStore.ts`, stable-identity persistence |
| New `/services` directory | New screen over `kb` | KB is read-only |
| New `/how-it-works` (or home section) | Static explanatory content | — |
| Explain/Translate/Basaha pages | Visual polish, clearer IO | Their lib + API behavior and tests |
| API routes, `kb.json`, `ask.ts`, `freshness.ts`, etc. | **None** | Everything |

## Architecture

All changes live inside `frontend/src`. No new runtime dependencies are planned (fonts are loaded via `next/font` from Google Fonts for Inter/DM Sans; Roca Two is handled per the font decision below).

```
frontend/src/
├─ app/
│  ├─ globals.css              (REWORK: tokens, typography, nav, directory, sections — additive/!changed classes)
│  ├─ layout.tsx               (EDIT: wire next/font variables; keep Splash)
│  ├─ page.tsx                 (REWORK: home — hero, search, suggestions, cards, how-it-works, trust, footer)
│  ├─ services/page.tsx        (NEW: government services directory)
│  ├─ how-it-works/page.tsx    (NEW: optional standalone; or a home section + anchor)
│  ├─ ask/page.tsx             (EDIT: accept ?q= prefill from home; restrained Aya)
│  └─ andam/[id]/page.tsx      (EDIT: compose restyled readiness view)
├─ components/
│  ├─ Shell.tsx                (EDIT: optional TopNav + language selector slot)
│  ├─ TopNav.tsx               (NEW: Home / Services / How It Works / Ask)
│  ├─ LanguageSelector.tsx     (NEW: en/fil/ceb, accessible; display-only unless wired to existing Translate)
│  ├─ AyaGuide.tsx             (NEW: logo-asset image + optional speech bubble; the ONLY mascot surface)
│  ├─ ServiceCard.tsx          (NEW: KB-sourced card)
│  ├─ ServiceSearch.tsx        (NEW: client search/filter over kb, uses a pure filter fn)
│  ├─ AnswerCard.tsx           (REWORK: sectioned, action buttons)
│  ├─ ReadinessChecklist.tsx   (EDIT: new labels, progress bar, start-over, Aya header)
│  ├─ FooterLinks.tsx          (NEW: real links only)
│  └─ (Notice, PhotoReader, Logo, Splash, HeroArt, NavigationBlock, FreshnessNotice, ReportControl preserved)
└─ lib/
   ├─ strings.ts               (EXTEND: additive keys only)
   ├─ servicesDirectory.ts     (NEW, pure: filterServices(kb, query, category) + deriveCategories(kb))
   └─ (ask, freshness, readiness, readinessStore, navigation, githubReport, kb, types … unchanged)
```

### Mascot asset strategy (resolved)

- **Finding:** `public/logo.svg` wraps a base64 PNG of Aya behind an SVG mask; `HeroArt.tsx` is generic abstract art (clipboard + leaves), not Aya.
- **Decision:** The sole mascot surface is `AyaGuide`, which renders the existing `logo.svg` (or the full wordmark via the existing `Logo` component) at different sizes/placements. The abstract `HeroArt` may remain as a decorative background element but is never labelled "Aya."
- **Documented missing asset (for human approval, not generated):** a transparent-background crop of *just* the Aya character (no wordmark) would let Aya sit beside a speech bubble more cleanly in the hero and checklist header. Until approved/provided, `AyaGuide` uses the full logo asset at a constrained size. This is logged in the Open Questions section and surfaced in the task list — no replacement art is generated.

### Typography decision

- **Body/UI:** Inter (or DM Sans) via `next/font/google` — self-hosted at build, no runtime network, no license concern for these OFL fonts.
- **Display ("Andam Na?" + selected headings):** Roca Two is a commercial font and is **not** bundled. Unless the team supplies a licensed Roca Two web font file, the design uses a documented temporary fallback: a rounded, friendly display face (e.g. "Fraunces" or "Baloo 2" via `next/font`, or a system rounded stack) mapped to a `--font-display` variable. The fallback is isolated to one CSS variable so swapping in licensed Roca Two later is a one-line change. **The logo's own typography is untouched (it's an image).**

## Visual design system

Implemented as CSS custom properties on `:root`, replacing the current ad-hoc greens. Existing semantic class names (`.btn`, `.card`, `.notice`, `.chip`, `.list`, `.input`, `.shell`, `.bar`) are retained and re-pointed at the new tokens so existing markup keeps working.

```css
:root {
  --cream:      #FFFDF0;  /* main background */
  --forest:     #506B3D;  /* primary buttons, active states */
  --deep-green: #354A2B;  /* headings, emphasis */
  --sage:       #E7EEDC;  /* checklist panels, selected states */
  --pale-green: #F3F6ED;  /* secondary sections */
  --white:      #FFFFFF;  /* cards, inputs */
  --charcoal:   #292D26;  /* primary text */
  --gray:       #686D65;  /* supporting text */
  --amber:      #F4E6BD;  /* caution / confirmation notices */
  --red:        #A94442;  /* errors */

  --font-body: var(--font-inter), system-ui, sans-serif;
  --font-display: var(--font-display-face), var(--font-body);
  --radius: 16px;
  --shadow: 0 2px 8px rgba(41, 45, 38, 0.08);
}
body { background: var(--cream); color: var(--charcoal); font-family: var(--font-body); }
```

Contrast note: all text/background pairings are checked against WCAG AA (4.5:1 for body, 3:1 for large text) during implementation; charcoal `#292D26` on cream `#FFFDF0` and white are well clear of AA. Forest/deep-green on cream are used for large/emphasis text and verified. Amber and red notices always pair color with an icon + text label (never color alone).

## Components and Interfaces

### `lib/servicesDirectory.ts` (pure, testable)

```ts
export interface ServiceSummary { id: string; title: string; locality: string; }

/** Case-insensitive match over id, name_en, name_ceb, locality. Empty query => all. */
export function filterServices(kb: KbEntry[], query: string, category?: string | null): KbEntry[];

/** Distinct localities (or another already-present KB field) as category options; derived, never invented. */
export function deriveCategories(kb: KbEntry[]): string[];
```

Rules: reads only existing KB fields; never fabricates a service or category; stable ordering (KB order, then by id). This is the one piece of genuinely new logic and gets unit + light property tests.

### `components/TopNav.tsx`

Renders Home / Government Services / How It Works / Ask AyaSib as accessible links with visible focus and an aria-current on the active route. Collapses to a simple, tap-friendly row on mobile (no custom hamburger JS unless needed; links wrap within the 640px shell). 44×44 targets.

### `components/LanguageSelector.tsx`

Accessible `<label>` + `<select>` for `en` / `fil` / `ceb`, labelled in Cebuano. Scope note: the app's UI is Cebuano-first and does not currently localize the whole UI. To honor non-invention and "don't claim support you don't have," the selector's MVP role is to set the **Translate** default language pair (the one place language choice is real), and/or to be presented as affecting translation — not a full UI i18n switch. The design does NOT fake a multi-language UI. Final wiring is confirmed in the task list; if full UI i18n is out of scope, the selector is scoped to Translate and labelled accordingly.

### `components/AyaGuide.tsx`

```ts
export function AyaGuide(props: {
  message?: string;      // Cebuano speech-bubble text (from strings)
  size?: "sm" | "md" | "lg";
  showBubble?: boolean;
});
```

Renders the existing logo asset (via `Logo`/`logo.svg`) at the requested size with an optional speech bubble. This is the **only** component that presents Aya as a character. No generated art. Marked decorative (`aria-hidden`) when purely illustrative; the speech-bubble text is real, readable text in the DOM.

### `components/ServiceCard.tsx` and `ServiceSearch.tsx`

`ServiceCard` shows a KB service's title (`name_ceb || name_en`), locality, and a link to `/andam/{id}` (and/or a "Pangutana" deep link). `ServiceSearch` is a client component holding the query/category state and calling `filterServices`; it renders results, an accessible empty state, and the category filter from `deriveCategories`.

### `AnswerCard.tsx` (reworked)

Keeps consuming `AskResponse` unchanged. Presents: source header, summary, then labelled sections for requirements, (steps if present), office, fee, processing time — each rendered only when present. Adds an action row: "Buksi ang checklist" (→ `/andam/{id}` when the answered service id is known), "Ipasabot" (→ Explain), "Hubara" (→ Translate). A single restrained Aya line may appear once. The refusal path (not confident) renders the existing `Notice` with `t.notSure` — unchanged.

Note: `AskResponse.sources[0]` carries title/url/last_verified but not the service id. To enable the checklist deep-link, the design resolves the service id by matching the source title/url against `kb` on the client (read-only), falling back to hiding the checklist action if no match — never inventing an id.

### `ReadinessChecklist.tsx` (edited)

Same pure logic (`deriveItems`, `counts`, `isComplete`, `nextRecommendedAction`, `loadStates`/`saveState`). Presentation changes: three clearly-labelled state controls ("Naa na nako" / "Kinahanglan pa" / "Dili ko sigurado") as an accessible radiogroup per item, a progress summary with a visual bar + text counts, encouraging microcopy, an `AyaGuide` near the title, and a "Start over" button that opens a confirm dialog before clearing that service's stored state. State is exposed to AT via roles/aria-checked and text (not color alone).

Start-over clearing: a small addition to `readinessStore.ts` — `clearStates(id)` — or handled by overwriting each item to default; the design prefers a tiny additive `clearStates(id)` helper (pure localStorage removal of one entry id), covered by a unit test.

### `Shell.tsx` (edited)

Gains an optional `nav` prop/slot so pages can opt into the `TopNav` + `LanguageSelector`. The home page uses the full nav; task-focused screens keep the minimal back-link header to stay uncluttered (per Req 8.4). Existing behavior (back link, logo pill, sr-only title) preserved.

## Data flow

Everything new is read-only over existing data:

```
kb.json ──▶ kb.ts ──▶ servicesDirectory.filterServices / deriveCategories ──▶ ServiceSearch/ServiceCard
home search box ──▶ /ask?q=... ──▶ existing askQuestion() ──▶ AnswerCard (unchanged contract)
AnswerCard action ──▶ /andam/{id} (id resolved from kb by source match; hidden if unresolved)
readiness UI ──▶ readiness.ts + readinessStore.ts (device-only, unchanged keys)
```

No new network calls, no new env usage beyond the existing `NEXT_PUBLIC_*`.

## Error Handling

- Directory search/empty states render accessible Cebuano messages; never fabricated results.
- Missing/unknown service id on `/andam/[id]` keeps the existing graceful "not sure" fallback.
- localStorage failures remain swallowed by the existing store (checklist renders defaults).
- Font load failure falls back through the font stack; no layout break.
- Any KB field absent → the corresponding section/card field is omitted, never invented.

## Security Considerations

- No new server surface, no database, no auth, no cloud sync (Req 11.4).
- Only `NEXT_PUBLIC_GITHUB_REPO` / `NEXT_PUBLIC_STALE_THRESHOLD_DAYS` are read client-side; `CLOUDFLARE_*`/`LLM_*` stay server-only.
- Readiness state stays device-only; no PII collected to use the checklist.
- The deferred durable report intake is NOT added. The existing client-only GitHub-issue control is retained unchanged.

## Testing Strategy

### New unit/property tests (only for new logic)
- `servicesDirectory.test.ts`: `filterServices` matches only on existing fields, empty query returns all, no-match returns empty, ordering stable; `deriveCategories` returns distinct existing values only, never invented. (A couple of these can be fast-check properties, tagged `// Feature: ayasib-frontend-redesign, Property N`.)
- `readinessStore` `clearStates(id)`: removes only that id's state, leaves others, safe when storage unavailable.

### Regression (mandatory, unchanged gate)
- Full Vitest suite stays green (currently 106).
- `tsc --noEmit`, `next lint`, `next build` clean.
- `validate-kb.mjs` green; both `kb.json` files byte-identical (no data change).
- Eval set: run where Cloudflare credentials exist; otherwise document the credential gate (current state), do not claim a pass.

### Accessibility & mobile checks
- 360 px: no horizontal overflow on home, `/services`, `/ask`, `/andam/[id]`, `/explain`, `/translate`, `/basaha`.
- Interactive targets ≥ 44×44; body text ≥ 16 px; visible focus; semantic headings; labels on all inputs; checklist state/progress announced; color never the sole status channel; `prefers-reduced-motion` respected.

### Manual visual pass
- Cream dominates every screen; forest/deep-green/sage/amber/red used per their roles; Aya present only via the existing asset and only where specified.

## Backward Compatibility

| Existing artifact | Change | How it stays safe |
| --- | --- | --- |
| `/api/*` routes, `http.ts`, `ask.ts`, `freshness.ts`, `readiness.ts`, `navigation.ts`, `githubReport.ts` | None | Not edited |
| `kb.json` (both) | None | No data changes; hashes unchanged |
| `types.ts` (`AskResponse` etc.) | None | Consumed as-is |
| `strings.ts` | Additive keys only | Existing keys untouched |
| `globals.css` class names | Re-pointed to new tokens | Same selectors; markup unchanged where reused |
| Existing Vitest suites | None | Must stay green |
| Splash/favicon | Restyled only | Behavior preserved; reduced-motion respected |

## MVP vs. deferred

- **MVP:** cream-first system + typography, Aya via existing asset, home redesign, services directory, sectioned Ask answer, polished tools, accessible guest checklist with start-over, freshness integrity, accessibility/responsive, regression gate.
- **Deferred / human-gated (not built here):** licensed Roca Two web font; a transparent Aya character crop or extra poses (documented for approval); full multi-language UI i18n if the language selector is to switch the whole UI; the durable server-side report queue (remains Future from the prior spec).

## Open Questions / Decisions

### Resolved
- **Mascot source:** reuse `logo.svg` as-is via `AyaGuide`; `HeroArt` is decorative, not Aya.
- **Palette/type:** applied via CSS variables; one `--font-display` variable isolates the display face.
- **No new infra:** directory and everything new is read-only over `kb`.

### Resolved with the owner (2026-10-23)
1. **Roca Two — provided.** The owner supplied `C:\Users\User\Downloads\FontsFree-Net-Roca-Two-Bold.ttf` (Bold only). It is copied to `frontend/public/fonts/RocaTwo-Bold.ttf` and loaded via `next/font/local` as `--font-display`. Because only the Bold weight is available, display headings render at bold weight; this is acceptable for the hero/display use. The logo typography is untouched (it is an image).
2. **Aya crop — provided.** The owner supplied `C:\Users\User\Downloads\Aya.svg` — a character-only version of Aya (same masked-PNG structure as the logo, 500×500, viewBox `0 0 375 375`, no wordmark). It is copied to `frontend/public/aya.svg` and used by `AyaGuide` for the mascot placements (home hero, checklist header). The full `logo.svg` remains the header wordmark and splash. No art is generated, recolored, or re-posed.
3. **Language selector scope — option (a).** It sets the Translate default language pair only; it does not fake a full multi-language UI. Labelled in Cebuano to make its role clear.
4. **How It Works — both.** A home-page section (Pangutana → Sabta → Andama) plus a light standalone `/how-it-works` route reusing the same content; the nav links to it.
