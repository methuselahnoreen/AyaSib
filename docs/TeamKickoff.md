# Team Kickoff Sheet

> **How to use this:** Everyone fills in Section 2 *before* the kickoff call (10 minutes).
> On the call we compare answers, resolve overlaps, and lock Section 4.
> Copy this file, or edit it directly in a branch named `docs/kickoff-<yourname>`.

---

## 1. Project at a glance


**One-liner:** Ask about government services in Bisaya, get a step-by-step answer in Bisaya, backed by cited sources.

**Submission deadline:** `____ / ____ / ______`

**Scope rule:** Three features and no more. The stretch feature is only touched when everything else is done.

| # | Feature | What it does | Frontend work | Backend work |
|---|---------|--------------|---------------|--------------|
| F1 | **Ask in Bisaya** | Question in Bisaya, checklist answer (requirements, office, fee, processing time) with source and "last verified" date | Chat UI, answer card, "not sure" state | Retrieval, grounded prompt, refusal fallback |
| F2 | **Explain this document** | Paste text or upload a photo of a notice or form, get a plain-Cebuano explanation and next steps | Paste/upload UI, result view | Explain endpoint, OCR for images |
| F3 | **Translate with gov vocabulary** | English/Filipino and Cebuano, with a curated glossary | Translate UI, language toggle | Translate endpoint, glossary injection |
| S1 | *Stretch:* Advisory simplifier | PAGASA/NDRRMC advisories in simple Cebuano | Advisory view | Fetch + simplify |

**Cross-cutting work (someone must own each):**

| Area | What it includes |
|------|------------------|
| Knowledge base (KB) | Collecting services, writing YAML files, sources, verified dates |
| Glossary | Curated Cebuano government terms (JSON) |
| Evaluation set | 30-50 Cebuano questions with expected answers, run in CI |
| Testing and CI | Unit tests, lint, GitHub Actions |
| Security | No keys in repo or browser, rate limits, input size limits |
| Documentation | README, API contract, contributing guide, demo script |
| Demo video | 2-3 minute walkthrough |
| Deployment | Hosting, environment variables, public URL |

---

## 2. Individual preferences (each member fills one block)

Copy the block below once per person.

```
Name:
Current role (circle one):  Frontend   Backend   PM + Frontend
Can you read/write natural Bisaya?  Yes / Somewhat / No
Hours per day I can commit (honest estimate):
Days I am NOT available before the deadline:

Feature I most want to lead (F1 / F2 / F3):
Feature I would rather NOT lead:

Cross-cutting areas I would take (tick any):
[ ] Knowledge base   [ ] Glossary   [ ] Eval set   [ ] Testing/CI
[ ] Security         [ ] Docs       [ ] Demo video  [ ] Deployment

Skills I am strongest in (e.g. React, Tailwind, Postgres, prompt design, OCR):

Things I want to learn on this project:

Anything that worries me about the plan:
```

---

## 3. Role options

These are suggestions; the team can reshape them.

| Role | Responsibilities | Likely fit |
|------|------------------|------------|
| **Project Manager** | Scope, board, deadlines, rubric tracking, PR reviews, final submission | PM + Frontend |
| **Frontend Lead** | UI architecture, design system, accessibility, mobile layout | Frontend |
| **Frontend Dev** | Feature screens, mock API, UI states (loading, error, "not sure") | Frontend |
| **Backend Lead** | API design, retrieval pipeline, LLM prompts, refusal logic | Backend |
| **Backend Dev** | Supabase and embeddings, OCR, tests, CI, rate limiting | Backend |
| **KB Curator** (shared) | Verifies sources and dates for each service file | Anyone |
| **Cebuano Reviewer** (external) | Reviews glossary and eval answers for natural Bisaya | Native speaker outside the team |

---

## 4. Final assignments (fill in during the call)

| Item | Owner | Backup |
|------|-------|--------|
| F1 Ask in Bisaya (frontend) | | |
| F1 Ask in Bisaya (backend) | | |
| F2 Explain document (frontend) | | |
| F2 Explain document (backend) | | |
| F3 Translate (frontend) | | |
| F3 Translate (backend) | | |
| Knowledge base | | |
| Glossary | | |
| Eval set | | |
| Testing and CI | | |
| Security | | |
| README and docs | | |
| Demo video | | |
| Deployment | | |
| Native Cebuano reviewer (name) | | |

**Rule:** every item has exactly one owner and one backup. If an owner is stuck for more than a day, they say so in chat.

---

## 5. Working agreements

- **Branches:** `feat/...`, `fix/...`, `docs/...`
- **Pull requests:** at least one review from someone else; no direct pushes to `main`.
- **Secrets:** never in the repo, chat, or screenshots. Only in `.env` locally and in host settings.
- **Check-in:** daily at `____` (15 minutes or async in chat).
- **Blockers:** posted in chat immediately, not saved for the check-in.
- **Feature freeze date:** `____ / ____ / ______`
- **Decision rule:** if we disagree, the PM decides after hearing both sides, and the decision is logged in Section 6.

---

## 6. Decision log

| Date | Decision | Why | Decided by |
|------|----------|-----|------------|
| | | | |
