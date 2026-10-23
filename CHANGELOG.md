# Changelog

All notable changes to AyaSib are recorded here. This project was initialized on
**2026-10-12** for the Hacktoberfest Cebu 2026 open-source competition.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Dates are in `YYYY-MM-DD`. Because the project is pre-1.0 and competition-scoped, we
track progress by dated milestones rather than semantic version tags.

## [Unreleased]

### Added
- Home redesign: the **"Andam Na?"** hero with the Aya intro bubble, three quick
  tiles (Ask / Services / Checklist), a logo header, and a compact
  "Tulo ra ka lakang" step flow whose connector arrows cannot stretch or clip on
  narrow screens.

### Notes
- Four knowledge-base services added this cycle still carry `review_status: needs_review`
  because their Cebuano is first-draft and awaits a native-speaker pass: PWD ID,
  National ID (PhilSys), PhilHealth (local members), and Pag-IBIG.

## [2026-10-23] — Knowledge base expansion and UI polish

### Added
- **Knowledge base grew from 4 to 12 services**, each grounded in an official source:
  - National Police Clearance (PNP)
  - PSA Marriage Certificate
  - Online SS Number Application (SSS)
  - National ID (PhilSys / PhilID) — `philsys.gov.ph`
  - PWD ID — NCDA AO 001 s.2026 (Unified PWD ID System)
  - Senior Citizen ID issuance
  - PhilHealth membership for Filipinos in-country — `philhealth.gov.ph`
  - Pag-IBIG Fund membership — `pagibigfund.gov.ph`
- **Explain** feature now shows friendly guidance when the pasted input is not a document.
- **Basaha** photo reader shows aligned original + Bisaya line pairs.
- Bottom navigation reworked so Home (Sugdanan) is the centre button.

### Changed
- "Ipasabot" on an answer now opens the Explain view prefilled with the answer text,
  instead of an empty page.

### Fixed
- The home step flow no longer overflows or clips its third step on small screens.

### Removed
- Consolidated two overlapping PWD ID entries into a single `pwd-id.yaml`.

## [2026-10-14 → 2026-10-22] — "Andam Na?" readiness feature

### Added
- Per-service readiness view at `/andam/<service-id>`, built entirely from existing KB
  fields (no invented facts):
  - Device-only readiness checklist (progress saved in `localStorage`, keyed to each
    requirement's text so reordering never mismoves a mark).
  - Verified next-step and related-service navigation, shown only when the KB entry
    carries that data.
  - Freshness and information-status indicators from `last_verified`.
  - A client-only "report outdated info" control that opens a prefilled GitHub issue
    and makes no server call.
- Additive optional KB fields: `next_step`, `next_step_ceb`, `related`,
  `review_status`, `review_due`, validated only when present.
- Property-based tests (fast-check) for readiness, persistence, navigation, freshness,
  next-action, and the GitHub-issue URL builder.

## [2026-10-12] — Project start and core "Ask in Bisaya"

### Added
- Initial project: Next.js (App Router) frontend with API routes, and KB tooling.
- **Ask in Bisaya**: question in, source-cited Cebuano checklist out (summary,
  requirements, office, fee, processing time) with a `last_verified` date.
- Refusal fallback: an honest "not sure, confirm with the office" response whenever the
  router picks nothing or an unknown service id — the model routes, it never writes facts.
- Knowledge base as YAML files in `kb/`, a validator/builder, and an evaluation set of
  Bisaya questions.
- Open-weights routing model on Cloudflare Workers AI (default Qwen3, Apache-2.0),
  per the competition's open-source model rule.
- Deployed to Vercel at <https://ayasib.vercel.app>.
