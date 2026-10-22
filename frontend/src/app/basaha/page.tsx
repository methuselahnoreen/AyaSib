"use client";

import { useState } from "react";
import { Notice } from "@/components/Notice";
import { PhotoReader } from "@/components/PhotoReader";
import { Shell } from "@/components/Shell";
import { errorText, explainText } from "@/lib/client";
import { t } from "@/lib/strings";
import type { ExplainResponse } from "@/lib/types";

const MAX_CHARS = 8000;

export default function PhotoPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExplainResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await explainText(text));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell title={t.photo.title}>
      <main>
        <p className="small muted" style={{ margin: 0 }}>
          {t.photo.intro}
        </p>

        <PhotoReader onText={(extracted: string) => setText(extracted.slice(0, MAX_CHARS))} />

        <label className="field">
          <span className="small">{t.photo.textLabel}</span>
          <textarea
            value={text}
            maxLength={MAX_CHARS}
            placeholder={t.photo.placeholder}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <button className="btn" onClick={run} disabled={loading || !text.trim()}>
          {loading ? t.ask.loading : t.explain.button}
        </button>

        <div aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && <Notice kind="error" text={error} action={{ label: t.errors.retry, onClick: run }} />}
          {result && (
            <article className="card">
              <div className="card-head">{result.document_type ?? t.explain.whatItIs}</div>
              <div className="card-body">
                <section>
                  <strong>{t.explain.whatItIs}</strong>
                  <p style={{ margin: "6px 0 0" }}>{result.explanation}</p>
                </section>
                {result.what_is_asked.length > 0 && (
                  <section>
                    <strong>{t.explain.whatAsked}</strong>
                    <ul style={{ margin: "6px 0 0", paddingLeft: "1.3rem" }}>
                      {result.what_is_asked.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </section>
                )}
                {result.next_steps.length > 0 && (
                  <section>
                    <strong>{t.explain.nextSteps}</strong>
                    <ol className="steps" style={{ marginTop: 6 }}>
                      {result.next_steps.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ol>
                  </section>
                )}
                <p className="small muted" style={{ margin: 0 }}>
                  {result.disclaimer}
                </p>
              </div>
            </article>
          )}
        </div>
      </main>
    </Shell>
  );
}
