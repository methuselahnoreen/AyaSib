"use client";

// Feature: ayasib-andam-na
// Client-only report control. Opens a prefilled GitHub issue for maintainer review in a new tab.
// No server call, no database, no secret. When the repo is unconfigured, shows a Cebuano fallback.
import { useState } from "react";
import { t } from "@/lib/strings";
import { buildGithubIssueUrl } from "@/lib/githubReport";

// NEXT_PUBLIC_GITHUB_REPO is a public repo path (not a secret). Default to the project repo.
const REPO = (process.env.NEXT_PUBLIC_GITHUB_REPO ?? "methuselahnoreen/AyaSib").trim() || null;

export function ReportControl({ serviceId }: { serviceId: string }) {
  const [field, setField] = useState("");
  const [explanation, setExplanation] = useState("");
  const [source, setSource] = useState("");

  if (!REPO) {
    return <p className="small muted">{t.report.fallback}</p>;
  }

  function openIssue() {
    const url = buildGithubIssueUrl({ repo: REPO, serviceId, field, explanation, source });
    if (url && typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="card" aria-label={t.report.button}>
      <div className="card-body">
        <strong>{t.report.button}</strong>
        <p className="small muted" style={{ margin: 0 }}>
          {t.report.intro}
        </p>
        <label className="field">
          {t.card.requirements}
          <input className="input" value={field} onChange={(e) => setField(e.target.value)} maxLength={200} />
        </label>
        <label className="field">
          {t.explain.whatItIs}
          <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} maxLength={2000} />
        </label>
        <label className="field">
          {t.card.source}
          <input className="input" value={source} onChange={(e) => setSource(e.target.value)} maxLength={500} />
        </label>
        <button type="button" className="btn secondary" onClick={openIssue}>
          {t.report.button}
        </button>
      </div>
    </section>
  );
}
