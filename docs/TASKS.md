# AyaSib Task List

**Status:** v0.2. Dates updated for the October 23 deadline, and scope reduced to fit.
The PM can reassign anything. To swap an owner, agree in chat and edit this file.

**Team (fill in the blank names):**

| Label | Name | Group | Notes |
|-------|------|-------|-------|
| FE1 | Methus | Frontend | Also Project Manager |
| FE2 | Irish | Frontend | |
| BE1 | Stephanie | Backend | |
| BE2 | Elizah | Backend | |

**Hackathon deadline:** Fri Oct 23, 2026. Cutoff time and timezone: `TODO: confirm with the organizers`.
**Our internal submission target:** Thu Oct 22, evening. Fri Oct 23 is emergency buffer only. Do not plan work for it.
**Feature freeze:** Tue Oct 20.

**Priority:** `P0` must ship, `P1` should ship, `P2` only if ahead.

**Rules:** one owner per task. If you are blocked for more than a day, say so in chat right away. Every pull request needs a review from someone else.

---

## 1. Milestones

| Date | Milestone |
|------|-----------|
| Wed Oct 14 | Scaffold live on a public URL, API contract agreed, backend architecture decided, native reviewer found |
| Sat Oct 17 | Feature 1 (Ask) works end to end on the live site |
| Mon Oct 19 | All three features usable (text only), KB content merged |
| Tue Oct 20 | **Feature freeze.** After this: tests, eval, accessibility, security, bug fixes only |
| Wed Oct 21 | Eval run, real-phone test, README nearly final, demo script written |
| Thu Oct 22 | Demo recorded, README final, repo public, live URL checked, submitted |
| Fri Oct 23 | Buffer only |

---

## 2. Pairings

| Feature | Frontend owner | Backend owner |
|---------|----------------|---------------|
| F1 Ask in Bisaya | FE2 | BE1 |
| F2 Explain document | FE1 | BE2 |
| F3 Translate | FE1 | BE2 |

Each pair agrees on request and response shapes in `docs/api-contract.md` before building.

---

## 3. Frontend group (FE1 + FE2)

### FE2: foundation and Feature 1

| ID | Task | Pri | Due | Depends on | Done when |
|----|------|-----|-----|------------|-----------|
| FE-01 | Scaffold Next.js in `frontend/`, lint and build pass, deploy to Vercel (Root Directory `frontend`) | P0 | Wed Oct 14 | none | Public URL loads on a phone |
| FE-02 | Mobile-first layout, large base font, color tokens, shared UI strings file (all Cebuano text in one place for easy review) | P0 | Thu Oct 15 | FE-01 | Layout works at 360 px wide |
| FE-04 | Typed API client module (one function per endpoint, handles error codes and timeouts) | P0 | Fri Oct 16 | FE-03 | No component calls `fetch` directly |
| FE-05 | Chat UI for Ask: input box, message list, send button, example questions | P0 | Fri Oct 16 | FE-02, FE-04 | User can send a question and see a reply |
| FE-06 | Answer card: summary, requirements checklist, office, fee, processing time, every source with its `last_verified` date. Hide fields that are `null` | P0 | Sat Oct 17 | FE-05 | Card matches the contract example |
| FE-07 | All Ask states: loading, error, rate-limited, and `confident: false` ("not sure, please confirm with the office") | P0 | Sat Oct 17 | FE-06 | Each state tested against the mock |
| FE-08 | Tests for the UI states (Ask, Explain, Translate): loading, success, error, not confident | P1 | Tue Oct 20 | FE-07, FE-10, FE-11 | `npm test` passes in CI |

> Someone already pushed a branch called `feat/answer-card`. Find out who, then make that person the owner of FE-06 or merge their work into it. Do not build it twice.

### FE1 (PM): mock API, Features 2 and 3, polish

| ID | Task | Pri | Due | Depends on | Done when |
|----|------|-----|-----|------------|-----------|
| FE-03 | Mock API matching the contract, with the four cases (normal, `unknown`, `error`, `slow`). *Moved here from FE2 so FE2 can focus on the scaffold and Ask.* | P0 | Thu Oct 15 | API contract agreed, FE-01 | UI can show every state without the backend |
| FE-09 | Home screen that presents the features and links to each, with UI text in Cebuano | P0 | Fri Oct 16 | FE-02 | User reaches any feature in one tap |
| FE-10 | Explain UI (text only): paste box, result view with `document_type`, explanation, `what_is_asked`, `next_steps`, always-visible disclaimer | P0 | Sun Oct 18 | FE-04 | Works against the mock |
| FE-11 | Translate UI: from/to selectors, swap button, copy button, highlight glossary terms used | P0 | Mon Oct 19 | FE-04 | Works against the mock |
| FE-13 | Accessibility pass: text size, contrast, tap targets of at least 44 px, keyboard use, screen-reader labels | P0 | Tue Oct 20 | FE-06, FE-10, FE-11 | No blocking issues in a Lighthouse accessibility check |
| FE-14 | Test on a real phone over slow mobile data; fix layout and loading problems | P0 | Wed Oct 21 | FE-13 | Written list of fixes, all closed |
| FE-12 | Explain UI (photo upload): camera or file picker, preview, type and size check, show `extracted_text` | **P2** | Wed Oct 21, only if ahead | FE-10, BE-11 | Photo of a notice produces an explanation |

---

## 4. Backend group (BE1 + BE2)

### BE1: knowledge base, retrieval and Feature 1

| ID | Task | Pri | Due | Depends on | Done when |
|----|------|-----|-----|------------|-----------|
| BE-01 | With FE2, decide the architecture: Next.js API routes or a separate service in `backend/`. Write the decision in the README and the contract's base path | P0 | Wed Oct 14 | none | Decision merged |
| BE-02 | Supabase project, enable pgvector, create the table for KB chunks and embeddings | P0 | Wed Oct 14 | BE-01 | Table exists and accepts a row |
| BE-03 | KB loader and schema validator: reads `kb/*.yaml`, fails with a clear message if `source_url` or `last_verified` is missing | P0 | Thu Oct 15 | KB schema agreed | Bad files are rejected with a useful error |
| BE-04 | Embedding script (`kb:embed`) that loads the KB into pgvector, safe to re-run | P0 | Thu Oct 15 | BE-02, BE-03 | Running it twice does not duplicate rows |
| BE-05 | Retrieval function: top-k search with a similarity threshold, returns nothing when no file is close enough | P0 | Fri Oct 16 | BE-04 | Off-topic questions retrieve nothing |
| BE-07 | `/api/ask`: strict grounded prompt, JSON output, refusal fallback. Fee and processing time are copied from the KB file, never produced by the model. `confident` is true only when a source supports the answer | P0 | Sat Oct 17 | BE-05, BE-06 | Matches the contract; returns `confident: false` for uncovered questions |
| BE-14 | Tests for retrieval and the refusal behavior (including "no sources means no answer") | P0 | Mon Oct 19 | BE-07 | Tests run in CI |
| BE-13 | Eval runner and the 30 question set, with expected answers reviewed by the native Cebuano reviewer. Includes questions the KB does not cover | P0 | Runner Tue Oct 20, run Wed Oct 21 | BE-07, SH-02 | `npm run eval` prints a pass rate |

### BE2: platform, Features 2 and 3, security

| ID | Task | Pri | Due | Depends on | Done when |
|----|------|-----|-----|------------|-----------|
| BE-06 | LLM provider wrapper: server-side only, key from environment, timeout, retry, error mapping to contract codes. Also create the LLM and hosting accounts and share keys safely (password manager or host settings, never chat) | P0 | Thu Oct 15 | BE-01 | A test call works from the server; no key in the client bundle |
| BE-15 | CI in GitHub Actions: lint, test, eval. Then turn on "require status checks" for `main` | P0 | Fri Oct 16 | scaffold exists | Failing PRs cannot merge |
| BE-08 | Glossary: JSON loader and prompt injection of matching terms. Collect the first 30 terms with the native reviewer | P0 | Fri Oct 16 | reviewer found | Terms from the glossary appear in outputs consistently |
| BE-09 | `/api/translate` with glossary use and `glossary_terms_used` in the response | P0 | Sun Oct 18 | BE-06, BE-08 | Matches the contract |
| BE-10 | `/api/explain` for text: structured explanation with the disclaimer, graceful reply for unreadable or unrelated text | P0 | Sun Oct 18 | BE-06 | Matches the contract |
| BE-12 | Input validation, size limits, rate limiting, and the contract's error format on all routes | P0 | Mon Oct 19 | BE-06 | Oversized input returns 413, flooding returns 429 |
| BE-16 | Security review: no secrets in repo or browser bundle, `.env.example` complete, secret scanning on, dependency audit | P0 | Wed Oct 21 | most features done | Checklist in README is true |
| BE-17 | Deployment configuration: environment variables on the host, plus a short scalability paragraph for the README (caching repeated questions, indexes) | P1 | Wed Oct 21 | BE-07 | Documented and working in production |
| BE-11 | OCR for photo uploads, then the same flow as BE-10. Include `extracted_text` in the response | **P2** | Wed Oct 21, only if ahead | BE-10 | Photo of a notice returns an explanation |

---

## 5. Shared tasks (everyone)

| ID | Task | Owner | Pri | Due | Done when |
|----|------|-------|-----|-----|-----------|
| SH-01 | **Knowledge base content:** 8 to 10 services for one named locality, each with a verified source and date. About 2 services per person (see candidates below). **One file each must be merged by Thu Oct 15** so the format is proven early | All four | P0 | Mon Oct 19 | Files merged via PR, each reviewed by a second person |
| SH-02 | Eval questions: each person writes about 8 questions in natural Bisaya for the services they added (30 in total, including some the KB does not cover) | All four | P0 | Tue Oct 20 | Questions merged and reviewed |
| SH-03 | Each person writes the README section for their own part (setup, how it works, limits) | All four | P0 | Wed Oct 21 | Sections merged |
| SH-04 | Demo video: script on Wed Oct 21, record and edit on Thu Oct 22 (2 to 3 minutes) | FE1 leads | P0 | Thu Oct 22 | Link in README |
| SH-05 | Code review: every PR gets one reviewer from the other group where possible | All four | P0 | ongoing | No PR merged without approval |

**KB candidates** (names only; every fee, requirement and office must come from a verified source for one named locality):

- First 8 (two per person): barangay clearance, business permit, community tax certificate (cedula), PhilHealth registration, PSA birth certificate, police clearance, NBI clearance, senior citizen ID
- Spares if there is time: Pag-IBIG membership, PWD ID

---

## 6. Project manager tasks (FE1)

| ID | Task | Pri | Due | Done when |
|----|------|-----|-----|-----------|
| PM-01 | Confirm the deadline. **Done: Oct 23.** Still to confirm: cutoff time and timezone, and whether the demo video has its own deadline | P0 | Wed Oct 14 | Organizers have answered |
| PM-02 | Invite teammates. Turn on `main` protection once a teammate has accepted and can approve a PR. Check everyone can open a PR | P0 | Wed Oct 14 | Test PRs opened by all four |
| PM-03 | Task board (GitHub Projects) with one issue per task here, labels `frontend`, `backend`, `kb`, `eval`, `docs` | P0 | Wed Oct 14 | Board matches this file |
| PM-04 | Get the API contract approved by FE2 and BE1 (and BE2 for Explain and Translate) | P0 | Wed Oct 14 | Contract marked Agreed |
| PM-05 | Find the native Cebuano reviewer and a backup | P0 | Wed Oct 14 | One person has said yes |
| PM-06 | Daily 15-minute check-in, track blockers, make go or no-go calls on slipping tasks | P0 | daily | |
| PM-07 | Declare feature freeze | P0 | Tue Oct 20 | Announced in chat |
| PM-08 | Keep the README accurate and free of `TODO`; record the live URL and eval results | P0 | Thu Oct 22 | A search for `TODO` finds nothing |
| PM-09 | Final submission checklist: repo public, URL live, README accurate, demo link works, form filled | P0 | Thu Oct 22 | Submitted |

---

## 7. Order of work

| Phase | Dates | Focus |
|-------|-------|-------|
| Foundation | Tue Oct 13 to Thu Oct 15 | PM-01 to PM-05, FE-01 to FE-03, BE-01 to BE-04, BE-06, first KB file from each person |
| Feature 1 | Fri Oct 16 to Sat Oct 17 | BE-05, BE-07, FE-04 to FE-07, BE-08, BE-15 |
| Features 2 and 3 | Sun Oct 18 to Mon Oct 19 | BE-09, BE-10, BE-12, BE-14, FE-10, FE-11, SH-01 finishes |
| Freeze and quality | Tue Oct 20 to Wed Oct 21 | FE-08, FE-13, FE-14, BE-13, BE-16, BE-17, SH-02, SH-03, demo script |
| Docs and demo | Thu Oct 22 | SH-04, PM-08, PM-09, bug fixes only |

If a P0 task slips by more than a day, the PM decides which P1 or P2 task to cut to make room.

---

## 8. What changed from v0.1

| Item | Change |
|------|--------|
| All dates | Converted from "Day N" to real dates for the Oct 23 deadline |
| FE-03 (mock API) | Moved from FE2 to FE1 |
| FE-08 and FE-15 | Merged into one frontend test task (FE-08) |
| FE-12 and BE-11 (photo upload and OCR) | Moved to P2, text paste ships first |
| FE-16 and BE-18 (advisory stretch) | Dropped |
| SH-01 (KB content) | Target reduced from 15 to 20 services to 8 to 10 |
| SH-02 and BE-13 (eval set) | Target reduced from 50 to 30 questions |
| BE-17 | Reduced to a short scalability paragraph |
