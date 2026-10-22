"use client";

// Feature: ayasib-frontend-redesign
// Sectioned, source-backed answer. Consumes AskResponse unchanged. Shows each field only when the
// KB supports it, with source + freshness and action links. Refusal rendering is handled by the caller.
import Link from "next/link";
import { kb } from "@/lib/kb";
import { t } from "@/lib/strings";
import type { AskResponse } from "@/lib/types";

/** Resolve the answered service id from the KB by matching source url/title (read-only; null if unmatched). */
function resolveServiceId(result: AskResponse): string | null {
  const src = result.sources[0];
  if (!src) return null;
  const byUrl = kb.find((e) => e.source_url && e.source_url === src.url);
  if (byUrl) return byUrl.id;
  // Fall back to a name match only if unambiguous; never invent an id.
  return null;
}

export function AnswerCard({ result }: { result: AskResponse }) {
  const a = result.answer;
  if (!a) return null;
  const serviceId = resolveServiceId(result);

  const facts = (
    [
      [t.card.office, a.office],
      [t.card.fee, a.fee],
      [t.card.time, a.processing_time],
    ] as [string, string | null][]
  ).filter((row): row is [string, string] => !!row[1]);

  return (
    <article className="card">
      <div className="card-head">{result.sources[0]?.title}</div>
      <div className="card-body">
        <section className="answer-section" aria-label={t.answer.summary}>
          <strong>{t.answer.summary}</strong>
          <p style={{ margin: "4px 0 0" }}>{a.summary}</p>
        </section>

        {a.requirements.length > 0 && (
          <section className="answer-section" aria-label={t.card.requirements}>
            <strong>{t.card.requirements}</strong>
            <ul className="list" style={{ marginTop: 8 }}>
              {a.requirements.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            {a.requirements_note && <p className="muted" style={{ marginTop: 8 }}>{a.requirements_note}</p>}
          </section>
        )}
 
        {a.steps.length > 0 && (
          <section aria-label={t.card.steps}>
            <strong>{t.card.steps}</strong>
            <ol className="list" style={{ marginTop: 8 }}>
              {a.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </section>
        )}

        {facts.length > 0 && (
          <section className="answer-section">
            <dl className="facts">
              {facts.map(([label, value]) => (
                <div className="fact" key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {result.sources.map((s) => (
          <div className="source" key={s.url}>
            <div>
              {t.card.source}:{" "}
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.title}
              </a>
            </div>
            <div className="muted">
              {t.card.verified}: {s.last_verified}
            </div>
          </div>
        ))}

        <div className="answer-actions">
          {serviceId && (
            <Link className="btn secondary" href={`/andam/${serviceId}`}>
              {t.answer.openChecklist}
            </Link>
          )}
          <Link className="btn secondary" href="/explain">
            {t.answer.explain}
          </Link>
          <Link className="btn secondary" href="/translate">
            {t.answer.translate}
          </Link>
        </div>
      </div>
    </article>
  );
}
