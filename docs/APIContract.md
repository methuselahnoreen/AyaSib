# API Contract

**Status:** Draft v0.1 - proposed starting point. Becomes binding once frontend and backend leads both approve it.
**Owners:** `TODO: frontend lead` and `TODO: backend lead`
**Rule:** Changes require a PR that updates this file and is approved by **both** sides. The frontend builds against a mock of this contract until the real endpoints are ready.

Items marked **(proposed)** are suggestions that the team should confirm or change.

---

## 1. Conventions

| Topic | Rule |
|-------|------|
| Base path | `/api` |
| Format | JSON, UTF-8, `Content-Type: application/json` (except image upload, see 4.2) |
| Method | `POST` for all three endpoints |
| Auth | None for users. Provider keys live on the server only and are never in any response |
| Field naming | `snake_case` |
| Dates | ISO 8601, date only for `last_verified` (`2026-10-01`) |
| Language codes | `ceb` Cebuano, `fil` Filipino, `en` English |
| Max text length | 2,000 characters for `question`, 8,000 for `text` **(proposed)** |
| Rate limit | 20 requests/minute per IP **(proposed)**; exceeded returns `429` |

The API **never invents information**. If sources do not cover a question, it returns a successful response with `confident: false`, not an error.

---

## 2. Shared types

### Source

```json
{
  "title": "Barangay Clearance - Cebu City",
  "url": "https://example.gov.ph/...",
  "last_verified": "2026-10-01"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | yes | Human-readable source name |
| `url` | string | yes | Absolute URL |
| `last_verified` | string (date) | yes | Taken from the KB file |

### Error

```json
{
  "error": {
    "code": "invalid_request",
    "message": "question is required"
  }
}
```

| `code` | HTTP | Meaning |
|--------|------|---------|
| `invalid_request` | 400 | Missing or malformed field |
| `payload_too_large` | 413 | Text or image over the limit |
| `unsupported_media_type` | 415 | Image type not allowed |
| `rate_limited` | 429 | Too many requests |
| `upstream_error` | 502 | LLM or database failed |
| `internal_error` | 500 | Anything else |

`message` is for developers and logs. The frontend shows its own friendly Cebuano text based on `code`; it never displays `message` directly to users.

---

## 3. `POST /api/ask` - Feature 1

Answer a question about a government service, using only knowledge-base sources.

### Request

```json
{
  "question": "Unsaon pag-apply ug barangay clearance?"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `question` | string | yes | 1-2,000 chars, any of `ceb`, `fil`, `en` |

### Response 200, confident

```json
{
  "confident": true,
  "answer": {
    "summary": "Mag-adto sa barangay hall ug dad-a ang mga kinahanglanon.",
    "requirements": [
      "Valid ID nga naay address",
      "Proof of residency"
    ],
    "office": "Barangay Hall sa imong lugar",
    "fee": "TODO sample only",
    "processing_time": "TODO sample only"
  },
  "sources": [
    {
      "title": "Barangay Clearance - Cebu City",
      "url": "https://example.gov.ph/...",
      "last_verified": "2026-10-01"
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
| `confident` | `true` only when at least one retrieved source supports the answer |
| `answer` | Object when `confident` is `true`; `null` otherwise |
| `answer.summary` | Short Cebuano text, 1-3 sentences |
| `answer.requirements` | Array of short strings; may be empty |
| `answer.office` | String or `null` if the KB file has none |
| `answer.fee` | String or `null`. Never estimated by the model; copied from the KB |
| `answer.processing_time` | String or `null`. Same rule as `fee` |
| `sources` | **Must be non-empty when `confident` is `true`** |
| `message` | Present only when `confident` is `false`, in Cebuano |

**Frontend obligations:** render the "not sure" state when `confident` is `false`; always show every source and its `last_verified` date; if a field is `null`, hide it rather than showing "null".

---

## 4. `POST /api/explain` - Feature 2

Explain a notice or form in plain Cebuano.

### 4.1 Text request

```json
{
  "text": "NOTICE OF HEARING ... you are hereby required to appear ..."
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `text` | string | yes | 1-8,000 chars |

### 4.2 Image request **(proposed)**

Ship text first; add image support after. Proposed shape: `multipart/form-data` with one field `image`.

| Rule | Value |
|------|-------|
| Types | `image/jpeg`, `image/png` |
| Max size | 5 MB **(proposed)** |
| Handling | Backend extracts the text (OCR), then follows the same flow as 4.1 |

### Response 200

```json
{
  "document_type": "Notice of hearing",
  "explanation": "Kini usa ka pahibalo nga gipatawag ka sa pagpakita sa...",
  "what_is_asked": ["Moadto sa opisina sa ...", "Magdala ug valid ID"],
  "next_steps": ["Susiha ang petsa ug oras", "Pangutana sa opisina kung dili ka kaadto"],
  "extracted_text": "NOTICE OF HEARING ...",
  "disclaimer": "Kini dili legal nga tambag. Palihug pangutana sa opisina o abogado."
}
```

| Field | Type | Notes |
|-------|------|-------|
| `document_type` | string or `null` | Best-effort label; `null` if unclear |
| `explanation` | string | Plain Cebuano |
| `what_is_asked` | string[] | May be empty |
| `next_steps` | string[] | May be empty |
| `extracted_text` | string or `null` | Only for image requests, so users can check the OCR |
| `disclaimer` | string | Always present; frontend always shows it |

When the text is too short, unreadable, or unrelated to a document, return `200` with `explanation` saying so in Cebuano and empty arrays, not an error.

---

## 5. `POST /api/translate` - Feature 3

Translate between English or Filipino and Cebuano, using the glossary.

### Request

```json
{
  "text": "Please submit your affidavit and business permit.",
  "from": "en",
  "to": "ceb"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `text` | string | yes | 1-8,000 chars |
| `from` | string | yes | `en`, `fil`, or `ceb` |
| `to` | string | yes | `en`, `fil`, or `ceb`; must differ from `from` |

### Response 200

```json
{
  "translation": "...",
  "glossary_terms_used": [
    { "source": "affidavit", "target": "..." }
  ]
}
```

| Field | Type | Notes |
|-------|------|-------|
| `translation` | string | The translated text |
| `glossary_terms_used` | array | Terms matched from the glossary; may be empty. Lets the UI highlight them |

---

## 6. Stretch: `POST /api/advisory` **(proposed, not committed)**

Only specified if the team reaches the stretch feature. Request `{ "text": "..." }`, response `{ "summary": "...", "actions": ["..."], "source": Source | null }`.

---

## 7. Mock server (frontend)

Until the real API exists, the frontend uses a mock that returns the examples above.

Required mock cases for `/api/ask`:

| Trigger | Returns |
|---------|---------|
| Any normal question | The confident example |
| Question containing `unknown` | The not-confident example |
| Question containing `error` | `502 upstream_error` |
| Question containing `slow` | The confident example after a 5-second delay |

These cases let the UI team build every state (loading, success, refusal, error) without waiting on the backend.

---

## 8. Change log

| Version | Date | Change | Approved by |
|---------|------|--------|-------------|
| 0.1 | | Initial draft | |
