# Design Document

## Overview

"AyaSib — Andam Na?" refines the existing AyaSib application into a Cebuano-first, source-verified government service readiness assistant for Cebu City. This design adds four capabilities on top of the working application **without replacing, rewriting, or breaking any existing feature**:

1. **Readiness checklist** — a per-service checklist derived only from a KB entry's `requirements_ceb` (falling back to `requirements`), with three per-item states (HAS / STILL_NEEDS / NEEDS_TO_CONFIRM) persisted on the user's device by stable requirement identity.
2. **Verified barangay-to-city navigation** — a next-step note and links to officially related services, shown only when the KB entry already carries that data.
3. **Freshness + information-status tracking** — surfacing each answer's `last_verified` date, computing a status (Verified / Needs review / Unconfirmed / Unavailable) from a documented freshness policy, and a verified-only "next recommended action."
4. **Open-source reporting** — a client-only control that opens a prefilled GitHub issue in the project's public repository for maintainer review. It stores nothing on any AyaSib server, needs no database, and exposes no secret. A durable server-side report intake (an `/api/report` route and queue) stays deferred until approved durable storage exists.

The single overriding principle is **non-invention**: every user-facing fact must trace to an existing KB field. Where supporting data is absent, the feature degrades gracefully (it is omitted for that entry) or the system refuses, consistent with the existing "Dili ko sigurado..." refusal.

### Mapping to the capabilities

| Capability | New pure logic | New UI | New data/config |
| --- | --- | --- | --- |
| Readiness checklist | `src/lib/readiness.ts`, `src/lib/readinessStore.ts` | checklist component + a per-service `/andam` view | none (reuses `requirements_ceb` / `requirements`) |
| Verified navigation | `src/lib/navigation.ts` | navigation block in the answer view | optional KB fields `next_step`, `next_step_ceb`, `related` |
| Freshness + status | `src/lib/freshness.ts` | `Notice`-based stale/unavailable notices + status label | config `STALE_THRESHOLD_DAYS` (default 180); optional KB fields `review_status`, `review_due` |
| Next recommended action | `src/lib/readiness.ts` (`nextRecommendedAction`) | one line in the checklist | none (verified data only) |
| Reporting (GitHub Issues) | `src/lib/githubReport.ts` (pure URL builder) | report control on `/andam/[id]` | build-time `NEXT_PUBLIC_GITHUB_REPO` constant |

### Design principles

- **Additive only.** New files and optional fields; no edits to the shape or behavior of existing contracts.
- **Pure logic, separately testable.** All derivation lives in small pure modules with unit tests; UI and routes are thin shells over them.
- **No new infrastructure for MVP.** No database and no external service. The hosting platform (Vercel) runs the API routes as stateless serverless functions with an ephemeral filesystem, so there is no durable, queryable store. Reporting therefore uses GitHub Issues (open-source, no infra); a durable server-side queue is deferred.
- **Graceful degradation.** Missing data hides a feature; it never produces an empty-but-"complete" state or invented content. A missing or unusable `last_verified` surfaces a distinct "verification date unavailable" notice — it never fabricates a date or implies freshness.

---

## Current-Architecture Summary (Preserved Baseline)

This is the verified baseline the design builds on. Everything here is **preserved unchanged**.

- **Hosting (verified):** Vercel, root directory `frontend`. API routes run as **stateless serverless functions**; the serverless filesystem is **ephemeral**. Cross-request state (rate-limit counter, caches) is in-memory only and does not survive cold starts or scale-out. Repeated questions use an **in-memory cache only** (`cache.ts`).
- **Storage (verified):** there is **no database**. Supabase/pgvector was **dropped** (`docs/TASKS.md` BE-02; Supabase keys slated for revocation in BE-16). There is **no approved durable storage**. Routing uses a prompt-list over the KB entries, not vector retrieval.
- **Frontend:** Next.js 15 App Router, React 19, TypeScript. Pages: `/ask`, `/explain`, `/translate`, `/basaha`. Components: `Shell`, `Notice`, `AnswerCard`, `PhotoReader`, `Logo`, `Splash`.
- **Mobile-first CSS (verified):** `frontend/src/app/globals.css` is the single stylesheet: a `.shell` capped at `max-width: 640px`, 48–56px touch targets on `.btn`/`.chip`/`.input`/bar links, `html { font-size: 18px }`, full-width inputs with no horizontal overflow, `env(safe-area-inset-bottom)` padding, and a `prefers-reduced-motion` block. New components reuse these conventions.
- **Shared libs** (`frontend/src/lib`): `ask`, `explain`, `translate`, `kb`, `http`, `types`, `strings`, `json`, `ocr`, `ocrServer`, `ocrClient`, `client`, `glossary`, `llm`, `cache`.
- **API routes** (`frontend/src/app/api/*/route.ts`): `ask`, `explain`, `translate`, `ocr`. All use `http.ts` helpers (`apiError`, `rateLimit`, `clientIp`, `readJson`, `readText`, `failure`, `LIMITS`) and `types.ts` (`ApiErrorCode`).
- **`http.ts` facts (verified):** `LIMITS = { question: 2000, text: 8000, body: 20000 }`; `rateLimit` default 20 requests per 60000 ms; `ApiErrorCode` is `invalid_request | payload_too_large | unsupported_media_type | rate_limited | upstream_error | internal_error`; `failure` logs only a message and returns a generic contract error.
- **Ask grounding (verified in `ask.ts`):** `assembleAnswer` returns `notConfident()` unless the chosen entry exists **and** has both `source_url` and `last_verified`; `summaryIsGrounded` rejects any number not in the entry; requirements fall back to the entry's own list when counts mismatch.
- **KB pipeline:** `/kb/*.yaml` → `frontend/scripts/sync-data.mjs` → `frontend/src/data/kb.json`, consumed by `frontend/src/lib/kb.ts` and `backend/lib/ask.mjs`. `kb.json` currently holds 4 entries.
- **Validation:** `backend/scripts/validate-kb.mjs` enforces `REQUIRED_TEXT`, `NULLABLE_TEXT`, `OPTIONAL`, a `KNOWN` set; `id` lowercase-hyphenated and matching the filename stem; `source_url` non-example HTTPS; `last_verified` a real non-future date; `requirements_ceb` length equals `requirements` length.
- **Eval:** `eval/questions.json` + `backend/scripts/eval.mjs`, covering routing and refusal/null cases.
- **Strings:** all user-facing Cebuano lives in `frontend/src/lib/strings.ts` (`t` for UI, `serverText` for API responses).
- **Tests:** Vitest (`vitest run`). Existing tests include `http.test.ts`, `ask.test.ts`, `cache.test.ts`, `glossary.test.ts`, `llm.test.ts`, `ocr.test.ts`, `ocrClient.test.ts`, `api/ask/route.test.ts`.

---

## Architecture

All new code is additive and lives alongside the existing tree. Nothing existing is moved or rewritten.

```
AyaSib/
├─ kb/*.yaml                         (existing; MAY gain optional next_step / next_step_ceb / related / review_status / review_due)
├─ backend/scripts/validate-kb.mjs   (EXTEND: KNOWN set + checks for new optional fields)
├─ frontend/
│  ├─ scripts/sync-data.mjs          (EXTEND: pass new fields through only when present)
│  └─ src/
│     ├─ data/kb.json                (regenerated; new fields appear only for entries that define them)
│     ├─ lib/
│     │  ├─ types.ts                 (EXTEND: optional KbEntry fields + Future ReportRequest/ReportResponse)
│     │  ├─ readiness.ts             (NEW: pure checklist derivation + state logic + nextRecommendedAction)
│     │  ├─ readinessStore.ts        (NEW: localStorage store, device-only)
│     │  ├─ navigation.ts            (NEW: pure next_step + related resolver)
│     │  ├─ freshness.ts             (NEW: pure fresh/stale/unavailable + informationStatus policy)
│     │  ├─ githubReport.ts          (NEW: pure GitHub-issue URL builder; no network, no secret)
│     │  ├─ report.ts                (NEW, FUTURE: pure server-side report validation; unused in MVP)
│     │  └─ strings.ts               (EXTEND: new Cebuano strings, additive keys)
│     ├─ components/
│     │  ├─ ReadinessChecklist.tsx   (NEW)
│     │  ├─ NavigationBlock.tsx      (NEW)
│     │  └─ FreshnessNotice.tsx      (NEW; thin wrapper over existing Notice; stale/unavailable + status label)
│     └─ app/
│        └─ andam/[id]/page.tsx      (NEW: per-service readiness + navigation + freshness/status + report control)
```

No `/api/report` route exists in the MVP. Reporting uses the client-only GitHub-issue path; `report.ts` is Future scaffolding only.

### Data-flow description

Readiness checklist (device-only, no server):

```
kb.json ──▶ kb.ts ──▶ readiness.deriveItems(entry) ──▶ ReadinessChecklist
                                      ▲                        │ state change
                          readinessStore (localStorage) ◀──────┘
```

Verified navigation (read-only, no server):

```
kb.json ──▶ kb.ts ──▶ navigation.resolveNavigation(entry, kb) ──▶ NavigationBlock (links + next step)
```

Freshness + information status (display):

```
entry.{last_verified, review_status, review_due} ──▶ freshness.informationStatus(entry, STALE_THRESHOLD_DAYS)
                                   │
                                   ├─ verified      ──▶ show date + clarifier
                                   ├─ needs_review  ──▶ show date + Stale/Needs-review notice + clarifier
                                   ├─ unconfirmed   ──▶ show "unconfirmed" notice
                                   └─ unavailable   ──▶ distinct "date unavailable" notice
                                      (Ask path keeps refusal / not-confident; readiness view shows the notice)
```

Reporting (client-only, open-source):

```
user ──▶ report control ──▶ githubReport.buildGithubIssueUrl({repo, serviceId, field, explanation, source})
                                   │
                                   ├─ repo set    ──▶ open https://github.com/<repo>/issues/new?... (new tab)
                                   └─ repo unset  ──▶ show Cebuano "confirm with the office" fallback
```

---

## KB Schema Extension

Five new **optional** fields may be added to a KB entry, authored in the same `/kb/*.yaml` files from the same official source as the rest of the entry.

| Field | Type | Meaning | Required when present |
| --- | --- | --- | --- |
| `next_step` | text | Official next action after completing the service (English). | Non-empty text. |
| `next_step_ceb` | text | Cebuano wording of `next_step`. | Non-empty text. |
| `related` | list of ids | `id` values of officially related KB entries. | List of lowercase-hyphenated id strings. |
| `review_status` | enum | One of `verified`, `needs_review`, `unconfirmed`. | Must be one of the three values. |
| `review_due` | date | Date the entry is due for rechecking. | Must be a real calendar date. |

All are optional. The four existing entries define none of them and stay valid unchanged (Requirements 8.5, 10.5, 14.7).

### `sync-data.mjs` extension

New fields are appended **only when present** in the source YAML, so `kb.json` gains them only for entries that define them (Requirements 10.6, 14.1).

```js
// after the existing entry fields are assembled:
const next_step = str(doc.next_step);
if (next_step) entry.next_step = next_step;
const next_step_ceb = str(doc.next_step_ceb);
if (next_step_ceb) entry.next_step_ceb = next_step_ceb;
const related = list(doc.related);
if (related.length) entry.related = related;
const review_status = str(doc.review_status);
if (review_status) entry.review_status = review_status;
const review_due = str(doc.review_due);
if (review_due) entry.review_due = review_due;
```

`str` and `list` already exist in the script. Entries without the fields serialize exactly as today, so both `kb.ts` and `backend/lib/ask.mjs` keep reading the same shape (Requirement 8.4).

### `validate-kb.mjs` extension

Extend the known-fields set and add conditional checks. Existing checks are untouched.

```js
const OPTIONAL = [ /* existing */ , "next_step", "next_step_ceb", "related", "review_status", "review_due" ];
// KNOWN already spreads OPTIONAL, so the new fields become recognized (Requirement 10.1).
```

New conditional checks (run only when the field is present), added after the existing checks inside `checkFile`:

- If `next_step` is defined, it must be non-empty text, else error `next_step must be non-empty text` (Requirement 10.2).
- If `next_step_ceb` is defined, it must be non-empty text.
- If `related` is defined, it must be an array where every element matches `/^[a-z0-9]+(-[a-z0-9]+)*$/`, else error `related must be a list of lowercase-hyphenated ids` (Requirement 10.3).
- If `review_status` is defined, it must be one of `verified`, `needs_review`, `unconfirmed`, else error `review_status must be one of: verified, needs_review, unconfirmed` (Requirement 14.6).
- If `review_due` is defined, it must be a real calendar date (reuse `toDateString`), else error `review_due must be a real date like 2026-10-14` (Requirement 14.6).

```js
if ("review_status" in doc && !["verified", "needs_review", "unconfirmed"].includes(doc.review_status))
  errors.push("review_status must be one of: verified, needs_review, unconfirmed");
if ("review_due" in doc && toDateString(doc.review_due) === null)
  errors.push("review_due must be a real date like 2026-10-14");
```

**Duplicate-normalized requirements check (prevents silent shared checklist state).** Within a single KB entry, two requirement items whose *normalized* text is identical would produce the same `requirementKey` and could silently share one stored checklist state. The validator MUST reject any entry containing two or more requirements with identical normalized text. The normalization is the **same** rule used by `requirementKey`: **trim leading/trailing whitespace and collapse internal whitespace runs to a single space; preserve case and punctuation**. Checked independently for `requirements` and `requirements_ceb`.

```js
// inside checkFile, after the requirements / requirements_ceb shape checks.
const normReq = (s) => String(s).trim().replace(/\s+/g, " ");
for (const field of ["requirements", "requirements_ceb"]) {
  if (!Array.isArray(doc[field])) continue;
  const seen = new Set();
  let dup = false;
  for (const item of doc[field]) {
    const n = normReq(item);
    if (seen.has(n)) { dup = true; break; }
    seen.add(n);
  }
  if (dup) errors.push(`${field} contains duplicate items after normalization`);
}
```

This matches existing validator conventions (duplicate `id`, `requirements_ceb` length mismatch) and is backward compatible: the four existing entries carry no normalized-duplicate requirements, so they stay valid.

Cross-entry check (Requirement 10.4): `related` ids must resolve to a validated entry. The resolution check runs in a **second pass** after all files are read, using the already-collected `seenIds` map (only over files that passed their own checks). Any `related` id not present among validated ids produces an error for the referencing file.

```js
// second pass, after the per-file loop, before the summary:
for (const { file, doc } of passed) {
  for (const rid of (Array.isArray(doc.related) ? doc.related : [])) {
    if (!seenIds.has(rid)) { /* record error for file, increment failed */ }
  }
}
```

Backward compatibility: all existing entries omit the new fields, so every new check is skipped for them and validation stays green (Requirements 10.5, 14.7).

---

## Components and Interfaces

### Readiness checklist — `src/lib/readiness.ts` (pure)

```ts
export type ItemState = "HAS" | "STILL_NEEDS" | "NEEDS_TO_CONFIRM";

/** `key` is a stable identity derived from the requirement text, not the array index. */
export interface ChecklistItem { index: number; key: string; text: string; state: ItemState; }

/**
 * Trims leading/trailing whitespace and collapses internal whitespace runs to a single space.
 * Preserves case and punctuation (no case folding, no punctuation changes). Deterministic and pure.
 */
export function normalizeRequirement(text: string): string;

/** Stable identity for a requirement: a short, stable hash of normalizeRequirement(text). */
export function requirementKey(text: string): string;

/**
 * One item per requirements_ceb element, falling back to requirements. Same order, same count.
 * `stored` is keyed by requirementKey, so state follows the requirement text, not its position.
 */
export function deriveItems(entry: KbEntry, stored: Record<string, ItemState>): ChecklistItem[];

/** True when the source list (requirements_ceb || requirements) is empty/missing. */
export function hasNoRequirements(entry: KbEntry): boolean;

/** Counts per state across items. */
export function counts(items: ChecklistItem[]): Record<ItemState, number>;

/** True only when every item is HAS AND there is at least one item. */
export function isComplete(items: ChecklistItem[]): boolean;

/** Verified-only next hint; safe fallback. Never invents an action or claims acceptance. */
export function nextRecommendedAction(entry: KbEntry, items: ChecklistItem[]): string;
```

Rules:
- Source list is `entry.requirements_ceb` if it is a non-empty array, otherwise `entry.requirements` (Requirements 1.1, 1.2).
- Item text is copied verbatim; no reordering, adding, removing, or rewording (Requirements 1.3, 1.4).
- **Stable requirement identity.** Each item's `key` is `requirementKey(text)`:
  - `normalizeRequirement(text)` trims ends and collapses every internal whitespace run to a single space; it changes nothing else — no case folding, no punctuation changes — so `"Valid ID"` and `"valid id"` stay distinct keys while `"  Valid   ID "` and `"Valid ID"` map to the same key.
  - `requirementKey` returns a short, stable hash of that normalized form; pure and deterministic across reorders and sessions.
  - Persistence is keyed by KB entry `id` **plus** this per-requirement `key`, never by array index, so a saved selection can never transfer to a different requirement.
  - **Uniqueness is guaranteed upstream, not fabricated at runtime.** The validator rejects normalized-duplicate requirements, so by the time `deriveItems` runs, keys within an entry are unique. If a duplicate key ever appeared (e.g. hand-edited `kb.json`), the keys stay stable/text-based and the two items resolve to the same stored state rather than being disambiguated by position.
- Default state for an item whose `key` has no stored value is `STILL_NEEDS` (Requirement 2.2).
- A stored entry whose `key` matches no current item is not read (harmless orphaned state) (Requirement 3.3).
- `isComplete` returns `false` for an empty list (Requirements 1.5, 2.5).
- `nextRecommendedAction` returns `entry.next_step_ceb || entry.next_step` when present; else a Cebuano hint based on remaining STILL_NEEDS/NEEDS_TO_CONFIRM counts; else the generic "confirm with the office" fallback. It never invents a step and never claims eligibility or acceptance; it is distinct from `NavigationBlock`'s next-step display (Requirement 16).

**Identity-driven persistence behavior:**
- **Reorder:** moving requirements preserves each saved state (resolved by `key`, not position).
- **Remove:** deleting a requirement drops only that requirement's state; the orphaned stored entry is ignored.
- **Add:** a newly added requirement has no stored key, so it defaults to `STILL_NEEDS`.
- **No cross-transfer:** a selection saved for one requirement can never appear on a different requirement.

### Readiness store — `src/lib/readinessStore.ts` (client, device-only)

```ts
const KEY = "ayasib.readiness.v1";   // versioned key; bump on any state-shape change

/** Returns the saved state map for an entry, keyed by requirementKey. Safe: {} on any failure. */
export function loadStates(id: string): Record<string, ItemState>;
/** Best-effort persist of one requirement's state by its stable key; swallows errors. */
export function saveState(id: string, key: string, state: ItemState): void;
```

- Keyed by KB entry `id` and the stable requirement `key`, never by array index (Requirement 3.1). On-disk shape: `{ [entryId]: { [requirementKey]: ItemState } }` under the versioned `KEY`.
- On reopen, states are restored by each current item's `key` (Requirement 3.2); restored states survive reordering.
- If `localStorage` is unavailable, unreadable, or malformed, `loadStates` returns `{}` and the UI falls back to all-`STILL_NEEDS` without throwing (Requirement 3.4).
- Reads/writes `localStorage` only; nothing is sent to any server (Requirement 3.5).

### Readiness component — `ReadinessChecklist.tsx`

- Renders derived items, a three-state control per item, a per-state count summary, a readiness-complete indicator when `isComplete`, and the Cebuano `nextRecommendedAction` line (Requirements 2.3, 2.4, 2.5, 16).
- When `hasNoRequirements(entry)` is true, renders a Cebuano "no requirements available" message instead of an empty list (Requirement 1.5).
- Reads initial state via `loadStates(id)` on mount; resolves each item by its stable `key`; calls `saveState(id, item.key, state)` on change.
- **Mobile usability.** Reuses existing `globals.css` conventions (`.list`/`.list label`, `.card`/`.card-body`, full-width controls, no horizontal overflow). No new design system.

### Verified navigation — `src/lib/navigation.ts` (pure)

```ts
export interface RelatedLink { id: string; label: string; }      // label = name_ceb || name_en
export interface Navigation { nextStep: string | null; related: RelatedLink[]; }

/** Resolves next_step (ceb preferred) and related ids against the KB. Omits anything absent/unresolved. */
export function resolveNavigation(entry: KbEntry, kb: KbEntry[]): Navigation;
```

Rules:
- `nextStep` is `entry.next_step_ceb || entry.next_step`, or `null` when neither is present/non-empty (Requirements 4.1, 4.5).
- Each `related` id resolves via `kb.find`; unresolved ids omitted, remaining ids shown (Requirements 4.2, 4.3).
- Order follows the `related` array; duplicates collapse to the first occurrence (Requirement 4.4).
- When `related` is missing/empty/unresolved, `related` is `[]` and the UI omits the section (Requirement 4.6).
- Reads only `next_step`, `next_step_ceb`, and `related`; invents nothing (Requirements 4.7, 9.1, 9.3).

### Navigation component — `NavigationBlock.tsx`

- Renders next-step text when `nextStep` is non-null, and a list of links (one per `RelatedLink`, linking to `/andam/{id}`) when `related` is non-empty. Renders nothing when both are empty.

### Freshness + information status — `src/lib/freshness.ts` (pure)

```ts
export const STALE_THRESHOLD_DAYS = readStaleThreshold(); // single config constant, default 180

export type Freshness =
  | { kind: "unavailable" }
  | { kind: "fresh"; verified: string; ageDays: number }
  | { kind: "stale"; verified: string; ageDays: number };

/** Evaluates last_verified against the threshold. now defaults to Date.now() for testability. */
export function evaluate(lastVerified: string, thresholdDays?: number, now?: number): Freshness;

export type InformationStatus = "verified" | "needs_review" | "unconfirmed" | "unavailable";

/** Freshness Policy: combines evaluate() with optional review_status + review_due. Pure. */
export function informationStatus(entry: KbEntry, thresholdDays?: number, now?: number): InformationStatus;
```

- `STALE_THRESHOLD_DAYS` comes from a single configurable value; default 180 when absent or not a positive whole number of days (Requirement 5.2).
- **`evaluate` — three classifications.** `unavailable` when `last_verified` is missing, unparseable, or future (Requirement 5.5) — a first-class state carrying no date, never implying freshness. `stale` when age is strictly greater than the threshold (Requirement 5.3); `fresh` when age ≤ threshold (Requirement 5.4).
- **`informationStatus` — Freshness Policy precedence (testable).** Given an entry:
  1. If `review_status` is `unconfirmed` → `unconfirmed`.
  2. Else if `review_status` is `needs_review` OR (`review_due` present AND on/before today) OR `evaluate()` is `stale` → `needs_review`.
  3. Else if `evaluate()` is `fresh` → `verified`.
  4. Else (`evaluate()` is `unavailable`) → `unavailable`.
  When `review_status` and `review_due` are both absent, `informationStatus` reduces exactly to the fresh/stale/unavailable mapping — no behavior change for the four existing entries (Requirements 14.2, 14.3). The status is derived only from `last_verified`, `review_status`, and `review_due`; never fabricated (Requirement 14.4).

**Two consuming paths, reconciled.**
- **Ask path.** Unchanged. `ask.ts` returns `notConfident()` unless the entry has both `source_url` and `last_verified`; an unparseable/future `last_verified` keeps that refusal. The Ask answer never shows an "unavailable" notice — it refuses, as today (Requirements 5.6, 8.2, 9.4).
- **Per-service readiness view (`/andam/[id]`).** Renders the computed status directly: a date + clarifier for `verified`, a needs-review/stale notice + clarifier, an "unconfirmed" notice, or the distinct "verification date unavailable" notice — never a fabricated date.

**Clarifier.** Whenever a verification date or a Verified status is shown, the UI appends a short Cebuano clarifier that it is not a guarantee that current requirements are unchanged (Requirement 14.5). Uses `freshness.clarifier`.

### Freshness component — `FreshnessNotice.tsx`

- Thin wrapper over the existing `Notice`. Renders the Cebuano status label (`statusVerified` / `statusNeedsReview` / `statusUnconfirmed`) plus the clarifier for the shown-date cases; for `needs_review`/`stale` renders the stale notice; for `unconfirmed` the unconfirmed notice; for `unavailable` a **distinct** notice using `freshness.unavailable` that never implies freshness or shows a fabricated date. Mounted only on the readiness view; the Ask path never mounts it for the unavailable case (it refuses instead).

### Reporting — GitHub Issues (MVP, open-source) — `src/lib/githubReport.ts` (pure)

The MVP reporting path is **client-only and open-source**: a "report outdated info" control on `/andam/[id]` builds a prefilled GitHub issue URL and opens it in a new tab. The user submits it with their own GitHub account. No server call, no database, no secret.

```ts
// Repo from build-time constant NEXT_PUBLIC_GITHUB_REPO = "owner/name"; null => caller shows fallback.
export function buildGithubIssueUrl(input: {
  repo: string | null;
  serviceId: string;
  field?: string;
  explanation?: string;
  source?: string;
}): string | null;  // https://github.com/<owner>/<name>/issues/new?title=...&body=... (URL-encoded); null when repo unset
```

- Honest copy: the control states it "opens a GitHub issue for maintainer review." It does **not** claim AyaSib stored or queued the report (Requirements 6.1, 6.2).
- No KB write; a maintainer reviews the issue against an official source before any change (Requirement 6.3).
- If `NEXT_PUBLIC_GITHUB_REPO` is unset, `buildGithubIssueUrl` returns `null` and the UI shows a plain Cebuano "confirm with the office" message (Requirement 6.4).
- The repo for this project is `methuselahnoreen/AyaSib` (public; not a secret). It is read from the build-time constant, not hardcoded in the pure function.

#### Deferred: durable server-side intake (Future)

A `POST /api/report` route + durable queue stays Future — no database exists and the Vercel filesystem is ephemeral (Requirement 6.5). The pure `report.ts` `validateReport` scaffolding is kept for that future path and is unused by the GitHub-issue path.

```ts
// FUTURE: used only when a durable server-side report store ships. Not wired to any route in the MVP.
export const REPORT_LIMITS = { message: 2000 };
export type ReportValidation =
  | { ok: true; id: string; message: string }
  | { ok: false; code: ApiErrorCode; message: string };
export function validateReport(body: Record<string, unknown>, knownIds: Set<string>): ReportValidation;
```

---

## Data Models

Additions to `src/lib/types.ts`. **Existing types stay intact**; only optional fields and new interfaces are added.

```ts
export interface KbEntry {
  // ... all existing fields unchanged ...
  requirements_ceb?: string[];
  next_step?: string;
  next_step_ceb?: string;
  related?: string[];
  review_status?: "verified" | "needs_review" | "unconfirmed";
  review_due?: string;
}

// FUTURE (durable server-side reporting is deferred; unused in the MVP):
export interface ReportRequest { id: string; message: string; }
export interface ReportResponse { received: true; message: string; }
```

`ApiErrorCode` is reused unchanged.

### Strings additions (`src/lib/strings.ts`, additive keys)

```ts
readiness: {
  title: "Andam na?",
  noRequirements: "Walay lista sa mga kinahanglanon alang niini nga serbisyo.",
  has: "Naa na", stillNeeds: "Kinahanglan pa", needsConfirm: "Susihon",
  complete: "Andam na! Kompleto na ang imong mga dokumento.",
  counts: "Naa na: {has} · Kinahanglan pa: {need} · Susihon: {confirm}",
  nextAction: "Sunod nga buhaton",
},
navigation: { nextStep: "Sunod nga lakang", related: "Kaugnay nga serbisyo" },
freshness: {
  stale: "Kini nga impormasyon dugay na na-verify. Palihug kumpirmaha sa opisina kay mahimong nausab na.",
  unavailable: "Walay petsa sa pag-verify alang niini. Palihug kumpirmaha sa opisina.",
  clarifier: "Ang petsa sa pag-verify dili garantiya nga wala mausab ang mga kinahanglanon karon.",
  statusVerified: "Na-verify", statusNeedsReview: "Kinahanglan susihon", statusUnconfirmed: "Wala pa ma-kumpirma",
},
report: {
  button: "I-report nga luma na ang impormasyon",
  intro: "Mag-abli kini og GitHub issue para susihon sa maintainer. Walay datos nga itipig sa AyaSib.",
  fallback: "Kung naay sayop, palihug kumpirmaha sa opisina.",
},
```

All first-draft Cebuano, flagged for native review like the rest of the file. No `serverText` report confirmation is added (the GitHub-issue path makes no server call).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

PBT applies to the pure logic: checklist derivation, stable identity, state resolution across reorder/add/remove, navigation resolution, date/threshold arithmetic, information-status precedence, next-action selection, and URL building. UI rendering and `localStorage` side effects are covered by example/integration tests, not properties.

### Property 1: Checklist mirrors the source requirements list
*For any* KB entry with a non-empty requirements list, `deriveItems` produces exactly one item per source element, in the same order, with text equal to the source element and no added/removed/reworded items; the source list is `requirements_ceb` when present and non-empty, otherwise `requirements`.
**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Default and stored state resolution by stable key
*For any* KB entry and any stored-state map keyed by `requirementKey`, every derived item has exactly one of the three states; an item whose key has no stored value resolves to `STILL_NEEDS`, an item whose key has a stored value resolves to that value, and a stored entry whose key matches no current item is never read.
**Validates: Requirements 2.1, 2.2, 3.3**

### Property 3: Completeness requires a non-empty all-HAS list
*For any* list of checklist items, `isComplete` returns true iff the list is non-empty and every item is `HAS`; an empty source list is never reported complete.
**Validates: Requirements 1.5, 2.5**

### Property 4: State counts are exhaustive and consistent
*For any* list of checklist items, the three per-state counts sum to the number of items, and each count equals the number of items in that state.
**Validates: Requirements 2.4**

### Property 5: Readiness store round-trip and safe fallback
*For any* KB id, requirement `key`, and valid state, saving then loading returns that state for that key; when the store is unavailable or malformed, loading returns an empty map so all items fall back to `STILL_NEEDS` without error.
**Validates: Requirements 3.1, 3.2, 3.4**

### Property 6: Persistence survives reorder, add, and remove by stable identity
*For any* KB entry, assignment of states, and any permutation/insertion/deletion of the source list: after re-deriving against the same stored map, each surviving requirement keeps its saved state regardless of new position; a newly added requirement resolves to `STILL_NEEDS`; a removed requirement's state affects no remaining item.
**Validates: Requirements 3.1, 3.2**

### Property 7: No cross-transfer of saved state between requirements
*For any* two requirements with different normalized text, `requirementKey` yields different keys, so a state saved for one is never resolved onto the other — even when the second occupies the first's old position.
**Validates: Requirements 3.1, 9.1**

### Property 8: Distinct items within an entry never share a stored-state key
*For any* KB entry that passes validation, no two requirements normalize equal (the validator rejects normalized duplicates in `requirements` and `requirements_ceb`); therefore every derived item has a unique `requirementKey`.
**Validates: Requirements 3.1, 3.2, 10.5**

### Property 9: Navigation resolves only existing, deduplicated, ordered related ids
*For any* KB entry and KB array, `resolveNavigation` returns related links only for ids that resolve to an existing entry, with no duplicate id, preserving first-appearance order; empty when `related` is absent/empty/fully unresolved.
**Validates: Requirements 4.2, 4.3, 4.4, 4.6**

### Property 10: Navigation never invents a next step
*For any* KB entry, `resolveNavigation` returns a non-null next step only when `next_step_ceb` or `next_step` is present and non-empty, equal to the source field; otherwise null.
**Validates: Requirements 4.1, 4.5, 4.7, 9.1, 9.3**

### Property 11: Freshness classification matches the threshold boundary
*For any* valid non-future `last_verified` and positive threshold, `evaluate` returns `stale` exactly when age in days is strictly greater than the threshold and `fresh` exactly when age ≤ threshold.
**Validates: Requirements 5.3, 5.4**

### Property 12: Unavailable last_verified is a distinct classification
*For any* `last_verified` that is missing, unparseable, or future, `evaluate` returns `unavailable` — never `fresh`/`stale` — carrying no date. The Ask path treats it as not-confident; the readiness view renders the distinct unavailable notice; neither fabricates a date or implies freshness.
**Validates: Requirements 5.5, 5.6**

### Property 13: Threshold defaults safely
*For any* configured threshold that is absent or not a positive whole number of days, the effective threshold is 180.
**Validates: Requirements 5.2**

### Property 14: Information status follows the documented precedence
*For any* KB entry and threshold, `informationStatus` returns `unconfirmed`, `needs_review`, `verified`, or `unavailable` per the precedence (unconfirmed > needs_review/stale/due > verified > unavailable); and when `review_status` and `review_due` are both absent it reduces exactly to the fresh/stale/unavailable mapping.
**Validates: Requirements 14.2, 14.3, 14.4**

### Property 15: Next recommended action never invents and falls back safely
*For any* KB entry and item list, `nextRecommendedAction` returns the `next_step`-derived hint only when that field is present; otherwise guidance from remaining item counts or the generic "confirm with the office" fallback; never an invented step or an acceptance claim.
**Validates: Requirements 16.1, 16.2, 16.3**

### Property 16: GitHub issue URL is well-formed or safely absent
*For any* input, `buildGithubIssueUrl` returns null when `repo` is null; otherwise a URL targeting `https://github.com/<repo>/issues/new` whose query encodes the service id, field, explanation, and source, with all values URL-encoded.
**Validates: Requirements 6.1, 6.4**

---

## Error Handling

- **No new API route in the MVP.** Reporting uses the client-only GitHub-issue path; the existing routes and their `{ error: { code, message } }` contract are untouched.
- **Client-side graceful failure.** `readinessStore.loadStates` swallows any `localStorage` error and returns `{}`; `saveState` is best-effort. The checklist always renders using defaults.
- **Feature omission over error.** Missing navigation/status data renders nothing, never a fabricated value.
- **Unavailable freshness is explicit, never silent on the readiness view;** on the Ask path it folds into the existing not-confident refusal.
- **Reporting fallback.** When `NEXT_PUBLIC_GITHUB_REPO` is unset, the UI shows the Cebuano "confirm with the office" message instead of a broken link.

---

## Security Considerations

- **No new server attack surface in the MVP.** No new API route, database, or external service. Reporting is a client-only link to GitHub; no untrusted input reaches any AyaSib server.
- **No secrets in the browser.** `NEXT_PUBLIC_GITHUB_REPO` is a public repo path, not a secret; server-only keys (Cloudflare, LLM) remain server-side (Requirement 15.5).
- **Device-only persistence.** Readiness states live in `localStorage` and are never transmitted (Requirement 3.5).
- **Minimal data.** The checklist works without identity-document uploads or sensitive personal data (Requirement 15.6).
- **No public KB writes.** No MVP code path writes `/kb/*.yaml` or `kb.json`; readiness, freshness, and reporting are read-only over the shipped data.
- **Future (durable reporting):** the designed safeguards carry over — message treated strictly as data, existing `rateLimit`/size limits, and no KB writes.

---

## Testing Strategy

### Mandatory tests (required for the MVP)
1. **Checklist derivation** — mirrors source (count, order, verbatim text, fallback), empty-list message, never-complete. (Properties 1, 3, 4)
2. **Persistence across reorder/add/remove with stable identity** — no-cross-transfer and unique-key guarantees, store round-trip, safe `{}` fallback. (Properties 2, 5, 6, 7, 8)
3. **Freshness + information status** — threshold boundary; distinct `unavailable` for missing/unparseable/future dates; status precedence (verified/needs_review/unconfirmed/unavailable); safe threshold default. (Properties 11, 12, 13, 14)
4. **Navigation resolution + non-invention.** (Properties 9, 10)
5. **Next recommended action + GitHub-issue URL** — non-invention/fallback; URL encoding and null fallback. (Properties 15, 16)
6. **Regression gate** — see below. Required.

### PBT library and configuration
- TypeScript under Vitest. Use **`fast-check`** (dev dependency; do not hand-roll generators).
- Each property test runs **≥ 100 iterations** (`fc.assert(fc.property(...), { numRuns: 100 })`).
- Tag each with `// Feature: ayasib-andam-na, Property {number}: {property_text}`.
- One property test per Correctness Property (Properties 1–16).

### Example / unit tests
Readiness-complete indicator; "no requirements" path; stale/fresh boundary at exactly the threshold; readiness view rendering each status notice vs the Ask path's refusal.

### KB validation tests
`next_step` empty fails; bad `related` id fails; unresolved `related` id fails; bad `review_status` value fails; bad `review_due` date fails; normalized-duplicate requirements fail (both lists); the four existing entries still pass.

### Eval cases (extend `eval/questions.json`, honest results)
A valid Cebuano question about a supported service; the same rephrased; a Filipino/English question; a vague/ambiguous question (refusal); an unsupported service (refusal); a service with unknown fee/processing time; an entry flagged `needs_review`/`unconfirmed`; a requirement with a verified related-service pathway; a missing requirement with no verified resolution (safe fallback); a community report that must not modify the KB automatically. No hardcoded pass rate; no removal of hard cases.

### Mobile usability check
New components reuse `globals.css` mobile-first conventions: touch targets at established sizes, no horizontal overflow at the 640px shell width, readable Cebuano. Lightweight render/inspection check.

### Regression gate (required)
The full existing Vitest suite **and** the eval set (`eval/questions.json` + `backend/scripts/eval.mjs`) must stay green, confirming Ask, Explain, Translate, OCR, the refusal behavior, and the `kb.json` shape are unchanged. Any regression blocks the MVP.

### README
Update the README to reflect actual working functionality (readiness checklist, freshness/status, navigation, GitHub-issue reporting) without claiming unimplemented capabilities.

---

## Backward Compatibility

| Existing artifact | Change | How it stays unchanged |
| --- | --- | --- |
| `src/lib/ask.ts` (refusal, `summaryIsGrounded`, `assembleAnswer`) | None | Not edited; freshness reuses, does not alter, its `last_verified` posture. |
| `backend/lib/ask.mjs` (eval mirror) | None | Not edited; reads the same `kb.json` shape. |
| `/api/ask|explain|translate|ocr` | None | Routes untouched; no new route in the MVP (Requirement 8.3). |
| `src/lib/http.ts` | None | Not edited; no new route consumes it in the MVP. |
| `src/lib/types.ts` | Additive only | Optional `KbEntry` fields + Future report types; existing types intact (Requirement 8.4). |
| `kb.json` shape | Additive only | New fields appear only where defined; existing fields and 4 entries unchanged (Requirements 8.4, 8.5). |
| `scripts/sync-data.mjs` | Additive pass-through | Existing assembly unchanged; new fields appended only when present (Requirement 10.6). |
| `backend/scripts/validate-kb.mjs` | Additive checks | Existing checks untouched; new checks skip entries without the fields (Requirements 10.5, 14.7). |
| `src/lib/strings.ts` | Additive keys | Existing keys unchanged. |
| `AnswerCard`, `Notice`, `Shell`, `PhotoReader`, `Logo`, `Splash` | None (Notice reused) | New components are separate; `Notice` is consumed, not modified. |
| `eval/questions.json` + `backend/scripts/eval.mjs` | Extended, not broken | New cases added; existing cases and the harness stay green (Requirement 8.6). |
| Existing Vitest suites | None | Not edited; must stay green (Requirement 11.4). |

The refusal mechanism ("Dili ko sigurado...") is preserved because `ask.ts` is not touched and freshness treats an unavailable date as not-confident on the Ask path (Requirements 8.2, 9.4).

---

## MVP vs Stretch Scope

| Requirement | Capability | Scope | Rationale |
| --- | --- | --- | --- |
| 1 | Readiness checklist derivation | **MVP** | Pure logic over existing fields. |
| 2 | Per-item states + counts + complete | **MVP** | Core. |
| 3 | Client-side persistence by stable identity | **MVP** | Device-only, no infra. |
| 4 (display) | Verified navigation rendering — invents nothing | **MVP** | Display over existing KB data. |
| 4 (authoring) | Authoring real `next_step`/`related` content | **Future** | Human-authored from official sources. |
| 5 | Freshness display + stale + unavailable | **MVP** | Honest first-class states. |
| 6 | Reporting via GitHub Issues (client-only) | **MVP** | Open-source, no new infrastructure. |
| 6/7 (server) | Durable server-side report queue/route | **Future** | Needs new, unapproved infrastructure. |
| 8 | Preservation / backward compatibility | **MVP** | Enforced by the regression gate. |
| 9 | No-invention guarantee | **MVP** | Core. |
| 10 | Additive KB schema + validation | **MVP** | Core. |
| 11 | Mandatory tests | **MVP** | Verifies the MVP. |
| 13 | Mobile usability | **MVP** | Reuses existing CSS. |
| 14 | Information-status model + freshness policy | **MVP** | Additive, open-source. |
| 15 | Safety & honesty constraints | **MVP** | Cross-cutting. |
| 16 | Next recommended action (verified-only) | **MVP** | Pure logic over verified data. |

No new database or external service is introduced for any MVP item. Authoring additional government content and a durable server-side report store are Future.

---

## Open Questions / Decisions

### Resolved
- **Reporting mechanism — GitHub Issues (open-source, no new infra).** The MVP report control opens a prefilled GitHub issue in the public repo for maintainer review; it stores nothing on any AyaSib server. A durable server-side queue is deferred until approved.
- **Report durability — deferred.** No database; Vercel functions are stateless with an ephemeral filesystem. A server-side durable queue is a Future feature.
- **Per-service view surfacing — dedicated `/andam/[id]` route** reachable from the Ask answer; keeps `AnswerCard` unchanged.
- **`requirements_ceb` typing — resolved.** Optional on `KbEntry`, reflecting what the pipeline already produces.

### Genuinely open
1. **Requirement-identity normalization.** `normalizeRequirement` = trim + collapse internal whitespace, no case folding or punctuation stripping. Confirm this, or whether a looser rule (e.g. case-insensitive) is preferred.
2. **Confirm the report repo.** `NEXT_PUBLIC_GITHUB_REPO = "methuselahnoreen/AyaSib"` is assumed from the earlier push. Confirm this is the public repo issues should file against.