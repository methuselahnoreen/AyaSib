# Contributing to AyaSib

Thank you for helping. This project is built by a small team and open to outside contributions, especially **verified knowledge-base entries** and **Cebuano reviews**.

Please read this page before opening a pull request.

---

## Ways to contribute

| Type | Examples | Label |
|------|----------|-------|
| Knowledge base | Add or update a service file, re-verify a source | `kb` |
| Glossary | Suggest a Cebuano term for a government word | `glossary` |
| Evaluation | Add a Cebuano question with an expected answer | `eval` |
| Frontend | UI, accessibility, mobile layout | `frontend` |
| Backend | Retrieval, prompts, API routes, tests | `backend` |
| Docs | README, guides, translations | `docs` |
| Bugs | Wrong output, crashes, broken links | `bug` |

New here? Look for issues labelled `good first issue`.

---

## Getting set up

1. Fork the repo (outside contributors) or clone it (team members).
2. Configure your environment by following **Getting started** in the [README](README.md): copy `.env.example` to `.env.local` and fill in `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.
3. The knowledge-base tooling lives in `backend/`. Confirm it runs before you change anything:

```powershell
cd backend
npm install
npm run kb:validate
npm run eval
```

4. The web app lives in `frontend/` and has its own scripts (`npm run dev`, `npm run build`).

> **Never commit `.env.local` or any real key, and never paste a key in chat.** See [Security](#security).

---

## Workflow

1. **Find or open an issue** first, so work is not duplicated.
2. **Branch from `main`** using one of these prefixes:

   | Prefix | Use for |
   |--------|---------|
   | `feat/` | New functionality |
   | `fix/` | Bug fixes |
   | `kb/` | Knowledge-base entries |
   | `docs/` | Documentation only |
   | `chore/` | Tooling, config, dependencies |
   | `test/` | Tests only |

   Example: `feat/ask-answer-card`, `kb/philhealth-registration`

3. **Make small, focused changes.** One concern per pull request.
4. **Run the checks locally** (see [Before you open a PR](#before-you-open-a-pr)).
5. **Open a pull request** against `main` using the template.
6. **Respond to review.** At least one teammate must approve before merging.
7. **Squash and merge** once approved and CI is green.

Direct pushes to `main` are not allowed.

---

## Commit messages

Keep them short and in the present tense. We loosely follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add answer card with source and verified date
fix: show fallback message when confident is false
kb: add barangay clearance for Cebu City
docs: describe KB file format
test: cover refusal when no sources are retrieved
```

---

## Before you open a PR

Run the checks for the part you changed.

Backend / knowledge base (from `backend/`):

```powershell
npm run kb:validate
npm run eval     # if you changed the KB or the Ask logic
```

Frontend (from `frontend/`):

```powershell
npm run lint
npm test
```

Then check:

- [ ] The change does what the linked issue describes
- [ ] Tests added or updated for new behaviour
- [ ] No secrets, keys, or personal data in the diff
- [ ] Docs updated if behaviour, setup, or the API changed
- [ ] If the API changed, `docs/APIContract.md` is updated **and** the other side (frontend or backend) has been told

---

## Contributing to the knowledge base

Accuracy matters more than quantity. A wrong fee or requirement can send someone to the wrong office, so these rules are strict.

1. **One YAML file per service** in `kb/`, using the format and field list in the README (**How to add a service**). The file name must match the `id`.
2. **Every file needs `source_title`, `source_url`, and `last_verified`.** Prefer official government pages. Use the date you actually checked the source.
3. **Do not guess.** If you cannot verify a field, use `null` or omit it. A missing fact is better than a wrong one.
4. **State the locality.** Fees and steps differ by city and barangay. Say which one the file covers.
5. **Write the Cebuano `_ceb` fields.** Keep `requirements_ceb` in the same order and length as `requirements`. Do not machine-translate; have a native speaker write or review them. Leave `name_ceb: null` until a native speaker supplies it.
6. **Validate and build** from `backend/`: run `npm run kb:validate` until it passes, then `npm run kb:build`.
7. **Update `last_verified`** whenever you re-check or edit a file.
8. **Describe your evidence in the PR**: link the source, and say how you confirmed it.

Reviewers will reject entries without a verifiable source.

---

## Contributing Cebuano content (glossary and eval set)

Natural Cebuano matters here, and this is where a native speaker helps most.

- **Glossary** (`glossary/glossary.json`): propose one term at a time. In the PR, give the English or Filipino term, your Cebuano rendering, and a short note on why it is the natural choice (and whether it differs by region, such as Cebu City versus outlying areas).
- **Eval questions** (`eval/questions.json`): write the question the way a real person would ask it, including casual spelling and mixed English where that is realistic. Add the `expected` service id, or `null` if the KB should not answer it.
- If you are not a native speaker, mark the PR `needs-native-review`. We will not merge Cebuano content without review.

---

## Code style

- Frontend: run the linter before committing (`npm run lint` in `frontend/`).
- Prefer clear names and small functions over comments that explain tangled code.
- Keep UI components mobile-first and test at a narrow width.
- Do not hard-code user-facing strings in components if a shared strings file exists; this keeps Cebuano text easy to review.
- Handle all response states in the UI: loading, success, error, and **`confident: false`**.

---

## Testing

- Add or update tests with every behavioural change.
- Backend changes to retrieval or prompts must keep the **refusal behaviour** working: when the sources do not cover a question, the answer must be a "not sure" response, never an invented one.
- If you change the KB, glossary, or prompts, run `npm run eval` and include the result in your PR description.

---

## Security

- **Never commit secrets.** `.env*` files are git-ignored; keep it that way.
- API keys are used on the server only. Never prefix a secret with `NEXT_PUBLIC_`.
- If you accidentally commit a key, **rotate it immediately**, then tell a maintainer. Removing it in a later commit is not enough.
- Report vulnerabilities privately through a GitHub security advisory, not a public issue.
- Do not add real personal data (names, ID numbers) to the KB, eval set, or tests.

---

## Reviewing pull requests

When you review, check in this order:

1. **Correctness:** does it do what the issue asks?
2. **Safety:** any secrets, unsafe input handling, or invented information?
3. **Contract:** does it match `docs/APIContract.md`?
4. **Tests and CI:** present and green?
5. **Readability:** could a new contributor follow it?

Be kind and specific. Suggest a fix rather than only pointing out the problem. Aim to review within 24 hours.

---

## Code of conduct

Be respectful and patient, especially with newer contributors and with people whose first language is not English. Harassment or discrimination is not tolerated. Maintainers may remove comments or contributions that break this rule.

---

## Questions

Open a GitHub Discussion or an issue labelled `question`, or ask in the team chat if you are on the team.
