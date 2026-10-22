# Implementation Plan: AyaSib — Andam Na?

## Overview

This plan implements additive capabilities on top of the working AyaSib application: a readiness checklist with stable-identity persistence, verified barangay-to-city navigation, freshness tracking with a distinct "verification date unavailable" state, an information-status model (Verified / Needs review / Unconfirmed / Unavailable) from a documented freshness policy, a verified-only next recommended action, and an open-source GitHub-issue reporting affordance. The approach is strictly additive: new pure-logic modules (`src/lib/{readiness,readinessStore,navigation,freshness,githubReport}.ts`), new components (`ReadinessChecklist`, `NavigationBlock`, `FreshnessNotice`), a new per-service view (`app/andam/[id]/page.tsx`), plus additive extensions to `types.ts`, `strings.ts`, `sync-data.mjs`, and `validate-kb.mjs`.

**Reporting is open-source and client-only (GitHub Issues).** The report control opens a prefilled GitHub issue in the public repo `methuselahnoreen/AyaSib` for maintainer review. It makes no server call, uses no database, and exposes no secret. A durable server-side report intake (an `/api/report` route and queue) stays a clearly-labeled **(Future)** item requiring approved durable storage. The pure `src/lib/report.ts` server-side validation is Future scaffolding only, wired to no route.

Implementation language is **TypeScript under Vitest**. Property-based tests use **`fast-check`** (dev dependency, already installed), each running 100+ iterations and tagged `// Feature: ayasib-andam-na, Property N`.

Tasks are sequenced **MVP-first, then Future**. MVP = Requirements 1-6, 8-16 (plus checkpoints and the mandatory regression gate). Future = a durable server-side report intake (Requirement 7) and human-authored government content.

**Mandatory tests** (not optional): checklist derivation; stable-identity persistence (reorder/add/remove, no-cross-transfer, distinct-key); freshness fresh/stale/unavailable + information-status precedence; navigation resolution + non-invention; next recommended action + GitHub-issue URL builder; KB validation incl. duplicate-normalized and `review_status`/`review_due`; and the regression gate.

**Non-invention constraint:** No MVP task authors new government content (`next_step`/`related`/`review_status`/`review_due` values for real services). That is a Future, human-authored, source-required task (Task 18).

## Tasks

- [x] 1. Add `fast-check` dev dependency and extend shared types
  - [x] 1.1 Add `fast-check` as a dev dependency
    - Add `fast-check` to `devDependencies` in `frontend/package.json` and install (already done this session)
    - _Design: Testing Strategy → PBT library and configuration_
    - _Requirements: 11.1_

  - [x] 1.2 Extend `src/lib/types.ts` with optional KB fields and Future report types
    - Add optional `requirements_ceb?: string[]`, `next_step?: string`, `next_step_ceb?: string`, `related?: string[]`, `review_status?: "verified" | "needs_review" | "unconfirmed"`, `review_due?: string` to `KbEntry` (existing fields unchanged)
    - Add Future-marked `ReportRequest { id: string; message: string }` and `ReportResponse { received: true; message: string }` (unused in the MVP)
    - Reuse existing `ApiErrorCode` unchanged
    - _Design: Data Models_
    - _Requirements: 8.4, 8.5, 10.1, 14.1_

- [x] 2. Implement readiness checklist pure logic (`src/lib/readiness.ts`) with stable identity + next action
  - [x] 2.1 Implement `normalizeRequirement`, `requirementKey`, `deriveItems`, `hasNoRequirements`, `counts`, `isComplete`, `nextRecommendedAction`
    - `normalizeRequirement(text)` = trim ends + collapse internal whitespace to a single space; preserve case and punctuation; pure/deterministic (the exact rule the validator duplicate check in Task 8.2 relies on)
    - `requirementKey(text)` = short stable hash of `normalizeRequirement(text)`
    - `deriveItems(entry, stored)` = one item per `requirements_ceb` element (fallback `requirements`), same order/count/text; each item carries `key = requirementKey(text)`; resolve stored state by `key` (never by index); default `STILL_NEEDS`; ignore stored entries whose key matches no current item; assume unique keys per entry (validator guarantees it) and never fabricate positional identity
    - `hasNoRequirements`, `counts`, `isComplete` (true only when non-empty and all `HAS`)
    - `nextRecommendedAction(entry, items)` = `entry.next_step_ceb || entry.next_step` when present; else Cebuano guidance from remaining STILL_NEEDS/NEEDS_TO_CONFIRM counts; else generic "confirm with the office" fallback; never invents, never claims acceptance
    - Export `ItemState` and `ChecklistItem` (`index`, `key`, `text`, `state`)
    - _Design: Components and Interfaces → Readiness checklist (pure)_
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.4, 2.5, 3.3, 9.1, 9.2, 16.1, 16.2, 16.3_

  - [x] 2.2 Mandatory property test — checklist derivation and source mirroring
    - **Property 1** — Tag: `// Feature: ayasib-andam-na, Property 1`; fast-check, numRuns 100
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 2.3 Mandatory property test — default and stored state resolution by stable key
    - **Property 2** — Tag: `// Feature: ayasib-andam-na, Property 2`; fast-check, numRuns 100
    - _Requirements: 2.1, 2.2, 3.3_

  - [x]* 2.4 Property test — completeness rule
    - **Property 3**; fast-check, numRuns 100
    - _Requirements: 1.5, 2.5_

  - [x]* 2.5 Property test — state-count consistency
    - **Property 4**; fast-check, numRuns 100
    - _Requirements: 2.4_

  - [x] 2.6 Mandatory property test — next recommended action non-invention and safe fallback
    - **Property 15** — Tag: `// Feature: ayasib-andam-na, Property 15`; fast-check, numRuns 100
    - _Requirements: 16.1, 16.2, 16.3_

- [x] 3. Implement device-only readiness store (`src/lib/readinessStore.ts`) keyed by stable identity
  - [x] 3.1 Implement `loadStates` and `saveState` over localStorage keyed by requirement identity
    - Versioned key `ayasib.readiness.v1`; on-disk shape `{ [entryId]: { [requirementKey]: ItemState } }`; keyed by KB `id` + stable `key`, never by position; device-only, no network
    - `loadStates(id)` returns `{}` on any failure; `saveState(id, key, state)` best-effort, swallows errors
    - _Design: Components and Interfaces → Readiness store; Security Considerations_
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 3.2 Mandatory persistence test — reorder / add / remove, no-cross-transfer, distinct keys
    - **Property 5** round-trip + safe fallback; **Property 6** survives reorder/add/remove; **Property 7** no cross-transfer; **Property 8** distinct items get distinct keys
    - Tags: `// Feature: ayasib-andam-na, Property 5/6/7/8`; fast-check, numRuns 100; mock `localStorage` incl. unavailable/malformed
    - _Requirements: 3.1, 3.2, 3.4, 9.1, 10.5_

- [x] 4. Implement verified navigation pure logic (`src/lib/navigation.ts`)
  - [x] 4.1 Implement `resolveNavigation`
    - `nextStep = entry.next_step_ceb || entry.next_step`, else null; resolve `related` ids via KB, omit unresolved, dedupe by id keeping first occurrence, preserve order; label = `name_ceb || name_en`; invent nothing
    - Export `RelatedLink`, `Navigation`
    - _Design: Components and Interfaces → Verified navigation (pure)_
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 9.1, 9.3_

  - [x] 4.2 Mandatory navigation resolution + non-invention test
    - **Property 9** resolve/dedupe/order; **Property 10** never invents a next step
    - Tags: `// Feature: ayasib-andam-na, Property 9/10`; fast-check, numRuns 100
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 9.1, 9.3_

- [x] 5. Implement freshness + information-status pure logic (`src/lib/freshness.ts`)
  - [x] 5.1 Implement `evaluate`, `readStaleThreshold`, `STALE_THRESHOLD_DAYS`, `informationStatus`
    - `readStaleThreshold()` default 180 when absent or not a positive whole number of days
    - `evaluate(lastVerified, thresholdDays?, now?)` returns `fresh | stale | unavailable` (unavailable when missing/unparseable/future, carries no date; stale when age > threshold; fresh when age ≤ threshold); `now` defaults to `Date.now()`
    - `informationStatus(entry, thresholdDays?, now?)` returns `verified | needs_review | unconfirmed | unavailable` by the documented precedence (unconfirmed > needs_review/stale/due > verified > unavailable); absent `review_status`/`review_due` reduces exactly to evaluate()'s fresh/stale/unavailable
    - Export `Freshness` and `InformationStatus`
    - _Design: Components and Interfaces → Freshness + information status (pure)_
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 9.2, 14.2, 14.3, 14.4_

  - [x] 5.2 Mandatory freshness + status test
    - **Property 11** threshold boundary; **Property 12** unavailable distinct (missing/unparseable/future); **Property 13** threshold default; **Property 14** information-status precedence incl. reduce-to-base when review fields absent
    - Tags: `// Feature: ayasib-andam-na, Property 11/12/13/14`; fast-check, numRuns 100
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 14.2, 14.3, 14.4_

- [x] 6. Implement GitHub-issue report URL builder (`src/lib/githubReport.ts`) — pure, no secret
  - `buildGithubIssueUrl({ repo, serviceId, field?, explanation?, source? })` returns null when `repo` is null; else `https://github.com/<repo>/issues/new?title=...&body=...` with all values URL-encoded; repo read from build-time `NEXT_PUBLIC_GITHUB_REPO` by the caller (default `methuselahnoreen/AyaSib`)
  - Pure, no network, no secret
  - _Design: Components and Interfaces → Reporting — GitHub Issues_
  - _Requirements: 6.1, 6.4_

  - [x] 6.1 Mandatory test — GitHub-issue URL builder
    - **Property 16** — well-formed URL (encoding, includes id/field/explanation/source, targets configured repo) or null when repo unset
    - Tag: `// Feature: ayasib-andam-na, Property 16`; fast-check, numRuns 100
    - _Requirements: 6.1, 6.2, 6.4_

- [x] 7. Extend Cebuano strings (`src/lib/strings.ts`)
  - Add additive keys under `t`: `readiness` (title, noRequirements, has, stillNeeds, needsConfirm, complete, counts, nextAction), `navigation` (nextStep, related), `freshness` (stale, unavailable, clarifier, statusVerified, statusNeedsReview, statusUnconfirmed), `report` (button, intro, fallback)
  - Leave all existing keys unchanged; add no `serverText` report confirmation (the GitHub path makes no server call)
  - _Design: Data Models → Strings additions_
  - _Requirements: 1.5, 2.3, 2.4, 2.5, 5.6, 5.8, 6.2, 14.5, 16.1_

- [x] 8. Extend KB pipeline for optional fields (backward compatible)
  - [x] 8.1 Extend `frontend/scripts/sync-data.mjs` pass-through
    - Append `next_step`, `next_step_ceb`, `related`, `review_status`, `review_due` only when present (reuse `str`/`list`); existing assembly unchanged
    - _Design: KB Schema Extension → sync-data.mjs extension_
    - _Requirements: 10.6, 8.4, 8.5, 14.1_

  - [x] 8.2 Extend `backend/scripts/validate-kb.mjs` known-fields and checks
    - Add the five fields to `OPTIONAL`; conditional checks: `next_step`/`next_step_ceb` non-empty text when defined; `related` a list of lowercase-hyphenated ids; `review_status` in {verified,needs_review,unconfirmed}; `review_due` a real date
    - Second pass: every `related` id must resolve to a validated entry
    - Mandatory duplicate-normalized-requirements check: reject an entry with two requirements that normalize equal (trim + collapse whitespace; preserve case/punctuation), independently for `requirements` and `requirements_ceb`
    - _Design: KB Schema Extension → validate-kb.mjs extension_
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.7, 14.6, 9.1_

  - [x] 8.3 Mandatory KB validation tests
    - Empty `next_step` fails; bad `related` id fails; unresolved `related` id fails; bad `review_status` value fails; bad `review_due` date fails; duplicate-normalized requirements fail (both lists); the four existing entries still pass (backward compatible)
    - _Design: Testing Strategy → KB validation tests_
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.7, 11.7, 14.6, 14.7, 9.1_

  - [x] 8.4 Regenerate `kb.json` and confirm existing entries unchanged
    - Run the sync build; confirm the four existing entries serialize identically and `kb.ts` / `backend/lib/ask.mjs` still read the same shape
    - _Design: KB Schema Extension; Backward Compatibility_
    - _Requirements: 10.5, 10.6, 8.4, 8.5_

- [x] 9. Checkpoint — pure logic + pipeline complete
  - Ensure all tests pass; ask the user if questions arise.

- [x] 10. Implement ReadinessChecklist component (`src/components/ReadinessChecklist.tsx`)
  - Render derived items with a three-state control per item, per-state counts, the complete indicator when `isComplete`, and the `nextRecommendedAction` line
  - When `hasNoRequirements(entry)`, render the Cebuano "no requirements" message instead of an empty list
  - Read `loadStates(id)` on mount; resolve each item by `key`; `saveState(id, item.key, state)` on change; strings only
  - _Design: Components and Interfaces → Readiness component_
  - _Requirements: 1.5, 2.3, 2.4, 2.5, 3.1, 3.2, 16.1_

- [x] 11. Implement NavigationBlock component (`src/components/NavigationBlock.tsx`)
  - Render next-step text when `nextStep` non-null; one link per `RelatedLink` (to `/andam/{id}`) when `related` non-empty; nothing when both empty; consume `resolveNavigation`; invent nothing
  - _Design: Components and Interfaces → Navigation component_
  - _Requirements: 4.1, 4.2, 4.5, 4.6_

- [x] 12. Implement FreshnessNotice component (`src/components/FreshnessNotice.tsx`) with status + distinct unavailable notice
  - Thin wrapper over existing `Notice`: render the Cebuano status label (statusVerified/statusNeedsReview/statusUnconfirmed) + clarifier for shown-date cases; stale/needs-review notice; a distinct `freshness.unavailable` notice that never implies freshness or shows a fabricated date
  - Mounted only on the readiness view; the Ask path keeps its refusal/not-confident behavior and never mounts the unavailable notice
  - _Design: Components and Interfaces → Freshness component_
  - _Requirements: 5.1, 5.3, 5.4, 5.6, 5.7, 5.8, 5.9, 5.10, 14.2, 14.5_

- [x] 13. Implement per-service view (`src/app/andam/[id]/page.tsx`)
  - Resolve the KB entry by route `id` from `kb.ts`; compose `ReadinessChecklist`, `NavigationBlock`, `FreshnessNotice`, and the GitHub-issue report control
  - Show the verified date + status when fresh/stale/verified/needs_review; show the distinct unavailable notice when unavailable
  - Report control: honest copy ("opens a GitHub issue for maintainer review"); build the URL via `buildGithubIssueUrl` with `NEXT_PUBLIC_GITHUB_REPO`; open in a new tab; degrade to the Cebuano "confirm with the office" message when repo unconfigured; no server call, no secret
  - Degrade gracefully when the entry is missing or lacks supporting data (omit the block; never fabricate)
  - _Design: Architecture; Components and Interfaces → Reporting; Freshness component_
  - _Requirements: 1.1, 4.2, 5.1, 5.10, 6.1, 6.2, 6.3, 6.4, 9.2, 14.2, 15.4_

- [x] 14. Ensure mobile usability of the readiness view and notices
  - Verify `ReadinessChecklist`, `NavigationBlock`, `FreshnessNotice`, and the report control render on a 360px viewport with no horizontal overflow, reusing existing `globals.css` conventions; no new design system
  - Each interactive checklist control ≥ 44×44 CSS px; all Cebuano text ≥ 16 CSS px; no existing responsive regression
  - _Design: Components and Interfaces → Readiness component (Mobile usability); Testing Strategy → Mobile usability check_
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 15. Checkpoint — UI wired, mobile usability verified
  - Ensure all tests pass; ask the user if questions arise.

- [x] 16. Extend the eval set (`eval/questions.json`)
  - Add required cases: a valid Cebuano question about a supported service; the same rephrased; a Filipino/English question; a vague/ambiguous question (refusal); an unsupported service (refusal); a service with unknown fee/processing time; an entry flagged `needs_review`/`unconfirmed`; a requirement with a verified related-service pathway; a missing requirement with no verified resolution (safe fallback); a community report that must not modify the KB automatically
  - Keep results honest (no hardcoded pass rate; no removal of hard cases)
  - _Design: Testing Strategy → Eval cases_
  - _Requirements: 11.8, 11.9_

- [x] 17. Regression gate — confirm existing behavior unchanged (mandatory)
  - Run the full existing Vitest suite (`vitest run`) AND the eval set (`backend/scripts/eval.mjs` over `eval/questions.json`)
  - Confirm Ask (source-backed answer + refusal), Explain, Translate, OCR, and the "Dili ko sigurado..." refusal/null cases are unchanged, and the `kb.json` shape consumed by `kb.ts` and `backend/lib/ask.mjs` is unchanged
  - Fix any regression by adjusting only the new/additive code (do not modify existing contracts)
  - **Status:** Vitest passes 106/106 (73 pre-existing unchanged + 33 new). `next build` + lint + typecheck clean. Both `kb.json` files byte-identical; `backend/lib/ask.mjs` and the eval harness untouched. The eval set's live run is **pending credentials**: `eval.mjs` routes through Cloudflare Workers AI, and no `CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_API_TOKEN` are present in this environment, so every case (new and pre-existing) returns `internal_error` from the credential guard. Harness machinery verified sound (all 4 services carry `source_title`; every non-null expected id resolves). Run `cd backend; npm run eval` with credentials to complete this half.
  - _Design: Testing Strategy → Regression gate; Backward Compatibility_
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6, 11.6, 11.9_

- [x] 18. Update the README to reflect actual working functionality
  - Document the readiness checklist, freshness/information-status, verified navigation, and the GitHub-issue report path; make no claim about unimplemented capabilities (the durable server-side report queue stays Future)
  - _Design: Testing Strategy → README_
  - _Requirements: 15 (honesty), 12.6_

- [x] 19. Final checkpoint — ensure all tests pass
  - Ensure all tests pass; ask the user if questions arise.

- [ ] 20. (Future) Author `next_step`/`related`/`review_status`/`review_due` for additional services — human-authored, source-required
  - [ ]* 20.1 (Future) Document and gate government-data authoring
    - MUST NOT be performed by a coding agent; values MUST be human-authored from the same official source as the rest of the entry — no invention, no inference
    - Coding-agent scope is limited to re-running `validate-kb.mjs` + sync to verify any human-authored entries pass
    - _Design: MVP vs Stretch Scope_
    - _Requirements: 4.7, 9.1, 9.3, 12.3_

## Future Section — Durable Server-Side Report Intake (requires approved durable storage)

> **Not in the MVP.** The MVP uses the client-only GitHub-issue path (Task 6/13). A durable server-side intake needs approved durable storage (no database exists; Vercel FS is ephemeral). These tasks ship only once durable, queryable storage and a defined review process exist (Requirements 7, 12.2, 12.5).

- [ ]* 21. (Future) Implement server-side report validation (`src/lib/report.ts`) as unwired scaffolding
  - `REPORT_LIMITS = { message: 2000 }`; `validateReport(body, knownIds)` succeeds only for a known id + usable message, rejects unknown id with `invalid_request`; pure, no I/O
  - _Design: Reporting → Deferred: durable server-side intake_
  - _Requirements: 6.5, 7.1, 7.4_

  - [ ]* 21.1 (Future) Example tests for report validation
    - Unknown-id rejection, missing/empty message, oversized message; wired to no route
    - _Requirements: 6.5, 7.4, 11.10_

- [ ]* 22. (Future) Implement `/api/report` route — requires durable storage
  - Compose `http.ts` helpers like `ask/route.ts`; `validateReport` against `new Set(kb.map(e => e.id))`; persist to an approved durable queue (never KB YAML/`kb.json`); route to human review; `failure` for errors
  - MUST NOT ship until approved durable storage exists; no console-log stand-in
  - _Design: Reporting → Deferred_
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ]* 22.1 (Future) Route integration tests for report intake
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 11.10_

## Notes

- **MVP = Tasks 1-19** (excluding optional `*` sub-tasks), including the mandatory regression gate (17). **Future = Tasks 20-22.**
- Tasks marked `*` are optional (non-mandatory test sub-tasks and all `(Future)` tasks).
- **Mandatory (non-optional) tests:** 2.2, 2.3, 2.6, 3.2, 4.2, 5.2, 6.1, 8.3, and the regression gate (17).
- **Reporting is open-source GitHub Issues** (client-only; Tasks 6, 13). No `/api/report` route ships in the MVP. The durable server-side intake (Tasks 21-22) is Future.
- Property tests (Properties 1-16) use `fast-check` with `numRuns: 100`, tagged `// Feature: ayasib-andam-na, Property N`.
- Checkpoints (Tasks 9, 15, 19) gate incremental progress; the regression gate (17) protects all preserved behavior and the `kb.json` shape.
- Repo for reports: `methuselahnoreen/AyaSib`, read from build-time `NEXT_PUBLIC_GITHUB_REPO`.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "5.1", "6", "7", "8.1", "8.2"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "3.2", "4.2", "5.2", "6.1", "8.3", "8.4", "21"] },
    { "id": 3, "tasks": ["10", "11", "12", "21.1", "22"] },
    { "id": 4, "tasks": ["13", "22.1"] },
    { "id": 5, "tasks": ["14", "16"] },
    { "id": 6, "tasks": ["17"] },
    { "id": 7, "tasks": ["18", "20.1"] }
  ]
}
```
