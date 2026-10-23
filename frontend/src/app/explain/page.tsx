"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Notice } from "@/components/Notice";
import { Shell } from "@/components/Shell";
import { errorText, explainText } from "@/lib/client";
import { t } from "@/lib/strings";
import type { ExplainResponse } from "@/lib/types";

const MAX_CHARS = 8000;

export default function ExplainPage() {
  return (
    <Suspense fallback={null}>
      <ExplainPageInner />
    </Suspense>
  );
}

function ExplainPageInner() {
  const searchParams = useSearchParams();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExplainResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prefilled = useRef(false);

  async function run(input?: string) {
    const value = (input ?? text).trim();
    if (!value || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await explainText(value));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }

  // Accept text handed over from the Ask answer card (/explain?text=...) and explain it once.
  useEffect(() => {
    if (prefilled.current) return;
    const incoming = searchParams.get("text");
    if (incoming && incoming.trim()) {
      prefilled.current = true;
      const value = incoming.slice(0, MAX_CHARS);
      setText(value);
      run(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <Shell title={t.explain.title}>
      <main>
        <label className="field">
          <span className="small">{t.explain.title}</span>
          <textarea
            value={text}
            maxLength={MAX_CHARS}
            placeholder={t.explain.placeholder}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <button className="btn" onClick={() => run()} disabled={loading || !text.trim()}>
          {loading ? t.ask.loading : t.explain.button}
        </button>

        <div aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && <Notice kind="error" text={error} action={{ label: t.errors.retry, onClick: () => run() }} />}
          {result && !result.document_type && result.what_is_asked.length === 0 && result.next_steps.length === 0 ? (
            // Not a government document: guide the user kindly instead of a blunt "no info" card.
            <Notice text={t.explain.noDocument} />
          ) : (
            result && (
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
            )
          )}
        </div>
      </main>
    </Shell>
  );
}