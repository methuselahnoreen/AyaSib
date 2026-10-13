# AyaSib Task List

**Status:** Draft v0.1. The PM can reassign anything. Swap owners by agreeing in chat and editing this file in a PR.

**Team (fill in the names):**

| Label | Name | Group | Notes |
|-------|------|-------|-------|
| Methus | | Frontend | Also Project Manager |
| Irish | | Frontend | |
| Stephanie | | Backend | |
| Elizah | | Backend | |

**Deadline:** `____ / ____ / ______`. Day numbers below are counted from today (Day 1) and should be converted to real dates once the deadline is fixed.

**Priority:** `P0` must ship, `P1` should ship, `P2` only if ahead.

**Rule:** one owner per task. If you are blocked for more than a day, say so in chat.

---

## 1. Pairings (who works closest together)

| Feature | Frontend owner | Backend owner |
|---------|----------------|---------------|
| F1 Ask in Bisaya | Irish | Stephanie |
| F2 Explain document | Methus | Elizah |
| F3 Translate | Methus | Elizah |

Each pair agrees on request and response shapes in `docs/api-contract.md` before building.

---

## 2. Frontend group (Methus + Irish)

### Irish: foundation and Feature 1

| ID | Task | Pri | Due | Depends on | Done when |
|----|------|-----|-----|------------|-----------|
| FE-01 | Scaffold Next.js in `frontend/`, lint and build pass, deploy to Vercel (Root Directory `frontend`) | P0 | Day 2 | none | Public URL loads on a phone |
| FE-02 | Mobile-first layout, large base font, color tokens, shared UI strings file (all Cebuano text in one place for easy review) | P0 | Day 3 | FE-01 | Layout works at 360 px wide |
| FE-03 | Mock API matching the contract, with the four cases (normal, `unknown`, `error`, `slow`) | P0 | Day 3 | API contract agreed | UI can show every state without the backend |
| FE-04 | Typed API client module (one function per endpoint, handles error codes and timeouts) | P0 | Day 4 | FE-03 | No component calls `fetch` directly |
| FE-05 | Chat UI for Ask: input box, message list, send button, example questions | P0 | Day 5 | FE-02, FE-04 | User can send a question and see a reply |
| FE-06 | Answer card: summary, requirements checklist, office, fee, processing time, every source with its `last_verified` date. Hide fields that are `null` | P0 | Day 6 | FE-05 | Card matches the contract example |
| FE-07 | All Ask states: loading, error, rate-limited, and `confident: false` ("not sure, please confirm with the office") | P0 | Day 6 | FE-06 | Each state tested against the mock |
| FE-08 | Tests for Ask components and states | P1 | Day 9 | FE-07 | `npm test` passes in CI |

> Someone already pushed a branch called `feat/answer-card`. Find out who, then either make that person the owner of FE-06 or merge their work into it. Do not build it twice.

### Methus (PM): Features 2 and 3, polish

| ID | Task | Pri | Due | Depends on | Done when |
|----|------|-----|-----|------------|-----------|
| FE-09 | Home screen that presents the three features and links to each, with UI text in Cebuano | P0 | Day 5 | FE-02 | User reaches any feature in one tap |
| FE-10 | Explain UI (text): paste box, result view with `document_type`, explanation, `what_is_asked`, `next_steps`, always-visible disclaimer | P0 | Day 7 | FE-04 | Works against the mock |
| FE-11 | Translate UI: from/to selectors, swap button, copy button, highlight glossary terms used | P0 | Day 8 | FE-04 | Works against the mock |
| FE-12 | Explain UI (photo): camera or file picker, preview, type and size check, show `extracted_text` so users can check the OCR | P1 | Day 10 | FE-10, BE-11 | Photo of a notice produces an explanation |
| FE-13 | Accessibility pass: text size, contrast, tap targets of at least 44 px, keyboard use, screen-reader labels | P0 | Day 11 | FE-06, FE-10, FE-11 | No blocking issues in a Lighthouse accessibility check |
| FE-14 | Test on a real phone over slow mobile data; fix layout and loading problems | P0 | Day 12 | FE-13 | Written list of fixes, all closed |
| FE-15 | Tests for Explain and Translate components | P1 | Day 10 | FE-11 | `npm test` passes in CI |
| FE-16 | Stretch: advisory view (only after feature freeze if ahead) | P2 | | BE-18 | |

---

## 3. Backend group (Stephanie + Elizah)

### Stephanie: knowledge base, retrieval and Feature 1

| ID | Task | Pri | Due | Depends on | Done when |
|----|------|-----|-----|------------|-----------|
| BE-01 | With Irish, decide the architecture: Next.js API routes or a separate service in `backend/`. Write the decision in the README and the contract's base path | P0 | Day 1 | none | Decision merged |
| BE-02 | Supabase project, enable pgvector, create the table for KB chunks and embeddings | P0 | Day 2 | BE-01 | Table exists and accepts a row |
| BE-03 | KB loader and schema validator: reads `kb/*.yaml`, fails with a clear message if `source_url` or `last_verified` is missing | P0 | Day 3 | KB schema agreed | Bad files are rejected with a useful error |
| BE-04 | Embedding script (`kb:embed`) that loads the KB into pgvector, safe to re-run | P0 | Day 4 | BE-02, BE-03 | Running it twice does not duplicate rows |
| BE-05 | Retrieval function: top-k search with a similarity threshold, returns nothing when no file is close enough | P0 | Day 5 | BE-04 | Off-topic questions retrieve nothing |
| BE-07 | `/api/ask`: strict grounded prompt, JSON output, refusal fallback. Fee and processing time are copied from the KB file, never produced by the model. `confident` is true only when a source supports the answer | P0 | Day 7 | BE-05, BE-06 | Matches the contract; returns `confident: false` for uncovered questions |
| BE-13 | Eval runner and the 30 to 50 question set, with expected answers reviewed by the native Cebuano reviewer. Includes questions the KB does not cover | P0 | Day 11 | BE-07 | `npm run eval` prints a pass rate |
| BE-14 | Tests for retrieval and the refusal behavior (including "no sources means no answer") | P0 | Day 9 | BE-07 | Tests run in CI |

### Elizah: platform, Features 2 and 3, security

| ID | Task | Pri | Due | Depends on | Done when |
|----|------|-----|-----|------------|-----------|
| BE-06 | LLM provider wrapper: server-side only, key from environment, timeout, retry, error mapping to contract codes. Also create the LLM and hosting accounts and share keys safely (password manager or host settings, never chat) | P0 | Day 3 | BE-01 | A test call works from the server; no key in the client bundle |
| BE-08 | Glossary: JSON loader and prompt injection of matching terms. Collect the first 30 terms with the native reviewer | P0 | Day 6 | reviewer found | Terms from the glossary appear in outputs consistently |
| BE-09 | `/api/translate` with glossary use and `glossary_terms_used` in the response | P0 | Day 8 | BE-06, BE-08 | Matches the contract |
| BE-10 | `/api/explain` for text: structured explanation with the disclaimer, graceful reply for unreadable or unrelated text | P0 | Day 8 | BE-06 | Matches the contract |
| BE-11 | OCR for photo uploads, then the same flow as BE-10. Include `extracted_text` in the response | P1 | Day 10 | BE-10 | Photo of a notice returns an explanation |
| BE-12 | Input validation, size limits, rate limiting, and the contract's error format on all routes | P0 | Day 9 | BE-06 | Oversized input returns 413, flooding returns 429 |
| BE-15 | CI in GitHub Actions: lint, test, eval. Then turn on "require status checks" for `main` | P0 | Day 6 | scaffold exists | Failing PRs cannot merge |
| BE-16 | Security review: no secrets in repo or browser bundle, `.env.example` complete, secret scanning on, dependency audit | P0 | Day 11 | most features done | Checklist in README is true |
| BE-17 | Deployment configuration: environment variables on the host, a short scalability note (caching repeated questions, indexes) for the README | P1 | Day 12 | BE-07 | Documented and working in production |
| BE-18 | Stretch: advisory endpoint | P2 | | | |

---

## 4. Shared tasks (everyone)

| ID | Task | Owner | Pri | Due | Done when |
|----|------|-------|-----|-----|-----------|
| SH-01 | **Knowledge base content**: 15 to 20 services, each with a verified source and date. Target split of about 4 services per person (see candidates below) | All four | P0 | Day 9 | Files merged via PR, each reviewed by a second person |
| SH-02 | Eval questions: each person writes 10 to 12 questions in natural Bisaya for the services they added | All four | P0 | Day 10 | Questions merged and reviewed |
| SH-03 | Each person writes the README section for their own part (setup, how it works, limits) | All four | P0 | Day 12 | Sections merged |
| SH-04 | Demo video: script, record, edit (2 to 3 minutes) | Methus leads | P0 | Day 13 | Link in README |
| SH-05 | Code review: every PR gets one reviewer from the other group where possible | All four | P0 | ongoing | No PR merged without approval |

**KB candidates** (names only; every fee, requirement and office must come from a verified source for one named locality):
barangay clearance, business permit, community tax certificate (cedula), PhilHealth registration, PSA birth certificate, police clearance, NBI clearance, SSS registration, Pag-IBIG membership, passport application, driver's license (LTO), voter registration, senior citizen ID, PWD ID, building permit, marriage license.

---

## 5. Project manager tasks (Methus)

| ID | Task | Pri | Due | Done when |
|----|------|-----|-----|-----------|
| PM-01 | Confirm the deadline and convert Day numbers to real dates | P0 | Day 1 | Dates filled in above |
| PM-02 | Invite teammates, protect `main`, check everyone can open a PR | P0 | Day 1 | Test PRs opened by all four |
| PM-03 | Task board (GitHub Projects) with one issue per task here, labels `frontend`, `backend`, `kb`, `eval`, `docs` | P0 | Day 1 | Board matches this file |
| PM-04 | Get the API contract approved by Irish and Stephanie (and Elizah for Explain and Translate) | P0 | Day 2 | Contract marked Agreed |
| PM-05 | Find the native Cebuano reviewer and a backup | P0 | Day 2 | One person has said yes |
| PM-06 | Daily 15-minute check-in, track blockers, make go or no-go calls on slipping tasks | P0 | daily | |
| PM-07 | Declare feature freeze | P0 | Day 10 | Announced in chat |
| PM-08 | Keep the README accurate and free of `TODO`, record the live URL and eval results | P0 | Day 13 | A search for `TODO` finds nothing |
| PM-09 | Final submission checklist: repo public, URL live, README accurate, demo link works, form filled | P0 | Day 14 | Submitted |

---

## 6. Order of work

| Phase | Days | Focus |
|-------|------|-------|
| Foundation | 1 to 3 | PM-01 to PM-05, BE-01 to BE-03, BE-06, FE-01 to FE-03 |
| Feature 1 | 4 to 7 | BE-04, BE-05, BE-07, FE-04 to FE-07, SH-01 starts |
| Features 2 and 3 | 7 to 9 | BE-08 to BE-10, FE-09 to FE-11 |
| Freeze and quality | 10 to 12 | BE-11 to BE-17, FE-12 to FE-15, SH-02, SH-03 |
| Docs and demo | 12 to 14 | SH-04, PM-08, PM-09, bug fixes only |

If a P0 task is slipping by more than a day, the PM decides whether to cut a P1 task to make room.
