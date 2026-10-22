# Requirements Document — AyaSib Frontend Redesign

## Introduction

This feature redesigns the **frontend** of AyaSib — Andam Na?, a Cebuano-first, source-verified government services assistant for Cebu City. The goal is a polished, welcoming, accessible, and trustworthy experience for users of all ages — including older adults and first-time internet users.

This is an **enhancement of the existing Next.js App Router application, not a rebuild**. It is strictly additive and presentation-focused: it restyles and reorganizes existing screens, introduces the Aya mascot and brand voice, and adds a Government Services directory and a "How It Works" surface. It must preserve all existing behavior and contracts.

The overriding constraints carried from the existing approved spec (`.kiro/specs/ayasib-andam-na/`) remain in force:

- **Non-invention.** Every user-facing government fact must trace to a curated knowledge-base field. Where data is absent, the feature is omitted or the system refuses — it never fabricates services, requirements, fees, offices, processing times, sources, or statuses.
- **Preserve existing behavior and contracts.** Ask, Explain, Translate, OCR, the "Dili ko sigurado..." refusal, the `/api/ask|explain|translate|ocr` contracts, the `kb.json` shape, the validation pipeline, the eval set, and Cloudflare Workers AI routing all remain unchanged.
- **No new infrastructure.** No authentication, no database, no cloud sync, no new backend service. The readiness checklist stays device-only (localStorage). The deferred durable server-side report intake stays deferred and is NOT added here.
- **No secrets in the browser.** Only `NEXT_PUBLIC_*` config is public (`NEXT_PUBLIC_GITHUB_REPO`, `NEXT_PUBLIC_STALE_THRESHOLD_DAYS`); `CLOUDFLARE_*` and `LLM_*` stay server-only.

### Mascot and asset reality (verified during inspection)

- The official Aya artwork exists **only** inside `frontend/public/logo.svg`, as a masked, base64-embedded raster (PNG) image at ~500×500. It is not a separable vector character and carries no alternate poses or expressions.
- `frontend/src/components/HeroArt.tsx` is a **generic abstract illustration** (a clipboard/checklist with leaves). It is NOT Aya and must not be presented as the mascot.
- Therefore: Aya is reused **as the existing logo asset, as-is**, placed in different layouts/sizes. No redraw, recolor, re-pose, or generic-mascot substitution. Any genuinely needed additional mascot asset (e.g. a transparent-background crop, or separate poses) is **documented as a missing asset for human approval**, never generated.

### Existing baseline (preserved)

- Next.js 15 App Router, React 19, TypeScript. Pages: `/` (home), `/ask`, `/explain`, `/translate`, `/basaha`, `/andam/[id]`.
- Single stylesheet `frontend/src/app/globals.css`, mobile-first, `.shell` capped at 640px. Existing green/cream palette and the splash/logo treatment.
- Components: `Shell`, `Notice`, `AnswerCard`, `PhotoReader`, `Logo`, `Splash`, `HeroArt`, and the Andam-Na components (`ReadinessChecklist`, `NavigationBlock`, `FreshnessNotice`, `ReportControl`).
- All user-facing Cebuano lives in `frontend/src/lib/strings.ts` (`t`) and server responses in `serverText`.
- Vitest suite (currently 106 passing), KB validation (`backend/scripts/validate-kb.mjs`), eval set (`eval/questions.json` + `backend/scripts/eval.mjs`, live-LLM).

## Glossary

- **System**: the AyaSib frontend (the Next.js `frontend/` app), unless a more specific component is named.
- **Aya**: the brand mascot, available only as the existing `logo.svg` asset.
- **Logo asset**: `frontend/public/logo.svg`, the full AyaSib wordmark + Aya artwork.
- **Design tokens**: the named colors and type choices in Section "Visual design system" below, applied via CSS custom properties.
- **Cream-first**: a layout whose dominant page background is the warm cream token, not white/blue/dark/gradient.
- **Services directory**: a new browse/search surface listing only KB services.
- **KB**: the curated knowledge base (`frontend/src/data/kb.json`), the single source of government facts.
- **Readiness checklist**: the existing per-service document checklist on `/andam/[id]`, device-only.
- **Existing tools**: Ask, Explain, Translate, OCR (Basaha).
- **Refusal behavior**: the existing "Dili ko sigurado niini. Palihug kumpirmaha sa opisina." uncertainty response.

## Requirements

### Requirement 1: Cream-first brand visual system

**User Story:** As a returning user, I want AyaSib to keep its warm, green-and-cream identity, so that it feels familiar and trustworthy rather than generic.

#### Acceptance Criteria

1. THE System SHALL use a warm cream page background as the dominant background across all screens, and SHALL NOT present a predominantly white, blue, dark, or gradient-based page background.
2. THE System SHALL define the brand palette as CSS custom properties: cream `#FFFDF0` (main background), forest green `#506B3D` (primary buttons/active), deep green `#354A2B` (headings/emphasis), soft sage `#E7EEDC` (checklist panels/selected), pale green `#F3F6ED` (secondary sections), white `#FFFFFF` (cards/inputs), charcoal `#292D26` (primary text), muted gray `#686D65` (supporting text), soft amber `#F4E6BD` (caution/confirmation), muted red `#A94442` (errors).
3. THE System SHALL apply forest green to primary actions and active states, deep green to headings/emphasis, soft amber to caution/confirmation notices, and muted red to errors.
4. THE System SHALL use generous whitespace, clear visual hierarchy, rounded cards, subtle borders, restrained shadows, simple icons, and minimal animation, and SHALL avoid clutter, tiny text, excessive gradients, and childish styling.
5. THE System SHALL keep all existing screens visually consistent with this one system (no per-page bespoke palettes).

### Requirement 2: Typography

**User Story:** As a user of any age, I want headings and body text that are easy to read, so that I can use the app without strain.

#### Acceptance Criteria

1. THE System SHALL use a display typeface (Roca Two) for the "Andam Na?" hero and selected display headings, and a highly legible sans-serif (Inter or DM Sans) for body text, navigation, forms, and checklist items.
2. IF Roca Two is not available under an acceptable license/source, THEN THE System SHALL document the limitation and apply a clearly-named temporary fallback display face, and SHALL NOT block the rest of the redesign.
3. THE System SHALL NOT recreate, redraw, or alter the logo's own typography (the logo is used as an image asset).
4. THE System SHALL render body text at a computed size of at least 16 CSS px.

### Requirement 3: Reuse the existing Aya artwork and logo (no new mascot)

**User Story:** As the brand owner, I want our real Aya preserved exactly, so that our identity is not replaced by a generic character.

#### Acceptance Criteria

1. THE System SHALL reuse the existing `logo.svg` asset wherever the complete logo is required, without regenerating, redrawing, recoloring, re-posing, or substituting the Aya character.
2. WHERE Aya appears as a friendly guide (home hero, checklist header), THE System SHALL reuse the existing logo asset (or an approved crop of it) in a different layout, size, or placement rather than a newly generated image.
3. IF a separable Aya image (e.g. transparent-background crop, or additional poses/expressions) is genuinely needed for a placement, THEN THE System SHALL document the specific missing asset and propose it for human approval, and SHALL NOT generate a replacement.
4. THE System SHALL present Aya as a supportive guide, not as a decoration on every element and not as an authority that guarantees any government outcome.
5. THE System SHALL preserve the existing favicon and splash behavior (logo on cream), restyled only to match the tokens.

### Requirement 4: Welcoming, uncluttered home page

**User Story:** As a first-time visitor, I want a clear home page that tells me what AyaSib does and lets me ask immediately, so that I can start without confusion.

#### Acceptance Criteria

1. THE System SHALL display the existing AyaSib logo and a top navigation with: Home, Government Services, How It Works, and Ask AyaSib.
2. THE System SHALL provide an accessible language selector for the supported languages (`en`, `fil`, `ceb`), consistent with the existing Translate language set, and SHALL NOT claim support for languages the app does not handle.
3. THE System SHALL display the hero heading "Andam Na?" and the supporting Cebuano line "Sabta ang mga kinahanglanon. Andama ang imong mga dokumento. Lakaw nga mas sigurado."
4. THE System SHALL display a prominent question field labelled "Unsa nga serbisyo ang imong gipangita?" with a primary action "Pangutana" that routes the entered question into the existing Ask experience.
5. THE System SHALL display a small set of suggested questions derived only from supported KB services (no invented prompts).
6. THE System SHALL display searchable government service cards sourced only from the KB.
7. THE System SHALL display a short "How it works" section expressing Pangutana → Sabta → Andama, and a trust section explaining official sources and verification dates.
8. THE System SHALL display Aya (the existing asset) near the hero/search with a short Cebuano welcome ("Maayong adlaw! Ako si Aya. Tabangan tika nga masabtan ang mga kinahanglanon."), and MAY include "Aya sib the day!" as a secondary brand element, without displacing the hero heading or the search action.
9. THE System SHALL keep the search field the most visually prominent interactive element on the home page.
10. THE System SHALL use only real, existing links in the footer (no placeholder or invented destinations).

### Requirement 5: Clear, source-backed Ask and answer experience

**User Story:** As a user asking a question, I want the answer organized into readable sections with its source and freshness, so that I can trust and act on it.

#### Acceptance Criteria

1. THE System SHALL present answers in labelled sections (summary, requirements, steps, office, fee, processing time) rather than one dense paragraph, showing each field only when the KB supports it.
2. THE System SHALL show the official source link and the verification date / freshness status with each confident answer.
3. THE System SHALL offer actions to open the readiness checklist, document explanation, and translation when supported by the answered service.
4. THE System SHALL preserve the existing refusal/uncertainty behavior unchanged and SHALL NOT invent government information.
5. WHERE Aya appears in the answer experience, THE System SHALL use it sparingly (e.g. one supportive line or an uncertainty note), not beside every section and not repeated throughout the page.
6. THE System SHALL keep the `/api/ask` request/response contract and the `AskResponse` shape unchanged.

### Requirement 6: Government services directory

**User Story:** As a user who does not know the exact term, I want to browse and search available services, so that I can find the right one.

#### Acceptance Criteria

1. THE System SHALL provide a services directory screen with a prominent search field, accessible category filters, clear service cards, and easy navigation to each service's detail/readiness view.
2. THE System SHALL list only services present in the KB, and SHALL NOT invent services to fill categories or empty space.
3. WHEN a search or filter yields no matches, THE System SHALL show a clear, accessible empty/no-results state in Cebuano, and SHALL NOT fabricate results.
4. WHERE category filters are shown, THE System SHALL derive categories only from existing KB data (e.g. `locality` or an explicit, already-present field) and SHALL NOT assign invented categories.

### Requirement 7: Accessible guest readiness checklist (device-only)

**User Story:** As a user preparing documents, I want to track what I have without logging in, so that I can prepare privately on my own device.

#### Acceptance Criteria

1. THE System SHALL allow full use of the readiness checklist without any account, login, or personal information.
2. THE System SHALL present three selectable states per requirement with the Cebuano labels "Naa na nako" (have it), "Kinahanglan pa" (still need), and "Dili ko sigurado" (need to confirm), mapping to the existing `HAS` / `STILL_NEEDS` / `NEEDS_TO_CONFIRM` states.
3. THE System SHALL display overall progress and counts of items available, still needed, and needing confirmation, plus a single clear next action.
4. THE System SHALL persist progress on the same device/browser via the existing localStorage store, keyed by stable service id and requirement identity (never by array index), restore it on return where storage is available, and degrade gracefully when storage is unavailable or malformed.
5. THE System SHALL show an explanation that local progress does not sync across devices and may be lost if browser data is cleared.
6. THE System SHALL provide a "Start over" action that asks for confirmation before clearing a service's saved progress.
7. THE System SHALL show concise, encouraging Cebuano microcopy (e.g. "Atong susihon kung unsa na ang naa nimo ug unsa pa ang kinahanglan.", "Maayo! Padayon sa pag-andam.", "Nahuman na nimo ang checklist! Susiha pag-usab ang mga detalye sa dili pa moadto.") WITHOUT implying eligibility, qualification, or guaranteed approval.
8. THE System SHALL place Aya (the existing asset) near the checklist title or progress summary as a supportive guide, not beside every requirement.
9. THE System SHALL expose checklist state and progress to assistive technology (accessible names/roles, state not conveyed by color alone).

### Requirement 8: Existing tools polished, behavior preserved

**User Story:** As a user of Explain, Translate, and OCR, I want clearer, calmer screens, so that the tools are easier to use without changing how they work.

#### Acceptance Criteria

1. THE System SHALL preserve the current behavior and integrations of Explain, Translate, and OCR, keeping their API contracts and their existing tests passing.
2. THE System SHALL provide clear inputs, readable outputs, visible loading indicators, explicit error states, and retry actions for each tool.
3. THE System SHALL visually distinguish extracted/OCR text from AI-generated explanations.
4. THE System SHALL keep these task-focused screens simple, with Aya at most a small supporting element that does not compete with controls or results.

### Requirement 9: Freshness and information integrity

**User Story:** As a user relying on government info, I want honest freshness signals, so that I know how much to trust an answer.

#### Acceptance Criteria

1. THE System SHALL preserve the approved freshness logic and distinguish fresh, stale/needs-review, and unavailable (missing/invalid verification date) states, using the existing `freshness.ts` logic.
2. THE System SHALL NOT present a verification date as proof of current accuracy, and SHALL NOT claim live verification.
3. THE System SHALL NOT add the deferred reporting feature or any unapproved infrastructure; the existing client-only GitHub-issue report control is retained as-is.
4. WHERE Aya communicates uncertainty, THE System SHALL use honest copy such as "Dili ko sigurado ani nga detalye. Palihog susiha sa opisyal nga tinubdan."
5. THE System SHALL convey status with text/icon in addition to color (never color alone).

### Requirement 10: Accessibility and responsive design

**User Story:** As a user on any device or with assistive technology, I want a responsive, accessible interface, so that I can use AyaSib comfortably.

#### Acceptance Criteria

1. THE System SHALL render usable desktop, tablet, and mobile layouts, with no horizontal scrolling at a 360 px viewport width.
2. THE System SHALL target WCAG 2.2 AA principles: text/background contrast meeting AA for the chosen tokens, body text ≥ 16 px, and interactive targets ≥ 44×44 CSS px where practical.
3. THE System SHALL support keyboard navigation with visible focus states, semantic headings, and accessible form labels.
4. THE System SHALL ensure screen readers can identify checklist item states and overall progress.
5. THE System SHALL never communicate status or meaning through color alone.
6. THE System SHALL respect `prefers-reduced-motion` for all animations, including the splash and any new transitions.
7. THE System SHALL use natural, respectful Cebuano for all new user-facing strings, centralized in `strings.ts`.

### Requirement 11: Preservation, backward compatibility, and scope discipline

**User Story:** As a maintainer, I want the redesign to change only presentation, so that nothing that works today breaks.

#### Acceptance Criteria

1. THE System SHALL keep the Next.js App Router architecture and reuse existing components, assets, and patterns where sensible rather than introducing parallel ones.
2. THE System SHALL preserve Cloudflare Workers AI integration, AI routing, the YAML/JSON KB, the validation pipeline, and the existing API behavior.
3. THE System SHALL keep Ask, Explain, Translate, OCR, and refusal behavior working, verified by the existing Vitest suite and (where credentials exist) the eval set.
4. THE System SHALL avoid unnecessary dependencies and SHALL NOT add backend services, authentication, or database changes.
5. THE System SHALL NOT change any verified service fact in the KB to make the UI look complete.
6. THE System SHALL keep the `kb.json` shape consumed by `kb.ts` and `backend/lib/ask.mjs` unchanged, and keep `strings.ts` additive (existing keys unchanged).
7. THE System SHALL add new user-facing strings only to `strings.ts` (and `serverText` only if a server response genuinely needs new copy, which this redesign does not anticipate).

### Requirement 12: Verification and regression gate

**User Story:** As a maintainer, I want the redesign proven non-breaking, so that I can ship with confidence.

#### Acceptance Criteria

1. THE System SHALL keep the full Vitest suite passing (currently 106 tests), adding tests only where new testable logic is introduced (e.g. a services-directory filter/search pure function, or a "start over" confirmation handler), and SHALL tag any new feature tests clearly.
2. THE System SHALL pass `tsc --noEmit`, `next lint`, and `next build` after the redesign.
3. THE System SHALL keep the KB validation (`backend/scripts/validate-kb.mjs`) green and the `kb.json` files byte-identical (no data changes).
4. WHERE Cloudflare credentials are available, THE System SHALL keep the eval set green; WHERE they are not, THE System SHALL document that the live eval run is credential-gated (unchanged from the current state) rather than claim a pass.
5. THE System SHALL verify mobile usability (360 px, no horizontal overflow, 44×44 targets, ≥16 px text) for the home page, services directory, answer experience, readiness view, and the three tools.
