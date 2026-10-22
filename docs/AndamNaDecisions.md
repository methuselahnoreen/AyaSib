# AyaSib — "Andam Na?" — Design Decisions

Status: approved spec, pre-implementation. Spec lives in `.kiro/specs/ayasib-andam-na/`
(requirements.md, design.md, tasks.md). This note records the key decisions and their
rationale so the team does not relitigate them mid-build.

## What we are building

An additive refinement of AyaSib into a Cebuano-first, source-verified government service
**readiness** assistant for Cebu City. Four capabilities, all layered on the existing app
without rewriting it:

1. Readiness checklist (Have / Still need / Need to confirm) from a service's verified requirements.
2. Verified barangay-to-city navigation (next step + related services), KB-gated.
3. Freshness + information status (Verified / Needs review / Unconfirmed / Unavailable).
4. Open-source reporting of outdated info via GitHub Issues.

## Decisions and why

### D1 — Reporting uses GitHub Issues, not a server/database
There is no database and no approved durable storage (Supabase/pgvector was dropped; Vercel
runs stateless serverless functions with an ephemeral filesystem). A console log or temp file
cannot honestly promise a human will review a report. Instead, the report control opens a
**prefilled GitHub issue** in the public repo `methuselahnoreen/AyaSib`. This is open-source,
durable, auditable, human-reviewed by design, needs no new infrastructure, and exposes no secret.
A durable server-side `/api/report` route + queue remains a clearly-labeled Future item.
Rule: the UI must never claim AyaSib stored or queued a report — it opens a GitHub issue.

### D2 — Information status from an additive, optional KB model
Two optional KB fields, `review_status` (verified | needs_review | unconfirmed) and `review_due`
(date), feed a documented Freshness Policy combined with `last_verified` and the stale threshold.
Precedence: unconfirmed > needs_review/stale/due > verified > unavailable. When both fields are
absent, behavior is identical to the current fresh/stale/unavailable logic — fully backward
compatible. Status is derived only from KB fields and never fabricated.

### D3 — Checklist state keyed by stable requirement identity, not array index
Saved states are keyed by KB id + a stable hash of the requirement's normalized text
(normalize = trim + collapse internal whitespace; preserve case and punctuation). This keeps a
selection attached to its requirement across reorder/add/remove and prevents state from silently
transferring to a different requirement. The validator rejects two requirements that normalize to
the same text within one entry, guaranteeing unique keys.

### D4 — Non-invention and refusal are preserved and extended
Every user-facing fact traces to a KB field. Missing data means the feature is omitted, never
fabricated. The existing "Dili ko sigurado..." refusal is unchanged. New safety rules: no "office
open now" claims, no eligibility/acceptance guarantees, no inferred locality requirements, no
auto-published corrections, no secrets in the browser, minimal data (checklist needs no identity
uploads; state stays device-only).

### D5 — Additive-only, regression-gated
New files and optional fields only; no edits to existing contracts (/api/* routes, kb.json shape,
Ask/Explain/Translate/OCR). A mandatory regression gate runs the full Vitest suite + the eval set
before the MVP is considered done.

## Infrastructure assumptions (unresolved / deliberately deferred)

- A durable server-side report store (managed DB or queue) is NOT approved and is NOT in the MVP.
  Reporting stays on GitHub Issues until such storage is approved.
- Hosting is Vercel, root directory `frontend`. Server-only env vars (CLOUDFLARE_*, LLM_*) are set
  in Vercel project settings, never committed. The only committed public var is
  NEXT_PUBLIC_GITHUB_REPO.

## Open item

- Confirm the requirement-identity normalization rule (currently: trim + collapse whitespace,
  preserve case/punctuation). A looser rule (e.g. case-insensitive) would change which edits count
  as "the same requirement" for saved state.

## Scope

MVP: Requirements 1-6, 8-16. Future: durable server-side report intake (Requirement 7) and
authoring real government next_step/related/review content (human-authored, source-required).