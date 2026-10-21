# AyaSib Task List

**Status:** v0.3 (2026-10-21). Updated to match what is actually built. The architecture pivoted (no Supabase/pgvector), the frontend team built Explain and Translate themselves, and Stephanie carried most backend work because Elizah was away. This version marks obsolete tasks, records what is done, and lists what truly remains.

**Team:**

| Label | Name | Group | Notes |
|-------|------|-------|-------|
| FE1 | Methus | Frontend | Also Project Manager |
| FE2 | Irish | Frontend | |
| BE1 | Stephanie | Backend | Carrying most backend work |
| BE2 | Elizah | Backend | Limited availability; next task is Photo OCR (BE-11) |

**Hackathon deadline:** Fri Oct 23, 2026. **Internal submission target:** Thu Oct 22, evening. Fri is emergency buffer only.
**Feature freeze:** passed (Tue Oct 20). Only tests, eval, accessibility, security, docs, deploy, and bug fixes from here.

**Priority:** `P0` must ship, `P1` should ship, `P2` only if ahead.
**Status key:** ✅ done · 🔄 in progress · ⬜ not started · ❎ obsolete / dropped · ➡️ owned by the other group now

---

## 0. TL;DR — what is left before submission

These are the only things that still block a good submission. Everything else is done, obsolete, or owned by the frontend team.

| # | Task | Owner | Pri | Status |
|---|------|-------|-----|--------|
| 1 | **Photo OCR** for Explain (BE-11) — open-source OCR only | Elizah | P1 | ⬜ |
| 2 | **Deploy to Vercel** + put the live URL in the README (BE-17 / step 4) | Stephanie + Methus | P0 | ⬜ |
| 3 | **CI** (GitHub Actions: kb:validate + eval, frontend lint + test) (BE-15) | Stephanie | P0 | ⬜ |
| 4 | **Security actions** (BE-16): revoke unused Gemini + Supabase keys, secret scan, `npm audit` | Stephanie | P0 | 🔄 |
| 5 | **Make the repo public** (PM-09) | Methus | P0 | ⬜ |
| 6 | **More KB services** (SH-01) — currently 4; each needs a verified source + native Cebuano | All | P0 | 🔄 |
| 7 | **Demo video** (SH-04) | Methus leads | P0 | ⬜ |
| 8 | **Confirm frontend uses the open-source model** (hard rule), not Gemini/Claude | Irish + Stephanie | P0 | 🔄 |

> ⚠️ **Hard rule check (item 8):** the frontend's early `llm.ts` called Gemini/Anthropic. Confirm it now uses the open-weights Cloudflare Workers AI path. A closed model would break the competition's open-source requirement and outranks everything else here.

---

## 1. Architecture as actually built

```
kb/*.yaml  --(npm run kb:build)-->  backend/data/kb.json
question --> Ask logic --> Cloudflare Workers AI (open-weights Qwen3 picks a service id or null)
         --> code looks up the id and returns the curated Cebuano fields + source
```

- **Model:** Cloudflare Workers AI, default `@cf/qwen/qwen3-30b-a3b-fp8` (open weights, Apache-2.0). No closed models.
- **No vector database.** With a handful of services, the router lists them in the prompt. pgvector is a future step, not MVP.
- **The model never writes the Cebuano shown to users.** It only routes. All Cebuano comes from hand-reviewed KB fields.
- **API lives inside the Next.js app** under `frontend/src/app/api`, not a separate service.

---

## 2. Backend status (Stephanie)

| ID | Task | Pri | Status | Note |
|----|------|-----|--------|------|
| BE-01 | Architecture decision, written in README/contract | P0 | ✅ | Cloudflare + Qwen, API in Next.js |
| BE-02 | Supabase project + pgvector table | P0 | ❎ | Dropped: no vector DB in the MVP |
| BE-03 | KB loader and schema validator | P0 | ✅ | `backend/scripts/validate-kb.mjs` |
| BE-04 | Embedding script `kb:embed` | P0 | ❎ | Dropped with pgvector |
| BE-05 | Retrieval function (top-k, threshold) | P0 | ❎ | Replaced by prompt-list routing |
| BE-07 | `/api/ask`: grounded routing, refusal fallback, facts from KB only | P0 | ✅ | `backend/lib/ask.mjs` |
| BE-13 | Eval runner + question set (KB-covered and not) | P0 | ✅ | `npm run eval`, 13 questions, 13/13 pass (2026-10-21) |
| BE-14 | Tests for refusal behaviour | P0 | 🔄 | Eval covers refusal; a dedicated unit test is optional |

**Also done by Stephanie (docs/housekeeping):** rewrote README and `docs/APIContract.md` to the real design; `.env.example` points at `CLOUDFLARE_*`; aligned CONTRIBUTING; set backend license to MIT; deleted `test-llm.mjs`. Merged to `main` via PR #13.

---

## 3. Explain / Translate / platform (was Elizah's column)

Most of this was **built by the frontend team** inside `frontend/`, so it is no longer Elizah's to build. Confirm and test rather than rebuild.

| ID | Task | Pri | Status | Note |
|----|------|-----|--------|------|
| BE-06 | LLM wrapper (server-only key, timeout, retry, error mapping) | P0 | ➡️🔄 | Built in `frontend/src/lib/llm.ts`. **Must confirm it uses the open-source model** (see item 8) |
| BE-08 | Glossary loader + prompt injection; first terms | P0 | ➡️🔄 | `glossary/` exists on `main`; confirm terms and wiring |
| BE-09 | `/api/translate` with `glossary_terms_used` | P0 | ➡️ | Built in `frontend/src/app/api/translate` |
| BE-10 | `/api/explain` (text) with disclaimer | P0 | ➡️ | Built in `frontend/src/app/api/explain` |
| BE-11 | **Photo OCR → same flow as BE-10, add `extracted_text`** | P1 | ⬜ | **Elizah's next task.** See the box below |
| BE-12 | Input validation, size limits, rate limiting, error format | P0 | ➡️🔄 | In `frontend/src/lib/http.ts` (`LIMITS`, `rateLimit`); confirm on every route |
| BE-15 | CI: lint, test, eval; protect `main` | P0 | ⬜ | **Stephanie.** Real open item |
| BE-16 | Security review: no secrets, `.env.example` complete, secret scan, dependency audit | P0 | 🔄 | **Stephanie.** `.env.example` done; keys + scan + audit remain |
| BE-17 | Deployment config + scalability note | P1 | 🔄 | **Stephanie + Methus.** Scalability note in README done; live deploy remains |

### BE-11 Photo OCR — brief for Elizah

- **Goal:** on the Explain feature, accept a photo of a notice/form, extract its text, then run the existing Explain flow. Return `extracted_text` so users can check the OCR.
- **Where it lives:** extends the frontend's Explain route/UI (`frontend/src/app/api/explain` + Methus's FE-12). Coordinate with Methus.
- **Hard-rule constraint:** OCR must be **open-source / open-weights** (for example Tesseract.js, or an open model on Cloudflare Workers AI). Do **not** use a closed cloud OCR service.
- **Done when:** a photo of a notice produces an explanation with `extracted_text`, and type/size are validated (reject non-images and oversized files).
- **Priority:** P1. It is a bonus feature; the P0 items in section 0 come first for the team.

---

## 4. Frontend group (Methus + Irish) — summary

Built and largely complete: Next.js app, mobile-first layout, Ask chat UI + answer card + all states, Home, Explain (text) UI, Translate UI, accessibility pass. Remaining: FE-12 photo-upload UI (pairs with BE-11), FE-14 real-phone test, and component tests (FE-08/FE-15) if not already green. Confirm status with Methus and Irish; this file no longer tracks frontend tasks in detail.

---

## 5. Shared tasks

| ID | Task | Owner | Pri | Status | Note |
|----|------|-------|-----|--------|------|
| SH-01 | KB content, verified sources + native Cebuano | All four | P0 | 🔄 | 4 services done (NBI, two civil registry, death certificate). More improves the demo |
| SH-02 | Eval questions in natural Bisaya (incl. uncovered) | All four | P0 | ✅ | 13 in `eval/questions.json`; add more as KB grows |
| SH-03 | README sections | All four | P0 | ✅ | README rewritten and merged |
| SH-04 | Demo video (2-3 min) | Methus leads | P0 | ⬜ | Record Thu Oct 22 |
| SH-05 | Code review: one reviewer per PR | All four | P0 | 🔄 | Keep enforcing |

**KB candidates still worth adding** (verified source + native Cebuano required): barangay clearance, business permit, cedula, PhilHealth registration, PSA birth certificate (local vs PSA already covered — check overlap), police clearance, senior citizen ID, PWD ID.

---

## 6. PM / submission checklist (Methus)

| ID | Task | Pri | Status |
|----|------|-----|--------|
| PM-07 | Feature freeze declared | P0 | ✅ (Oct 20) |
| PM-08 | README accurate, no `TODO`, live URL + eval results recorded | P0 | 🔄 (URL pending deploy) |
| PM-09 | **Repo public**, URL live, demo link works, form submitted | P0 | ⬜ |

---

## 7. What changed from v0.2

| Item | Change |
|------|--------|
| Status key + section 0 TL;DR | Added so anyone can see what is actually left at a glance |
| BE-02, BE-04, BE-05 (Supabase/pgvector/embeddings/retrieval) | Marked **obsolete** — the design dropped vector search for the MVP |
| BE-06, BE-09, BE-10, BE-12 | Marked **owned by the frontend team** (built in `frontend/`), confirm-not-rebuild |
| BE-11 Photo OCR | Confirmed as **Elizah's next task**, with an open-source-OCR constraint and a short brief |
| Open-rule check (item 8) | Added: confirm the frontend uses the open-source model, not Gemini/Claude |
| Backend docs work | Recorded as done (PR #13): README, APIContract, .env.example, CONTRIBUTING, license, test-llm.mjs removed |
| Real remaining work | Narrowed to: OCR, deploy, CI, security actions, repo public, more KB, demo video |
