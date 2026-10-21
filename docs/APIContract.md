# API Contract

**Status:** v1.0. `POST /api/ask` is approved on the backend side and matches the implementation in `backend/lib/ask.mjs`. The `explain` and `translate` endpoints are owned by the frontend team and are marked **(frontend-owned)** below.
**Owners:** Frontend: Methus / Irish. Backend (`/api/ask`): Stephanie.
**Rule:** Changes require a PR that updates this file and is approved by **both** sides.

---

## 0. Ground rules that the contract exists to protect

These come from the project's hard rules and are not negotiable:

1. **Open-source model only.** The router runs on Cloudflare Workers AI using an open-weights model (default `@cf/qwen/qwen3-30b-a3b-fp8`, Apache-2.0). No closed models (e.g. Gemini, Claude).
2. **The model never writes the Cebuano shown to users.** For `/api/ask`, the model only picks which service the question is about (or `null`). Every Cebuano string in the response is a hand-reviewed field from the knowledge base.
3. **Never invent government facts.** Fees, offices, requirements, source URL and `last_verified` all come from the KB file, never from the model. A missing fact is returned as `null` or omitted, never guessed.
4. **Refuse when unsure.** If no KB service clearly matches, the API returns `200` with `confident: false`, not an error.

---

## 1. Conventions

| Topic | Rule |
|-------|------|
| Base path | `/api` (Next.js route handlers inside `frontend/`) |
| Format | JSON, UTF-8, `Content-Type: application/json` |
| Method | `POST` |
| Auth | None for users. Provider keys live on the server only and are never in any response |
| Field naming | `snake_case` |
| Dates | ISO 8601, date only for `last_verified` (`2026-10-14`) |
| Language codes | `ceb` Cebuano, `fil` Filipino, `en` English |
| Max text length | 2,000 characters for `question` |
| Rate limit | 20 requests/minute per IP; exceeded returns `429` |

---

## 2. Shared types

### Source

```json
{
  "title": "Cebu City Citizen's Charter, Service 6: Issuance of Death Certificate",
  "url": "https://www.cebucity.gov.ph/transparency/citizens-charter/",
  "last_verified": "2026-10-14"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | yes | Source name, from the KB file's `source_title` |
| `url` | string | yes | Absolute URL, from the KB file's `source_url` |
| `last_verified` | string (date) | yes | From the KB file |

### Error

```json
{ "error": { "code": "invalid_request", "message": "question is required" } }
```

| `code` | HTTP | Meaning |
|--------|------|---------|
| `invalid_request` | 400 | Missing or malformed field |
| `payload_too_large` | 413 | `question` over 2,000 characters |
| `rate_limited` | 429 | Too many requests |
| `upstream_error` | 502 | The language model could not be reached |
| `internal_error` | 500 | Anything else (for example, model credentials not configured) |

`message` is for developers and logs. The frontend shows its own friendly Cebuano text based on `code`; it never displays `message` directly to users.

---

## 3. `POST /api/ask` - Feature 1 (backend-approved)

Answer a question about a Cebu City government service, using only knowledge-base files. Implemented by `answerQuestion()` in `backend/lib/ask.mjs`.

### Request

```json
{ "question": "Unsaon pagkuha ug death certificate sa City Health?" }
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `question` | string | yes | 1-2,000 chars, any of `ceb`, `fil`, `en` |

### Response 200, confident

```json
{
  "confident": true,
  "answer": {
    "summary": "Kini nga death certificate gi-isyu sa City Health Department alang sa tawo nga namatay sa balay o walay doktor nga nag-atiman...",
    "requirements": [
      "Medical abstract, resulta sa laboratoryo o reseta, kon naa (gikan sa ospital o sa doktor nga nag-atiman)"
    ],
    "requirements_note": null,
    "steps": [],
    "office": "City Health Department (CHD)",
    "fee": "PHP 50.00 (burial permit)",
    "processing_time": "45 ka minuto sa tanan"
  },
  "sources": [
    {
      "title": "Cebu City Citizen's Charter, Service 6: Issuance of Death Certificate",
      "url": "https://www.cebucity.gov.ph/transparency/citizens-charter/",
      "last_verified": "2026-10-14"
    }
  ]
}
```

### Response 200, not confident (refusal fallback)

```json
{
  "confident": false,
  "answer": null,
  "message": "Dili ko sigurado niini. Palihug kumpirmaha sa opisina.",
  "sources": []
}
```

### Field rules

| Field | Rule |
|-------|------|
| `confident` | `true` only when the model picked a service id that exists in the KB |
| `answer` | Object when `confident` is `true`; `null` otherwise |
| `answer.summary` | Curated Cebuano (`summary_ceb`). Written/reviewed by a native speaker, not the model |
| `answer.requirements` | Curated Cebuano list (`requirements_ceb`), same order and length as the English requirements |
| `answer.requirements_note` | Curated Cebuano note (`requirements_note_ceb`) or `null` |
| `answer.steps` | Curated Cebuano list (`steps_ceb`); `[]` when the service has no step list |
| `answer.office` | Curated Cebuano (`office_ceb`), falling back to English `office`, or `null` |
| `answer.fee` | Curated Cebuano (`fee_ceb`), falling back to English `fee`, or `null`. Never estimated by the model |
| `answer.processing_time` | Curated Cebuano (`processing_time_ceb`), falling back to English, or `null` |
| `sources` | Exactly one entry when `confident` is `true`; empty when `false` |
| `message` | Present (in Cebuano) only when `confident` is `false` |

**Frontend obligations:** render the "not sure" state when `confident` is `false`; always show the source and its `last_verified` date; if a field is `null` or an empty list, hide it rather than showing "null" or an empty section.

---

## 4. `POST /api/explain` - Feature 2 (frontend-owned)

Explain a notice or form in plain Cebuano. Owned and implemented by the frontend team (`frontend/src/app/api/explain`). Shape is defined there; this section is a pointer, not a backend commitment. It must still obey the open-source-model rule in section 0.

---

## 5. `POST /api/translate` - Feature 3 (frontend-owned)

Translate between English/Filipino and Cebuano using the curated glossary. Owned and implemented by the frontend team (`frontend/src/app/api/translate`). Shape is defined there; this section is a pointer, not a backend commitment. It must still obey the open-source-model rule in section 0.

---

## 6. Change log

| Version | Date | Change | Approved by |
|---------|------|--------|-------------|
| 0.1 | 2026-10-14 | Initial draft (Supabase/pgvector, generic LLM) | |
| 1.0 | 2026-10-21 | Rewrote `/api/ask` to match `backend/lib/ask.mjs`: curated Cebuano fields, added `requirements_note` and `steps`, recorded the open-source-model rule, marked explain/translate as frontend-owned | Backend (Stephanie) |
