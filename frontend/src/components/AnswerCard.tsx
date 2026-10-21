"use client";
 
import { useState } from "react";
import { t } from "@/lib/strings";
import type { AskResponse } from "@/lib/types";
 
export function AnswerCard({ result }: { result: AskResponse }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const a = result.answer;
  if (!a) return null;
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
        <p style={{ margin: 0 }}>{a.summary}</p>
 
        {facts.length > 0 && (
          <dl className="facts">
            {facts.map(([label, value]) => (
              <div className="fact" key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
 
        {a.requirements.length > 0 && (
          <section aria-label={t.card.requirements}>
            <strong>{t.card.requirements}</strong>
            <ul className="list" style={{ marginTop: 8 }}>
              {a.requirements.map((r, i) => (
                <li key={i}>
                  <label>
                    <input type="checkbox" checked={!!checked[i]} onChange={(e) => setChecked({ ...checked, [i]: e.target.checked })} />
                    <span>{r}</span>
                  </label>
                </li>
              ))}
            </ul>
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
      </div>
    </article>
  );
}
