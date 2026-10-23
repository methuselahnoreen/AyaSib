"use client";

// Feature: ayasib-frontend-redesign
// Sectioned, source-backed answer. Consumes AskResponse unchanged. Shows each field only when the
// KB supports it, with source + freshness and action links. Refusal rendering is handled by the caller.
import Link from "next/link";
import { kb } from "@/lib/kb";
import { t } from "@/lib/strings";
import type { AskResponse, KbEntry } from "@/lib/types";
import { AnswerProvenance } from "@/components/AnswerProvenance";

/** Resolve the answered KB record by matching source url (read-only; null if unmatched). Never invents. */
function resolveEntry(result: AskResponse): KbEntry | null {
  const src = result.sources[0];
  if (!src) return null;
  return kb.find((e) => e.source_url && e.source_url === src.url) ?? null;
}

export function AnswerCard({ result }: { result: AskResponse }) {
  const a = result.answer;
  if (!a) return null;
  const entry = resolveEntry(result);
  const serviceId = entry?.id ?? null;

  // Text handed to the Explain tool when the user taps "Ipasabot": the answer's own content,
  // so Explain actually has something to explain instead of opening an empty box.
  const explainText = [
    result.sources[0]?.title,
    a.summary,
    a.requirements.length ? `${t.card.requirements}:\n- ${a.requirements.join("\n- ")}` : "",
    a.steps.length ? `${t.card.steps}:\n- ${a.steps.join("\n- ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

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

        <AnswerProvenance entry={entry} source={result.sources[0]} />

        <div className="answer-actions">
          {serviceId && (
            <Link className="btn secondary" href={`/andam/${serviceId}`}>
              {t.answer.openChecklist}
            </Link>
          )}
          <Link className="btn secondary" href={`/explain?text=${encodeURIComponent(explainText)}`}>
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
