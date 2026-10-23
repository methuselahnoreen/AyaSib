# Deploying AyaSib to Vercel

AyaSib is a monorepo. The deployable app is the Next.js project in **`frontend/`**.
The API routes run as stateless serverless functions; there is no database.

> **Secrets rule:** `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are secrets.
> They go **only** into Vercel's Environment Variables UI — never into the repo, a
> committed file, or chat. Only `NEXT_PUBLIC_*` values are public.

---

## One-time setup (first deploy)

### 1. Make sure the code is on the branch you want to deploy
Production should track `main`. Merge your PR into `main` first (recommended), or
deploy a branch to get a preview URL.

### 2. Create the Vercel project
1. Go to <https://vercel.com> and **sign in with GitHub**.
2. Click **Add New… → Project**.
3. Under **Import Git Repository**, pick **`methuselahnoreen/AyaSib`**.
   (If you don't see it, click **Adjust GitHub App Permissions** and grant access to the repo.)

### 3. Configure the project (the important part)
On the "Configure Project" screen:

- **Root Directory:** click **Edit** and select the **`frontend`** folder.
  This is required — the repo root is not the app. Everything else can stay default.
- **Framework Preset:** should auto-detect **Next.js**. Leave it.
- **Build Command / Output / Install:** leave as detected (pinned by `frontend/vercel.json`).

### 4. Add Environment Variables
Still on the configure screen (or later under **Settings → Environment Variables**),
add these. Set **Environment = Production** (also add to **Preview** if you want
branch previews to work too).

| Name | Value | Type | Required |
|------|-------|------|----------|
| `CLOUDFLARE_ACCOUNT_ID` | your Cloudflare account ID | Secret | **Yes** — Ask/OCR fail without it |
| `CLOUDFLARE_API_TOKEN` | token with the **Workers AI** permission | Secret | **Yes** |
| `NEXT_PUBLIC_GITHUB_REPO` | `methuselahnoreen/AyaSib` | Plain (public) | Recommended |
| `LLM_MODEL` | e.g. `@cf/openai/gpt-oss-120b` | Secret/plain | Optional (defaults to Qwen3) |
| `OCR_MODEL` | override vision model | Secret/plain | Optional |
| `NEXT_PUBLIC_STALE_THRESHOLD_DAYS` | e.g. `180` | Plain (public) | Optional (defaults to 180) |

Do **NOT** set `NEXT_PUBLIC_MOCK_API` / `NEXT_PUBLIC_MOCK_OCR` in production — those
force mock responses and are for local dev only.

Where to get the Cloudflare values:
- **Account ID:** Cloudflare dashboard → *Workers & AI* (shown in the right sidebar / URL).
- **API token:** dashboard → *My Profile → API Tokens → Create Token*, give it the
  **Workers AI** permission. Copy it once; you can't view it again.

### 5. Deploy
Click **Deploy**. After ~1–2 minutes you get an HTTPS URL like
`https://ayasib.vercel.app`.

---

## Verify the deploy

Open the URL **on a phone** (not just desktop) and check:

- [ ] Home, tabs (Sugdanan / Serbisyo / Basaha / Pangutana / Pangandam) load, no sideways scroll.
- [ ] **Ask** returns a source-backed answer for a known service (e.g. "NBI clearance").
      If every question errors → the Cloudflare env vars are missing or wrong.
- [ ] A nonsense question returns the "Dili ko sigurado…" refusal.
- [ ] Services directory lists the KB services; a service opens its detail + checklist.
- [ ] Checklist states persist after reload (localStorage).

**Camera note:** the live camera (OCR "Basaha") needs **HTTPS**, which Vercel provides.
It will NOT work over a plain LAN IP during local dev — test camera features on the
deployed URL or on `localhost`.

---

## Ongoing deploys

- **Push to `main`** → Vercel auto-builds and promotes to Production.
- **Push to any other branch / open a PR** → Vercel posts a **Preview URL** on the PR.
  Preview deploys only have the env vars you ticked for "Preview".
- Roll back instantly from **Vercel → Deployments → (pick a good one) → Promote**.

---

## Troubleshooting

| Symptom | Cause / fix |
|--------|-------------|
| Build fails: "No Next.js app found" | Root Directory isn't set to `frontend`. Fix in Settings → General. |
| Every Ask/OCR call returns an error | `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` not set for Production, or token lacks Workers AI permission. |
| Report control shows "confirm with the office" instead of opening GitHub | `NEXT_PUBLIC_GITHUB_REPO` not set (optional; it defaults to the project repo in code). |
| KB looks stale | `kb.json` is committed and used as-is on deploy; regenerate locally with `cd backend && npm run kb:build`, commit, and push. |
| Build runs out of memory locally (not on Vercel) | `set NODE_OPTIONS=--max-old-space-size=4096` before `npm run build`. |

---

## What is NOT deployed here

- No database, no auth, no file storage — the serverless filesystem is ephemeral.
- Reporting is the client-only GitHub-issue path; a durable server-side report queue is deferred.
