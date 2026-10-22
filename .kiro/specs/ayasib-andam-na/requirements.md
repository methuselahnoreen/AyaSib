# Requirements Document

## Introduction

This feature refines the existing AyaSib project into "AyaSib — Andam Na?", a Cebuano-first, source-verified government service readiness assistant for Cebu City. It adds these combined capabilities on top of the existing, working application:

1. A personalized **readiness checklist** that tracks, per government service, which required documents the user HAS, STILL NEEDS, or NEEDS TO CONFIRM — derived only from the service's existing `requirements`/`requirements_ceb` fields in the knowledge base.
2. **Verified barangay-to-city service navigation** that explains the correct next step and links related services only when that relationship is already present in the knowledge base.
3. **Government information freshness and status transparency** that surfaces each answer's `last_verified` date, computes a clear information status (Verified / Needs review / Unconfirmed / Unavailable) from a documented freshness policy, and warns honestly when a date is stale or unavailable.
4. **Open-source reporting of outdated information** via a client-only GitHub Issues path: a report control opens a prefilled GitHub issue in the project's public repository (`methuselahnoreen/AyaSib`) for maintainer review. It stores nothing on any AyaSib server, needs no database, and exposes no secret. A durable server-side report intake is deferred until approved durable storage exists.

The overriding design principle is non-invention: every fact shown to a user must trace to an existing knowledge base field. Where supporting data is absent, the system degrades gracefully (hides the feature for that entry) or refuses, consistent with the current refusal mechanism. The feature prefers minimal, additive changes to the existing schema, scripts, routes, and components, and must preserve all existing behavior and contracts.

The current deployment is Vercel-only (project root directory `frontend`), with stateless API routes and an ephemeral serverless filesystem that is not writable for durable data. Supabase and pgvector were dropped from the architecture, so there is no database and no approved durable, queryable storage in the project. Any feature that would require durable server-side storage is deferred until such infrastructure is approved.

The Existing_Behavior section at the end of the Glossary records the current baseline these requirements must not contradict.

## Glossary

- **System**: The AyaSib — Andam Na? application as a whole (the Next.js `frontend/` app plus the `backend/` libraries and scripts), unless a requirement names a more specific component.
- **Knowledge_Base** (KB): The curated set of `/kb/*.yaml` entries built by `frontend/scripts/sync-data.mjs` into `frontend/src/data/kb.json` and consumed by `frontend/src/lib/kb.ts` and `backend/lib/ask.mjs`.
- **KB_Entry**: A single government service record in the Knowledge_Base, with fields such as `id`, `name_en`, `name_ceb`, `locality`, `requirements`, `requirements_ceb`, `fee`, `office`, `processing_time`, `source_title`, `source_url`, `last_verified`, and `notes`.
- **Readiness_Checklist**: A per-service view listing every item from that KB_Entry's `requirements_ceb` (falling back to `requirements`) as an individually trackable checklist item.
- **HAS**: A checklist item state meaning the user has confirmed possession of that required document.
- **STILL_NEEDS**: A checklist item state meaning the user has confirmed the required document is not yet obtained. This is the default state for every item.
- **NEEDS_TO_CONFIRM**: A checklist item state meaning the user is unsure whether the required document applies to or is held by them.
- **Readiness_Store**: The client-side persistence (browser local storage) that holds a user's checklist item states keyed by KB_Entry `id` plus the item's Requirement_Identity.
- **Requirement_Identity**: A stable identifier for a single requirement item, derived from a normalized form of that requirement's source text (trim leading/trailing whitespace and collapse internal whitespace runs to a single space; preserve case and punctuation), so the identifier does not change when items are reordered.
- **Verified_Navigation**: Guidance that explains the next step after a service and links related services, shown only when that information already exists in the relevant KB_Entry.
- **Next_Step**: An optional, additive KB_Entry field describing the official next action after completing the service, sourced from the same official source as the entry.
- **Related_Service**: An optional, additive KB_Entry field listing the `id` values of other KB_Entries that are officially related to this service.
- **Next_Recommended_Action**: A single Cebuano next-step hint shown on the Readiness_Checklist, derived only from verified KB data, with a safe "confirm with the office" fallback.
- **Freshness**: The age of a KB_Entry's information, measured as the difference between the current date and the entry's `last_verified` date.
- **Stale_Threshold**: A configurable maximum Freshness age, in days, beyond which information is considered potentially outdated.
- **Stale_Warning**: A Cebuano-first notice shown when a displayed answer's Freshness exceeds the Stale_Threshold.
- **Verification_Date_Unavailable_Notice**: A Cebuano-first notice, distinct in message and meaning from the Stale_Warning, shown when a KB_Entry's `last_verified` value is missing, invalid, or in the future, stating that the verification date is unavailable.
- **Review_Status**: An optional, additive KB_Entry field with one of three values: `verified`, `needs_review`, or `unconfirmed`.
- **Review_Due**: An optional, additive KB_Entry date field; when present and on or before today, the entry is treated as due for rechecking.
- **Freshness_Policy**: The documented rule set that combines `last_verified` age, the Stale_Threshold, Review_Status, and Review_Due into a single displayed Information_Status.
- **Information_Status**: The computed reliability state shown to the user: Verified, Needs_Review, Unconfirmed, or Unavailable.
- **Readiness_View**: The per-service display that lists a KB_Entry's requirements, navigation, and freshness/status information, reachable through the Ask path or through direct navigation to a specific service.
- **GitHub_Issue_Report**: The client-only reporting affordance that opens a prefilled GitHub issue in the project's public repository (`methuselahnoreen/AyaSib`) for maintainer review; it stores nothing on any AyaSib server.
- **Report**: A user-submitted indication that a specific KB_Entry's information may be outdated or incorrect. In the MVP a Report is a GitHub_Issue_Report; a durable server-side report intake is a future/stretch capability.
- **Human_Review**: The manual process by which a maintainer reads a Report (a GitHub issue) and decides whether to update the Knowledge_Base against an official source; no Report is ever auto-published as a correction.
- **MVP_Scope**: The set of requirements that must ship for the hackathon minimum viable product.
- **Stretch_Scope**: Requirements that are explicitly out of scope for the MVP and may be implemented later.
- **Existing_Behavior**: The current, working baseline that must be preserved: the Ask system (`frontend/src/lib/ask.ts` source-backed answer and refusal; mirrored `backend/lib/ask.mjs` for eval), Explain, Translate, the Basaha/OCR photo reader, curated Cebuano content, the centralized Cebuano UI strings (`frontend/src/lib/strings.ts`), the refusal mechanism ("Dili ko sigurado..."), the `/api/ask|explain|translate|ocr` contracts, the `kb.json` shape, the validation script (`backend/scripts/validate-kb.mjs`), and the eval set (`eval/questions.json` + `backend/scripts/eval.mjs`). The deployment baseline is Vercel with root directory `frontend`; API routes are stateless and the serverless filesystem is ephemeral and not writable for durable data. Supabase and pgvector were dropped (per `docs/TASKS.md`), so the project has no database and no approved durable, queryable storage.

## Requirements

### Requirement 1: Readiness Checklist Derived from KB Requirements

**User Story:** As a Cebu City resident preparing for a government service, I want a checklist of exactly the required documents for that service, so that I can track what I already have and what I still need.

#### Acceptance Criteria

1. WHEN a user opens the Readiness_Checklist for a KB_Entry, THE System SHALL display one checklist item for each element of that KB_Entry's `requirements_ceb` list.
2. IF a KB_Entry has no `requirements_ceb` list, THEN THE System SHALL display one checklist item for each element of that KB_Entry's `requirements` list.
3. THE System SHALL display checklist items in the same order as the source `requirements_ceb` (or `requirements`) list, with the same number of items and no added, removed, or reworded items.
4. THE System SHALL derive every checklist item text only from the KB_Entry's `requirements_ceb` or `requirements` fields.
5. IF a KB_Entry has an empty or missing `requirements` list, THEN THE System SHALL display a Cebuano message stating that no requirements are available for that service and SHALL NOT display an empty checklist as if it were complete.

### Requirement 2: Per-Item Readiness States

**User Story:** As a user working through a checklist, I want to mark each document as something I have, still need, or need to confirm, so that I can see my overall readiness at a glance.

#### Acceptance Criteria

1. THE System SHALL assign each checklist item exactly one of three states: HAS, STILL_NEEDS, or NEEDS_TO_CONFIRM.
2. WHEN a checklist item is first displayed and has no stored state, THE System SHALL set its state to STILL_NEEDS.
3. WHEN a user selects a new state for a checklist item, THE System SHALL update that item to the selected state.
4. THE System SHALL display, for each KB_Entry's Readiness_Checklist, a count of items in each of the three states.
5. WHEN all items of a Readiness_Checklist are in the HAS state, THE System SHALL display a Cebuano readiness-complete indicator for that service.

### Requirement 3: Client-Side Persistence of Checklist States

**User Story:** As a user who returns to the app later, I want my checklist progress to be remembered on my device and to stay attached to the correct document even if the list changes, so that I do not lose or misattribute which documents I have.

#### Acceptance Criteria

1. WHEN a user changes a checklist item state, THE System SHALL persist that state to the Readiness_Store keyed by KB_Entry `id` plus that item's Requirement_Identity, and SHALL NOT key the saved state by array position alone.
2. WHEN a user reopens the Readiness_Checklist for a KB_Entry, THE System SHALL restore each item's state by matching the item's Requirement_Identity to the stored Requirement_Identity.
3. WHEN a KB_Entry's requirements are reordered without changing their source text, THE System SHALL keep each saved state attached to its original requirement text.
4. WHEN a requirement is removed from a KB_Entry, THE System SHALL drop only that requirement's saved state and SHALL retain the saved states of the remaining requirements.
5. WHEN a requirement is added to a KB_Entry, THE System SHALL treat that requirement as new and assign it the default STILL_NEEDS state.
6. THE System SHALL NOT transfer a previously saved selection from one requirement to a different requirement.
7. IF the Readiness_Store contains a state whose Requirement_Identity does not match any current requirement of the KB_Entry, THEN THE System SHALL ignore that stored state.
8. IF the Readiness_Store is unavailable or cannot be read, THEN THE System SHALL fall back to the default STILL_NEEDS state for all items and SHALL continue to function without error.
9. THE System SHALL persist Readiness_Store data only on the user's device and SHALL NOT transmit checklist states to any server.

### Requirement 4: Verified Navigation and Related-Service Linking

**User Story:** As a user who finished one service, I want to know the correct next step and any officially related services, so that I can navigate from barangay to city processes with confidence.

#### Acceptance Criteria

1. WHEN the System displays the answer for a KB_Entry and that KB_Entry contains a non-empty `next_step` value, THE System SHALL display that Next_Step text with the answer for that service.
2. WHEN the System displays the answer for a KB_Entry and that KB_Entry contains a non-empty `related` list, THE System SHALL display one link per `related` entry whose `id` resolves to an existing KB_Entry, in the same order those `id` values appear in the `related` list.
3. IF a KB_Entry's `related` list contains an `id` that does not resolve to an existing KB_Entry, THEN THE System SHALL omit the link for that unresolved `id` and SHALL display the links for all remaining resolved `id` values.
4. IF a KB_Entry's `related` list contains the same resolvable `id` more than once, THEN THE System SHALL display at most one link for that `id`.
5. IF a KB_Entry has no `next_step` value or its `next_step` value is empty, THEN THE System SHALL omit the Next_Step display for that service.
6. IF a KB_Entry has no `related` list, its `related` list is empty, or no `related` `id` resolves to an existing KB_Entry, THEN THE System SHALL omit all Related_Service links for that service.
7. THE System SHALL derive all Verified_Navigation content only from the KB_Entry's `next_step` and `related` fields and SHALL NOT generate, infer, or augment a next step or a service relationship that is absent from the Knowledge_Base.

### Requirement 5: Freshness Display, Stale Warning, and Unavailable-Date Transparency

**User Story:** As a user relying on government information, I want to see how recently each answer was verified, be warned when it may be outdated, and be told clearly when a verification date is unavailable, so that I can judge how much to trust it.

#### Acceptance Criteria

1. WHEN the System displays an answer sourced from a KB_Entry that has a valid `last_verified` date, THE System SHALL display that KB_Entry's `last_verified` date with that answer.
2. THE System SHALL read the Stale_Threshold from a single configurable value expressed as a whole number of days, and WHERE that configurable value is absent or not a positive whole number of days, THE System SHALL apply a default Stale_Threshold of 180 days.
3. WHEN a displayed answer's Freshness is strictly greater than the Stale_Threshold in days, THE System SHALL display a Stale_Warning in Cebuano for that answer.
4. WHEN a displayed answer's Freshness is less than or equal to the Stale_Threshold in days, THE System SHALL NOT display a Stale_Warning for that answer.
5. IF a KB_Entry has no `last_verified` value, or its `last_verified` value is not a parseable calendar date, or that date is later than the current date, THEN THE System SHALL treat the `last_verified` value as invalid.
6. WHEN a Readiness_View displays a KB_Entry whose `last_verified` value is invalid, THE System SHALL display the Verification_Date_Unavailable_Notice in Cebuano, and that notice SHALL use a different message from the Stale_Warning and SHALL NOT reuse the Stale_Warning message.
7. WHEN a Readiness_View displays a KB_Entry whose `last_verified` value is invalid, THE System SHALL NOT display a verified date and SHALL NOT display a Stale_Warning for that entry.
8. THE System SHALL present explanatory Cebuano text clarifying that a verification date is not a guarantee that current government requirements are unchanged, and SHALL present that text both when a valid verification date is shown and when the Verification_Date_Unavailable_Notice is shown.
9. WHEN an answer reaches the user through the Ask path and its source KB_Entry has an invalid `last_verified` value, THE System SHALL treat the answer as not confident and apply the Existing_Behavior refusal/not-confident path rather than display a fabricated or implied verification date.
10. WHERE a Readiness_View displays a KB_Entry through direct navigation and that entry's `last_verified` value is invalid, THE System SHALL show the Verification_Date_Unavailable_Notice rather than fabricate or imply a verification date.

### Requirement 6: Report Outdated Information via GitHub Issue (open-source, no new infrastructure)

**User Story:** As a user who notices possibly outdated information, I want to report it, so that a human maintainer can review and correct the knowledge base.

#### Acceptance Criteria

1. THE System SHALL provide a client-only affordance that opens a prefilled GitHub issue in the project's public repository (`methuselahnoreen/AyaSib`) containing the affected KB_Entry `id`, the field or information questioned, an optional explanation, and an optional source URL, all URL-encoded.
2. THE System SHALL make no server call and SHALL store no Report itself, and SHALL state honestly that the Report opens a GitHub issue for maintainer review.
3. THE System SHALL NOT modify the Knowledge_Base automatically; a maintainer SHALL review the GitHub issue against an official source before any Knowledge_Base change.
4. IF the project repository is not configured, THEN THE System SHALL display a plain Cebuano "confirm with the office" message instead of a report affordance.
5. A durable server-side report intake (an `/api/report` route and queue) SHALL remain a future/stretch capability until approved durable storage exists, and WHILE no such storage exists THE System SHALL NOT claim that AyaSib itself stored or queued a Report.

### Requirement 7: Safeguards for Any Future Server-Side Report Intake (Future/Stretch)

**User Story:** As a maintainer, I want any future server-side reporting endpoint to be protected against malformed, oversized, and abusive input, so that the queue and the knowledge base stay safe.

> Scope note: This requirement is a future/stretch capability and is explicitly NOT part of the MVP. The MVP uses the client-only GitHub_Issue_Report (Requirement 6), which involves no server endpoint. Every criterion below applies only WHEN a durable server-side report intake is implemented on approved infrastructure.

#### Acceptance Criteria

1. WHERE a server-side report intake is implemented in a future phase, THE intake SHALL treat the user-supplied Report message as untrusted data and SHALL NOT interpret any part of it as an instruction, consistent with the Existing_Behavior prompt-injection handling in `ask.ts`.
2. WHERE a server-side report intake is implemented AND a request body cannot be read or does not parse to a JSON object, THE intake SHALL respond with an `invalid_request` error via the existing `frontend/src/lib/http.ts` `readJson` helper.
3. WHERE a server-side report intake is implemented AND the request body exceeds the `http.ts` `LIMITS.body` maximum of 20000 characters, THE intake SHALL respond with a `payload_too_large` error.
4. WHERE a server-side report intake is implemented AND the Report message is missing, empty, or whitespace-only, THE intake SHALL respond with an `invalid_request` error via the existing `http.ts` `readText` helper.
5. WHERE a server-side report intake is implemented AND the Report message exceeds its configured maximum length, THE intake SHALL respond with a `payload_too_large` error via the existing `http.ts` `readText` helper.
6. WHERE a server-side report intake is implemented AND a client exceeds the configured rate limit of 20 requests within the 60000-millisecond window, THE intake SHALL respond with a `rate_limited` error via the existing `http.ts` `rateLimit` helper.
7. WHERE a server-side report intake is implemented, THE intake SHALL NOT allow any request to write to the Knowledge_Base YAML files or to `kb.json`, and SHALL write only to the durable report queue.
8. WHERE a server-side report intake is implemented AND it encounters an internal error, THE intake SHALL respond with an `internal_error` contract error whose body contains only an error code and a generic message and excludes stack traces, keys, and file paths, consistent with the existing `failure` helper.

### Requirement 8: Preservation and Backward Compatibility of Existing Features

**User Story:** As an existing user, I want every current feature to keep working exactly as before, so that the new capabilities do not break what already works.

#### Acceptance Criteria

1. THE System SHALL preserve the behavior of the Ask, Explain, Translate, and Basaha/OCR features so that their existing tests continue to pass.
2. THE System SHALL preserve the refusal mechanism so that a question with no clear KB match returns the "Dili ko sigurado..." refusal consistent with Existing_Behavior.
3. THE System SHALL keep the `/api/ask`, `/api/explain`, `/api/translate`, and `/api/ocr` request and response contracts unchanged.
4. THE System SHALL keep the `kb.json` shape consumed by `frontend/src/lib/kb.ts` and `backend/lib/ask.mjs` readable by both consumers without modification to their existing field usage.
5. WHEN new fields are added to a KB_Entry, THE System SHALL keep those fields optional so that existing KB YAML entries remain valid without them.
6. THE System SHALL keep the eval set (`eval/questions.json` + `backend/scripts/eval.mjs`) passing, including its routing and refusal/null cases.

### Requirement 9: No-Invention and Refusal Guarantee Extended to New Features

**User Story:** As a user who could be misled by wrong government information, I want the new features to refuse rather than fabricate, so that I never see an invented procedure, fee, requirement, or source.

#### Acceptance Criteria

1. THE System SHALL derive every fact shown by the Readiness_Checklist, Verified_Navigation, Freshness, Information_Status, and Next_Recommended_Action features only from existing KB_Entry fields.
2. IF data required by a new feature is absent from a KB_Entry, THEN THE System SHALL omit that feature for that entry rather than fabricate content.
3. THE System SHALL NOT invent government procedures, fees, requirements, next steps, service relationships, statuses, or official sources in any feature.
4. WHEN the Ask feature cannot find a clear KB match for a question, THE System SHALL return the existing refusal response unchanged.

### Requirement 10: Additive KB Schema and Validation Extension

**User Story:** As a maintainer, I want the new KB fields validated like the existing ones, so that bad or fabricated navigation and status data is caught before it ships.

#### Acceptance Criteria

1. THE System SHALL add `next_step`, `next_step_ceb`, and `related` as optional KB_Entry fields recognized by the validation script's known-fields set.
2. WHERE a KB_Entry defines `next_step`, THE validation script SHALL require `next_step` to be non-empty text; and WHERE a KB_Entry defines `next_step_ceb`, THE validation script SHALL require `next_step_ceb` to be non-empty text.
3. WHERE a KB_Entry defines `related`, THE validation script SHALL require `related` to be a list of lowercase-hyphenated `id` strings.
4. IF a KB_Entry's `related` list references an `id` that is not present among the validated KB_Entries, THEN THE validation script SHALL report an error.
5. THE validation script SHALL continue to pass for all existing KB YAML entries that do not define the new fields.
6. WHEN the sync build runs, THE System SHALL include the new optional fields in `kb.json` only for entries that define them.
7. WHERE a KB_Entry contains two or more requirements with identical normalized text (trim and collapse internal whitespace; preserve case and punctuation), THE validation script SHALL report an error, checked independently for `requirements` and `requirements_ceb`.

### Requirement 11: Testing for New Logic and Extended Checks

**User Story:** As a developer, I want the new logic covered by required tests and the existing checks extended, so that the new features are verifiable and regressions are caught.

#### Acceptance Criteria

1. THE System SHALL provide a required test for checklist derivation that confirms each checklist item text is derived only from the KB_Entry's `requirements_ceb` or `requirements` fields with no added, removed, or reworded items.
2. THE System SHALL provide a required test for checklist persistence across requirement reorder, addition, and removal that confirms saved states stay attached to their original requirement text by Requirement_Identity, are never transferred to a different requirement, and that distinct requirements within an entry receive distinct Requirement_Identity keys.
3. THE System SHALL provide a required test for freshness and Information_Status handling that covers the missing, invalid, and future (unavailable) cases, the stale case, and the Freshness_Policy precedence (verified / needs_review / unconfirmed / unavailable), and that confirms the Verification_Date_Unavailable_Notice is distinct from the Stale_Warning.
4. THE System SHALL provide a required test for Verified_Navigation that confirms Next_Step and Related_Service resolution and confirms the System invents no next step or service relationship absent from the Knowledge_Base.
5. THE System SHALL provide a required test for Next_Recommended_Action that confirms it is derived only from verified KB data, falls back safely, and invents no action, and a required test for the GitHub_Issue_Report URL builder that confirms correct URL-encoding of the service id, field, explanation, and source, that the URL targets the configured repository, and that the builder yields a safe fallback when no repository is configured.
6. THE System SHALL provide a required regression test confirming the existing Ask, Explain, Translate, and OCR behaviors, the refusal behavior, and the `kb.json` shape remain unchanged.
7. THE System SHALL extend the KB validation to cover the new `next_step`, `next_step_ceb`, `related`, `review_status`, and `review_due` fields and the duplicate-normalized-requirements check.
8. THE System SHALL extend the eval set to cover: a valid Cebuano question about a supported service; the same question rephrased; a Filipino or English question; a vague/ambiguous question (refusal); an unsupported service (refusal); a service with unknown fee or processing time; an entry flagged `needs_review` or `unconfirmed`; a requirement with a verified related-service pathway; a missing requirement with no verified resolution (safe fallback); and a community report that must not modify the Knowledge_Base automatically.
9. THE System SHALL keep all existing unit tests and eval cases passing after the new tests are added, and SHALL keep evaluation results honest (no hardcoded pass rate and no removal of difficult cases).
10. WHERE a server-side report intake (Requirement 7) is implemented in a future phase, THE System SHALL provide tests for its validation covering invalid body, missing or oversized message, unknown KB_Entry `id`, and rate-limit rejection; these tests are not required for the MVP.

### Requirement 12: MVP and Stretch Scope Separation

**User Story:** As a hackathon team, I want a realistic MVP clearly separated from stretch goals, so that we ship a working slice and know what is optional.

#### Acceptance Criteria

1. THE System SHALL treat the following as MVP_Scope: the Readiness_Checklist with per-item states and stable-identity client-side persistence (Requirements 1-3); Verified_Navigation display logic that invents nothing (Requirement 4); the Freshness display, Stale_Warning, and unavailable transparency (Requirement 5); the GitHub_Issue_Report affordance (Requirement 6); preservation, backward compatibility, and the no-invention guarantee (Requirements 8-9); the additive KB schema and validation (Requirement 10); the mandatory tests (Requirement 11); the Information_Status model and Freshness_Policy (Requirement 14); the Safety and Honesty Constraints (Requirement 15); the Next_Recommended_Action (Requirement 16); and mobile usability (Requirement 13).
2. THE System SHALL treat a durable server-side report intake and its security controls (Requirement 7) as Stretch_Scope and SHALL exclude them from MVP_Scope.
3. THE System SHALL treat the authoring of government `next_step`, `next_step_ceb`, `related`, `review_status`, and `review_due` content for real services as future human-authored Stretch_Scope, performed only from official sources with no invention.
4. THE System SHALL NOT introduce a new database or external service for MVP_Scope.
5. THE System SHALL record the unresolved infrastructure assumption that a durable report store requires new infrastructure (for example a managed database or queue) that is not currently approved, and that a server-side report intake is deferred until such storage is approved.
6. THE System SHALL document in the design phase which requirements are MVP_Scope and which are Stretch_Scope.

### Requirement 13: Mobile Usability of New Views and Notices

**User Story:** As a user on a small phone, I want the readiness checklist, navigation, and freshness/status notices to be usable on my screen, so that I can prepare without zooming or scrolling sideways.

#### Acceptance Criteria

1. THE System SHALL render the Readiness_Checklist on a mobile viewport 360 pixels wide without horizontal overflow.
2. THE System SHALL render the Stale_Warning, the Verification_Date_Unavailable_Notice, the Information_Status label, and the report affordance on a mobile viewport 360 pixels wide without horizontal overflow.
3. THE System SHALL provide each interactive checklist state control with a touch target at least 44 by 44 CSS pixels.
4. THE System SHALL render all Cebuano text in the Readiness_View at a font size of at least 16 CSS pixels on a mobile viewport.
5. THE System SHALL keep the new views and notices consistent with the existing mobile-first layout so that no existing responsive behavior regresses.

### Requirement 14: Information-Status Model and Freshness Policy

**User Story:** As a user judging reliability, I want each service to show a clear status (verified, needs review, or unconfirmed), so that I know how much to trust it before I travel.

#### Acceptance Criteria

1. THE System SHALL recognize two optional additive KB_Entry fields: `review_status` (one of `verified`, `needs_review`, `unconfirmed`) and `review_due` (a calendar date).
2. THE System SHALL compute Information_Status by this precedence: IF `review_status` is `unconfirmed` THEN Unconfirmed; ELSE IF `review_status` is `needs_review` OR (`review_due` is present AND `review_due` is on or before today) OR Freshness is strictly greater than the Stale_Threshold THEN Needs_Review; ELSE IF `last_verified` is valid and within the Stale_Threshold THEN Verified; ELSE Unavailable.
3. WHEN `review_status` and `review_due` are both absent, THE System SHALL behave exactly as Requirement 5 (fresh / stale / unavailable) with no change.
4. THE System SHALL derive Information_Status only from `last_verified`, `review_status`, and `review_due`, and SHALL NOT fabricate a status.
5. THE System SHALL present the Cebuano clarifier that a Verified status is not a guarantee that current requirements are unchanged.
6. WHERE `review_status` is present, THE validation script SHALL require it to be exactly one of `verified`, `needs_review`, `unconfirmed`; and WHERE `review_due` is present, THE validation script SHALL require it to be a real calendar date.
7. THE validation script SHALL continue to pass for existing KB entries that define neither `review_status` nor `review_due`.

### Requirement 15: Safety and Honesty Constraints

**User Story:** As a user making real-world decisions, I want the app to avoid false assurances, so that I confirm the right things before I travel.

#### Acceptance Criteria

1. THE System SHALL NOT claim or imply that a government office is open now.
2. THE System SHALL NOT claim that a checklist guarantees eligibility, acceptance, or successful completion.
3. THE System SHALL NOT infer locality-specific requirements that are absent from the Knowledge_Base.
4. THE System SHALL NOT automatically publish community-submitted corrections.
5. THE System SHALL NOT expose API keys or secrets to the browser.
6. THE Readiness_Checklist SHALL function without requiring identity-document uploads or sensitive personal data, and checklist state SHALL remain device-only.

### Requirement 16: Next Recommended Action (Verified-Only)

**User Story:** As a user with an incomplete checklist, I want one clear next action, so that I know what to do without being misled.

#### Acceptance Criteria

1. THE System MAY display a single Next_Recommended_Action derived only from verified KB data: the entry's `next_step_ceb` or `next_step` when present, otherwise guidance based on the remaining STILL_NEEDS and NEEDS_TO_CONFIRM items.
2. IF no verified next action exists, THEN THE System SHALL display a generic Cebuano "confirm with the office" fallback.
3. THE System SHALL NOT invent a next action and SHALL NOT claim eligibility or acceptance.